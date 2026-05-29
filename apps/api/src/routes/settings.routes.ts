import { Router } from 'express'
import { verifyToken, requireFullAccess } from '../middleware/auth'
import { requirePermission, Permission } from '../middleware/requirePermission'
import { requireRole } from '../middleware/requireRole'
import * as ctrl from '../controllers/settings.controller'

const router = Router()
router.use(verifyToken)
router.use(requireFullAccess)

// ─── Settings ─────────────────────────────────────────────────────────────────
router.get('/',                    requirePermission(Permission.SETTINGS_VIEW), ctrl.getSettings)
router.put('/',                    requirePermission(Permission.SETTINGS_EDIT), ctrl.updateSettingsHandler)
router.post('/exchange-rate',      requirePermission(Permission.SETTINGS_EDIT), ctrl.updateExchangeRateHandler)
router.get('/exchange-rate/history', requirePermission(Permission.SETTINGS_VIEW), ctrl.getExchangeRateHistoryHandler)

// ─── User management (ADMIN only) ────────────────────────────────────────────
router.get('/users',               requirePermission(Permission.USERS_VIEW),   ctrl.listUsers)
router.post('/users',              requirePermission(Permission.USERS_MANAGE),  ctrl.createUserHandler)
router.put('/users/:id',           requirePermission(Permission.USERS_MANAGE),  ctrl.updateUserHandler)
router.post('/users/:id/reset-password', requireRole('ADMIN'), ctrl.resetPasswordHandler)

export default router
