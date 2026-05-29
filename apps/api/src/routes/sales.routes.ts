import { Router } from 'express'
import { verifyToken, requireFullAccess } from '../middleware/auth'
import { requirePermission, Permission } from '../middleware/requirePermission'
import {
  listInvoices,
  getInvoice,
  createInvoice,
  confirmInvoiceHandler,
  cancelInvoiceHandler,
  returnInvoiceHandler,
  partialReturnHandler,
} from '../controllers/sales.controller'

const router = Router()
router.use(verifyToken)
router.use(requireFullAccess)

router.get('/',                  requirePermission(Permission.SALES_VIEW),   listInvoices)
router.get('/:id',               requirePermission(Permission.SALES_VIEW),   getInvoice)
router.post('/',                 requirePermission(Permission.SALES_CREATE),  createInvoice)
router.post('/:id/confirm',      requirePermission(Permission.SALES_CREATE),  confirmInvoiceHandler)
router.post('/:id/cancel',       requirePermission(Permission.SALES_MANAGE),  cancelInvoiceHandler)
router.post('/:id/return',       requirePermission(Permission.SALES_MANAGE),  returnInvoiceHandler)
router.post('/:id/partial-return', requirePermission(Permission.SALES_MANAGE), partialReturnHandler)

export default router
