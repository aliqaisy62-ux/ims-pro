import { Router } from 'express'
import { verifyToken } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import * as ctrl from '../controllers/settings.controller'

const router = Router()
router.use(verifyToken)

// ─── Settings ─────────────────────────────────────────────────────────────────
router.get('/', ctrl.getSettings)                                              // all authenticated roles
router.put('/', requireRole('ADMIN'), ctrl.updateSettingsHandler)
router.post('/exchange-rate', requireRole('ADMIN', 'MANAGER'), ctrl.updateExchangeRateHandler)
router.get('/exchange-rate/history', ctrl.getExchangeRateHistoryHandler)       // all authenticated roles

// ─── User management (ADMIN only) ────────────────────────────────────────────
router.get('/users', requireRole('ADMIN'), ctrl.listUsers)
router.post('/users', requireRole('ADMIN'), ctrl.createUserHandler)
router.put('/users/:id', requireRole('ADMIN'), ctrl.updateUserHandler)
router.post('/users/:id/reset-password', requireRole('ADMIN'), ctrl.resetPasswordHandler)

export default router
