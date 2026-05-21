import { Router } from 'express'
import { verifyToken } from '../middleware/auth'
import * as ctrl from '../controllers/reports.controller'

const router = Router()
router.use(verifyToken)

router.get('/sales', ctrl.salesReport)
router.get('/purchases', ctrl.purchasesReport)
router.get('/profit', ctrl.profitReport)
router.get('/inventory', ctrl.inventoryReport)
router.get('/customer-statement/:id', ctrl.customerStatement)
router.get('/supplier-statement/:id', ctrl.supplierStatement)

export default router
