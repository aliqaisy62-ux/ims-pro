import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { PrismaClient } from '@ims-pro/db'
import {
  validateCredentials,
  generateAccessToken,
  rotateRefreshSession,
  revokeRefreshSession,
  revokeAllUserSessions,
  changeUserPassword,
  incrementTokenVersion,
} from '../services/auth.service'
import { logAudit } from '../services/audit.service'

const prisma = new PrismaClient()

const COOKIE_NAME = '__refresh_token'
const ROLE_COOKIE = '__user_role'

const isHttps = process.env.HTTPS_ENABLED === 'true'

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: isHttps ? ('none' as const) : ('lax' as const),
  secure:   isHttps,
  maxAge:   7 * 24 * 60 * 60 * 1000,
  path:     '/',
}

// Non-HttpOnly so Next.js middleware can read it for role-based frontend routing.
const ROLE_COOKIE_OPTIONS = {
  httpOnly: false,
  sameSite: isHttps ? ('none' as const) : ('lax' as const),
  secure:   isHttps,
  maxAge:   7 * 24 * 60 * 60 * 1000,
  path:     '/',
}

function clearAuthCookies(res: Response) {
  res.clearCookie(COOKIE_NAME, { path: '/' })
  res.clearCookie(ROLE_COOKIE, { path: '/' })
}

// ── Login ────────────────────────────────────────────────────────────────────

export async function login(req: Request, res: Response) {
  const { username, password } = req.body
  const result = await validateCredentials(
    username,
    password,
    req.ip,
    req.headers['user-agent'],
  )

  if (!result) {
    logAudit('system', 'LOGIN_FAILED', 'User', username,
      `Failed login attempt for username=${username}`, req.ip)
    return res.status(401).json({ success: false, error: 'Invalid username or password' })
  }
  if ('locked' in result) {
    return res.status(429).json({
      success:     false,
      error:       'Account temporarily locked due to too many failed attempts',
      lockedUntil: result.lockedUntil,
    })
  }

  const { user, rawRefreshToken } = result
  const accessToken = generateAccessToken(user)
  res.cookie(COOKIE_NAME, rawRefreshToken, COOKIE_OPTIONS)
  res.cookie(ROLE_COOKIE, user.role, ROLE_COOKIE_OPTIONS)
  logAudit(user.id, 'LOGIN_SUCCESS', 'User', user.id, undefined, req.ip)
  return res.json({ success: true, data: { accessToken, user } })
}

// ── Refresh ──────────────────────────────────────────────────────────────────

export async function refresh(req: Request, res: Response) {
  const rawToken = req.cookies?.[COOKIE_NAME]
  if (!rawToken) {
    return res.status(401).json({ success: false, error: 'No refresh token' })
  }

  const result = await rotateRefreshSession(rawToken, req.ip, req.headers['user-agent'])

  if (!result) {
    clearAuthCookies(res)
    return res.status(401).json({ success: false, error: 'Invalid or expired refresh token' })
  }

  const { user, rawRefreshToken: newRawToken } = result
  res.cookie(COOKIE_NAME, newRawToken, COOKIE_OPTIONS)
  res.cookie(ROLE_COOKIE, user.role, ROLE_COOKIE_OPTIONS)
  return res.json({ success: true, data: { accessToken: generateAccessToken(user), user } })
}

// ── Logout (current device) ──────────────────────────────────────────────────

export async function logout(req: Request, res: Response) {
  const rawToken = req.cookies?.[COOKIE_NAME]
  if (rawToken) await revokeRefreshSession(rawToken)
  if (req.user?.id) logAudit(req.user.id, 'LOGOUT', 'User', req.user.id, undefined, req.ip)
  clearAuthCookies(res)
  return res.json({ success: true })
}

// ── Logout all devices ───────────────────────────────────────────────────────

export async function logoutAll(req: Request, res: Response) {
  if (!req.user?.id) return res.status(401).json({ success: false, error: 'Unauthorized' })
  await revokeAllUserSessions(req.user.id, 'LOGOUT_ALL')
  logAudit(req.user.id, 'LOGOUT_ALL', 'User', req.user.id, 'All sessions revoked by user', req.ip)
  clearAuthCookies(res)
  return res.json({ success: true, message: 'All sessions revoked. Please log in again.' })
}

// ── Me ───────────────────────────────────────────────────────────────────────

export async function me(req: Request, res: Response) {
  return res.json({ success: true, data: { user: req.user } })
}

// ── Change password ──────────────────────────────────────────────────────────

const changePasswordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&\-#_])/,
      'Password must contain uppercase, lowercase, number, and special character (@$!%*?&-#_)',
    ),
})

export async function changePassword(req: Request, res: Response) {
  if (!req.user?.id) return res.status(401).json({ success: false, error: 'Unauthorized' })

  const parsed = changePasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error.errors[0]?.message })
  }

  const { currentPassword, newPassword } = parsed.data

  // Non-restricted users (voluntary change) must verify their current password
  if (!req.user.restricted) {
    if (!currentPassword) {
      return res.status(400).json({ success: false, error: 'Current password is required' })
    }
    const dbUser = await prisma.user.findFirst({
      where:  { id: req.user.id },
      select: { passwordHash: true },
    })
    if (!dbUser) return res.status(401).json({ success: false, error: 'User not found' })

    const valid = await bcrypt.compare(currentPassword, dbUser.passwordHash)
    if (!valid) {
      logAudit(req.user.id, 'PASSWORD_CHANGE_FAILED', 'User', req.user.id,
        'Incorrect current password supplied', req.ip)
      return res.status(401).json({ success: false, error: 'Current password is incorrect' })
    }
  }

  const reason = req.user.restricted ? 'FORCED_RESET' : 'USER_CHANGE'
  await changeUserPassword(req.user.id, newPassword, reason)
  logAudit(req.user.id, 'PASSWORD_CHANGED', 'User', req.user.id, reason, req.ip)

  clearAuthCookies(res)
  return res.json({ success: true, message: 'Password changed successfully. Please log in again.' })
}

// ── Admin: revoke all sessions for another user ──────────────────────────────

export async function adminRevokeUserSessions(req: Request, res: Response) {
  if (!req.user?.id) return res.status(401).json({ success: false, error: 'Unauthorized' })

  const { userId } = req.params
  await revokeAllUserSessions(userId, 'ADMIN_REVOKE')
  await incrementTokenVersion(userId)

  logAudit(
    req.user.id,
    'ADMIN_SESSION_REVOKE',
    'User',
    userId,
    `Admin ${req.user.username} force-revoked all sessions for userId=${userId}`,
    req.ip,
  )
  return res.json({ success: true, message: 'All sessions revoked for user' })
}
