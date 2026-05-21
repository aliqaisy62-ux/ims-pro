import { Router } from 'express'
import { verifyToken } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import * as ctrl from '../controllers/cashStatement.controller'

const router = Router()
router.use(verifyToken)

router.get('/today', ctrl.getToday)
router.get('/range', ctrl.getRange)
router.get('/', ctrl.getByDate)
router.post('/close', requireRole('MANAGER', 'ADMIN'), ctrl.closeToday)

export default router
