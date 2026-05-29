import { Router } from 'express'
import { verifyToken, requireFullAccess } from '../middleware/auth'
import { requirePermission, Permission } from '../middleware/requirePermission'
import * as ctrl from '../controllers/stock.controller'

const router = Router()
router.use(verifyToken)
router.use(requireFullAccess)

router.get('/transfers', requirePermission(Permission.STOCK_VIEW),     ctrl.listTransfers)
router.get('/inventory', requirePermission(Permission.STOCK_VIEW),     ctrl.getInventoryHandler)
router.get('/low-stock', requirePermission(Permission.STOCK_VIEW),     ctrl.getLowStockHandler)
router.get('/expiring',  requirePermission(Permission.STOCK_VIEW),     ctrl.getExpiringHandler)
router.post('/transfer', requirePermission(Permission.STOCK_TRANSFER), ctrl.createTransfer)

export default router
