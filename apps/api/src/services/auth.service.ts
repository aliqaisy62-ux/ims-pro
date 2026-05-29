import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@ims-pro/db'
import { AuthUser } from '@ims-pro/types'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

const MAX_FAILED_ATTEMPTS  = parseInt(process.env.LOCKOUT_MAX_ATTEMPTS     || '5',  10)
const LOCKOUT_MINUTES      = parseInt(process.env.LOCKOUT_DURATION_MINUTES || '15', 10)
const REFRESH_TTL_DAYS     = 7
const ACCESS_TOKEN_EXPIRES = '15m'

// ── Helpers ──────────────────────────────────────────────────────────────────

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function toAuthUser(user: {
  id: string; username: string; name: string; role: string
  language: string; tokenVersion: number; mustChangePassword: boolean
}): AuthUser {
  return {
    id:           user.id,
    username:     user.username,
    name:         user.name,
    role:         user.role as AuthUser['role'],
    language:     user.language as AuthUser['language'],
    tokenVersion: user.tokenVersion,
    restricted:   user.mustChangePassword,
  }
}

// ── Login ────────────────────────────────────────────────────────────────────

export async function validateCredentials(
  username:   string,
  password:   string,
  ipAddress?: string,
  userAgent?: string,
): Promise<
  | { user: AuthUser; rawRefreshToken: string }
  | { locked: true; lockedUntil: Date }
  | null
> {
  const user = await prisma.user.findFirst({ where: { username, isActive: true } })
  if (!user) return null

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { locked: true, lockedUntil: user.lockedUntil }
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    const newCount    = user.failedLoginCount + 1
    const shouldLock  = newCount >= MAX_FAILED_ATTEMPTS
    const lockedUntil = shouldLock
      ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
      : undefined

    await prisma.user.update({
      where: { id: user.id },
      data:  { failedLoginCount: newCount, lockedUntil },
    })

    if (shouldLock) {
      logger.warn(`[security] Account locked: user=${username} after ${newCount} failed attempts ip=${ipAddress}`)
      void writeSecurityAudit(user.id, 'ACCOUNT_LOCKED', ipAddress,
        `Locked after ${newCount} consecutive failed login attempts`)
    }
    return null
  }

  await prisma.user.update({
    where: { id: user.id },
    data:  { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
  })

  const rawRefreshToken = await createRefreshSession(user.id, ipAddress, userAgent)
  return { user: toAuthUser(user), rawRefreshToken }
}

// ── Session management ───────────────────────────────────────────────────────

export async function createRefreshSession(
  userId:     string,
  ipAddress?: string,
  userAgent?: string,
  familyId?:  string,
): Promise<string> {
  const sessionId = crypto.randomUUID()
  const raw       = crypto.randomBytes(64).toString('hex')
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000)

  await prisma.refreshSession.create({
    data: {
      id:        sessionId,
      userId,
      tokenHash: hashToken(raw),
      familyId:  familyId ?? sessionId,   // root of new family when no parent
      expiresAt,
      ipAddress,
      userAgent,
    },
  })
  return raw
}

export async function rotateRefreshSession(
  rawToken:   string,
  ipAddress?: string,
  userAgent?: string,
): Promise<{ user: AuthUser; rawRefreshToken: string } | null> {
  const hash    = hashToken(rawToken)
  const session = await prisma.refreshSession.findUnique({ where: { tokenHash: hash } })

  if (!session) return null

  // ── Reuse detection ────────────────────────────────────────────────────────
  // A revoked session being presented again means the token was stolen or
  // the client is replaying a replaced token.  Revoke the entire family.
  if (session.revokedAt) {
    logger.warn(
      `[security] Refresh token REUSE detected — userId=${session.userId} familyId=${session.familyId} ip=${ipAddress}`
    )
    void writeSecurityAudit(
      session.userId,
      'REFRESH_REUSE_DETECTED',
      ipAddress,
      `Family=${session.familyId} fully revoked after replay of session=${session.id}`,
    )
    await revokeSessionFamily(session.familyId, 'REUSE_DETECTED')
    return null
  }

  if (session.expiresAt < new Date()) return null

  // ── Rotation ───────────────────────────────────────────────────────────────
  const newSessionId = crypto.randomUUID()
  const newRaw       = crypto.randomBytes(64).toString('hex')
  const newHash      = hashToken(newRaw)
  const expiresAt    = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000)

  await prisma.$transaction([
    prisma.refreshSession.update({
      where: { id: session.id },
      data:  { revokedAt: new Date(), revokedReason: 'ROTATED', replacedByToken: newHash },
    }),
    prisma.refreshSession.create({
      data: {
        id:        newSessionId,
        userId:    session.userId,
        tokenHash: newHash,
        familyId:  session.familyId,   // same family preserves the chain
        expiresAt,
        ipAddress,
        userAgent,
      },
    }),
  ])

  const dbUser = await prisma.user.findFirst({
    where: { id: session.userId, isActive: true },
  })
  if (!dbUser) return null
  return { user: toAuthUser(dbUser), rawRefreshToken: newRaw }
}

export async function revokeRefreshSession(rawToken: string): Promise<void> {
  const hash = hashToken(rawToken)
  await prisma.refreshSession.updateMany({
    where: { tokenHash: hash, revokedAt: null },
    data:  { revokedAt: new Date(), revokedReason: 'LOGOUT' },
  })
}

export async function revokeAllUserSessions(userId: string, reason = 'LOGOUT_ALL'): Promise<void> {
  await prisma.refreshSession.updateMany({
    where: { userId, revokedAt: null },
    data:  { revokedAt: new Date(), revokedReason: reason },
  })
}

export async function revokeSessionFamily(familyId: string, reason: string): Promise<void> {
  await prisma.refreshSession.updateMany({
    where: { familyId, revokedAt: null },
    data:  { revokedAt: new Date(), revokedReason: reason },
  })
}

// ── Token generation ─────────────────────────────────────────────────────────

export function generateAccessToken(user: AuthUser): string {
  return jwt.sign(
    {
      sub:          user.id,
      role:         user.role,
      username:     user.username,
      name:         user.name,
      language:     user.language,
      tokenVersion: user.tokenVersion,
      restricted:   user.restricted ?? false,
      jti:          crypto.randomUUID(),
    },
    process.env.JWT_SECRET!,
    { expiresIn: ACCESS_TOKEN_EXPIRES },
  )
}

// ── User lookup ──────────────────────────────────────────────────────────────

export async function getUserById(id: string): Promise<AuthUser | null> {
  const user = await prisma.user.findFirst({ where: { id, isActive: true } })
  if (!user) return null
  return toAuthUser(user)
}

// ── Password & token version ─────────────────────────────────────────────────

export async function changeUserPassword(
  userId:      string,
  newPassword: string,
  reason = 'USER_CHANGE',
): Promise<void> {
  const hash = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({
    where: { id: userId },
    data:  {
      passwordHash:       hash,
      passwordChangedAt:  new Date(),
      mustChangePassword: false,
      tokenVersion:       { increment: 1 },
      failedLoginCount:   0,
      lockedUntil:        null,
    },
  })
  await revokeAllUserSessions(userId, reason)
}

export async function incrementTokenVersion(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data:  { tokenVersion: { increment: 1 } },
  })
}

// ── Internal security audit ──────────────────────────────────────────────────
// Writes directly to DB to avoid circular import with audit.service.ts

async function writeSecurityAudit(
  userId:    string,
  action:    string,
  ipAddress: string | undefined,
  details:   string,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: { userId, action, entity: 'Security', ipAddress, details },
    })
  } catch (e) {
    logger.error(`[audit] Failed to write security event ${action}: ${(e as Error).message}`)
  }
}
