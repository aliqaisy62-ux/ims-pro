import { Router } from 'express'
import { verifyToken } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import * as ctrl from '../controllers/reports.controller'

const router = Router()
router.use(verifyToken)

const reportRoles = ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'VIEWER'] as const

router.get('/sales',                      requireRole(...reportRoles), ctrl.salesReport)
router.get('/purchases',                  requireRole(...reportRoles), ctrl.purchasesReport)
router.get('/profit',                     requireRole('ADMIN', 'MANAGER', 'ACCOUNTANT'), ctrl.profitReport)
router.get('/inventory',                  requireRole(...reportRoles), ctrl.inventoryReport)
router.get('/customer-statement/:id',     requireRole(...reportRoles), ctrl.customerStatement)
router.get('/supplier-statement/:id',     requireRole(...reportRoles), ctrl.supplierStatement)

export default router
