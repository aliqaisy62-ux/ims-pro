import { Router } from 'express'
import { verifyToken, requireFullAccess } from '../middleware/auth'
import { requirePermission, Permission } from '../middleware/requirePermission'
import * as ctrl from '../controllers/cashStatement.controller'

const router = Router()
router.use(verifyToken)
router.use(requireFullAccess)

router.get('/today', requirePermission(Permission.CASH_STATEMENT_VIEW),  ctrl.getToday)
router.get('/range', requirePermission(Permission.CASH_STATEMENT_VIEW),  ctrl.getRange)
router.get('/',      requirePermission(Permission.CASH_STATEMENT_VIEW),  ctrl.getByDate)
router.post('/close', requirePermission(Permission.CASH_STATEMENT_CLOSE), ctrl.closeToday)

export default router
