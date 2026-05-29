import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { z } from 'zod'
import {
  login,
  refresh,
  logout,
  logoutAll,
  me,
  changePassword,
  adminRevokeUserSessions,
} from '../controllers/auth.controller'
import { verifyToken } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { validateRequest } from '../middleware/validateRequest'

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

const loginLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             5,
  keyGenerator:    (req) => (req.ip ?? 'unknown') + ':login',
  message:         { success: false, error: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders:   false,
})

const router = Router()

// ── Public (no auth required) ─────────────────────────────────────────────────
router.post('/login',   loginLimiter, validateRequest(loginSchema), login)
router.post('/refresh', refresh)
router.post('/logout',  logout)

// ── Authenticated — work with restricted tokens (mustChangePassword) too ──────
router.get( '/me',              verifyToken, me)
router.post('/change-password', verifyToken, changePassword)
router.post('/logout-all',      verifyToken, logoutAll)

// ── Admin only — force session invalidation for another user ──────────────────
router.post(
  '/users/:userId/revoke-sessions',
  verifyToken,
  requireRole('ADMIN'),
  adminRevokeUserSessions,
)

export default router
