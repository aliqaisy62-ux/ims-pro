import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import { AuthUser } from '@ims-pro/types'

const prisma = new PrismaClient()

export async function validateCredentials(username: string, password: string): Promise<AuthUser | null> {
  const user = await prisma.user.findFirst({
    where: { username, isActive: true },
  })
  if (!user) return null
  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) return null
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role as AuthUser['role'],
    language: user.language as AuthUser['language'],
  }
}

export function generateAccessToken(user: AuthUser): string {
  return jwt.sign(
    { sub: user.id, role: user.role, username: user.username, name: user.name, language: user.language },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' }
  )
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId }, process.env.JWT_REFRESH_SECRET!, { expiresIn: '7d' })
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
