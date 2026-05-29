import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@ims-pro/db'
import { AuthUser } from '@ims-pro/types'

const prisma = new PrismaClient()

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_MINUTES = 15
const REFRESH_TOKEN_TTL_DAYS = 7

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export async function validateCredentials(
  username: string,
  password: string
): Promise<{ user: AuthUser; rawRefreshToken: string } | { locked: true; lockedUntil: Date } | null> {
  const user = await prisma.user.findFirst({ where: { username, isActive: true } })
  if (!user) return null

  // Check lockout
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { locked: true, lockedUntil: user.lockedUntil }
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    const newCount = user.failedLoginCount + 1
    const shouldLock = newCount >= MAX_FAILED_ATTEMPTS
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: newCount,
        lockedUntil: shouldLock
          ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
          : undefined,
      },
    })
    return null
  }

  // Reset on success
  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
  })

  const authUser: AuthUser = {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role as AuthUser['role'],
    language: user.language as AuthUser['language'],
  }

  const rawRefreshToken = await createRefreshSession(user.id)
  return { user: authUser, rawRefreshToken }
}

export async function createRefreshSession(userId: string, userAgent?: string, ipAddress?: string): Promise<string> {
  const raw = crypto.randomBytes(64).toString('hex')
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)
  await prisma.refreshSession.create({
    data: { userId, tokenHash: hashToken(raw), expiresAt, userAgent, ipAddress },
  })
  return raw
}

export async function rotateRefreshSession(
  rawToken: string,
  userAgent?: string,
  ipAddress?: string
): Promise<{ user: AuthUser; rawRefreshToken: string } | null> {
  const hash = hashToken(rawToken)
  const session = await prisma.refreshSession.findUnique({ where: { tokenHash: hash } })

  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    // Possible token reuse — revoke entire user's sessions as safety measure
    if (session) {
      await prisma.refreshSession.updateMany({
        where: { userId: session.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      })
    }
    return null
  }

  // Issue new session and revoke old one
  const newRaw = crypto.randomBytes(64).toString('hex')
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)

  await prisma.$transaction([
    prisma.refreshSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date(), replacedByToken: hashToken(newRaw) },
    }),
    prisma.refreshSession.create({
      data: { userId: session.userId, tokenHash: hashToken(newRaw), expiresAt, userAgent, ipAddress },
    }),
  ])

  const user = await getUserById(session.userId)
  if (!user) return null
  return { user, rawRefreshToken: newRaw }
}

export async function revokeRefreshSession(rawToken: string): Promise<void> {
  const hash = hashToken(rawToken)
  await prisma.refreshSession.updateMany({
    where: { tokenHash: hash, revokedAt: null },
    data: { revokedAt: new Date() },
  })
}

export function generateAccessToken(user: AuthUser): string {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      username: user.username,
      name: user.name,
      language: user.language,
      jti: crypto.randomUUID(),
    },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' }
  )
}

export function verifyRefreshToken(token: string): { sub: string } | null {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as { sub: string }
  } catch {
    return null
  }
}

export async function getUserById(id: string): Promise<AuthUser | null> {
  const user = await prisma.user.findFirst({ where: { id, isActive: true } })
  if (!user) return null
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role as AuthUser['role'],
    language: user.language as AuthUser['language'],
  }
}
