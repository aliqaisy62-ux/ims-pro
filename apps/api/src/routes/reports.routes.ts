import { Router } from 'express'
import { verifyToken, requireFullAccess } from '../middleware/auth'
import { requirePermission, Permission } from '../middleware/requirePermission'
import * as ctrl from '../controllers/reports.controller'

const router = Router()
router.use(verifyToken)
router.use(requireFullAccess)

// Dashboard summary — all roles with SALES_VIEW or INVENTORY_VIEW
router.get('/today-summary',          requirePermission(Permission.SALES_VIEW, Permission.INVENTORY_VIEW), ctrl.todaySummaryHandler)

// Standard reports — REPORTS_VIEW (ADMIN, MANAGER, ACCOUNTANT, VIEWER)
router.get('/sales',                  requirePermission(Permission.REPORTS_VIEW), ctrl.salesReport)
router.get('/purchases',              requirePermission(Permission.REPORTS_VIEW), ctrl.purchasesReport)
router.get('/inventory',              requirePermission(Permission.REPORTS_VIEW), ctrl.inventoryReport)
router.get('/customer-statement/:id', requirePermission(Permission.REPORTS_VIEW), ctrl.customerStatement)
router.get('/supplier-statement/:id', requirePermission(Permission.REPORTS_VIEW), ctrl.supplierStatement)
router.get('/top-sellers',            requirePermission(Permission.REPORTS_VIEW), ctrl.topSellersHandler)
router.get('/peak-hours',             requirePermission(Permission.REPORTS_VIEW), ctrl.peakHoursHandler)

// Financial report — REPORTS_FINANCIAL only (ADMIN, MANAGER, ACCOUNTANT — not VIEWER)
router.get('/profit',                 requirePermission(Permission.REPORTS_FINANCIAL), ctrl.profitReport)

export default router
