import { Router } from 'express'
import { verifyToken } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import * as ctrl from '../controllers/stock.controller'

const router = Router()

router.use(verifyToken)

router.get('/transfers', ctrl.listTransfers)
router.post('/transfer', requireRole('MANAGER', 'ADMIN'), ctrl.createTransfer)
router.get('/inventory', ctrl.getInventoryHandler)
router.get('/low-stock', ctrl.getLowStockHandler)
router.get('/expiring', ctrl.getExpiringHandler)

export default router
