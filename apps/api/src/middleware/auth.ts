import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@ims-pro/db'
import { AuthUser } from '@ims-pro/types'

const prisma = new PrismaClient()

interface JwtPayload {
  sub:          string
  role:         string
  username:     string
  name:         string
  language:     string
  tokenVersion: number
  restricted:   boolean
}

// Verifies the Bearer token AND checks tokenVersion against the DB.
// This ensures password changes and account disablement take effect immediately,
// not only when the 15-minute access token expires.
export async function verifyToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'No token provided' })
  }

  const token = authHeader.slice(7)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload

    const dbUser = await prisma.user.findFirst({
      where:  { id: payload.sub, isActive: true },
      select: { tokenVersion: true, mustChangePassword: true },
    })

    if (!dbUser) {
      return res.status(401).json({ success: false, error: 'Account not found or disabled' })
    }
    if (dbUser.tokenVersion !== payload.tokenVersion) {
      return res.status(401).json({
        success: false,
        error:   'Session invalidated — please log in again',
      })
    }

    req.user = {
      id:           payload.sub,
      role:         payload.role as AuthUser['role'],
      username:     payload.username,
      name:         payload.name,
      language:     payload.language as AuthUser['language'],
      tokenVersion: payload.tokenVersion,
      restricted:   dbUser.mustChangePassword,
    }
    next()
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' })
  }
}

// Blocks restricted sessions (mustChangePassword) from all endpoints except
// POST /api/auth/change-password and GET /api/auth/me.
export function requireFullAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }
  if (req.user.restricted) {
    return res.status(403).json({
      success: false,
      error:   'Password change required before accessing this resource',
      code:    'PASSWORD_CHANGE_REQUIRED',
    })
  }
  next()
}
