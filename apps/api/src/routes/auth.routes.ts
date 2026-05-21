import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { login, refresh, logout, me } from '../controllers/auth.controller'
import { verifyToken } from '../middleware/auth'
import { validateRequest } from '../middleware/validateRequest'
import { z } from 'zod'

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.ip + ':login',
  message: { success: false, error: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
})

const router = Router()

router.post('/login', loginLimiter, validateRequest(loginSchema), login)
router.post('/refresh', refresh)
router.post('/logout', logout)
router.get('/me', verifyToken, me)

export default router
