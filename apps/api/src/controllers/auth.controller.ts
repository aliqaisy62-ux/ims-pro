import { Request, Response } from 'express'
import {
  validateCredentials,
  generateAccessToken,
  rotateRefreshSession,
  revokeRefreshSession,
  getUserById,
} from '../services/auth.service'
import { logAudit } from '../services/audit.service'

const COOKIE_NAME = '__refresh_token'
const ROLE_COOKIE = '__user_role'

const isHttps = process.env.HTTPS_ENABLED === 'true'

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: isHttps ? ('none' as const) : ('lax' as const),
  secure: isHttps,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
}

// Non-HttpOnly so Next.js middleware can read it for role-based routing.
const ROLE_COOKIE_OPTIONS = {
  httpOnly: false,
  sameSite: isHttps ? ('none' as const) : ('lax' as const),
  secure: isHttps,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
}

export async function login(req: Request, res: Response) {
  const { username, password } = req.body
  const result = await validateCredentials(username, password)

  if (!result) {
    return res.status(401).json({ success: false, error: 'Invalid username or password' })
  }
  if ('locked' in result) {
    return res.status(429).json({
      success: false,
      error: 'Account temporarily locked due to too many failed attempts',
      lockedUntil: result.lockedUntil,
    })
  }

  const { user, rawRefreshToken } = result
  const accessToken = generateAccessToken(user)
  res.cookie(COOKIE_NAME, rawRefreshToken, COOKIE_OPTIONS)
  res.cookie(ROLE_COOKIE, user.role, ROLE_COOKIE_OPTIONS)
  logAudit(user.id, 'LOGIN', 'User', user.id, undefined, req.ip)
  return res.json({ success: true, data: { accessToken, user } })
}

export async function refresh(req: Request, res: Response) {
  const rawToken = req.cookies?.[COOKIE_NAME]
  if (!rawToken) {
    return res.status(401).json({ success: false, error: 'No refresh token' })
  }

  const result = await rotateRefreshSession(
    rawToken,
    req.headers['user-agent'],
    req.ip
  )

  if (!result) {
    res.clearCookie(COOKIE_NAME, { path: '/' })
    res.clearCookie(ROLE_COOKIE, { path: '/' })
    return res.status(401).json({ success: false, error: 'Invalid or expired refresh token' })
  }

  const { user, rawRefreshToken: newRawToken } = result
  res.cookie(COOKIE_NAME, newRawToken, COOKIE_OPTIONS)
  res.cookie(ROLE_COOKIE, user.role, ROLE_COOKIE_OPTIONS)
  return res.json({ success: true, data: { accessToken: generateAccessToken(user), user } })
}

export async function logout(req: Request, res: Response) {
  if (req.user?.id) logAudit(req.user.id, 'LOGOUT', 'User', req.user.id, undefined, req.ip)
  const rawToken = req.cookies?.[COOKIE_NAME]
  if (rawToken) await revokeRefreshSession(rawToken)
  res.clearCookie(COOKIE_NAME, { path: '/' })
  res.clearCookie(ROLE_COOKIE, { path: '/' })
  return res.json({ success: true })
}

export async function me(req: Request, res: Response) {
  return res.json({ success: true, data: { user: req.user } })
}
