import { Router } from 'express'
import { verifyToken, requireFullAccess } from '../middleware/auth'
import { requirePermission, Permission } from '../middleware/requirePermission'
import {
  listInvoices,
  getInvoice,
  createInvoice,
  confirmInvoiceHandler,
  cancelInvoiceHandler,
} from '../controllers/purchase.controller'

const router = Router()
router.use(verifyToken)
router.use(requireFullAccess)

router.get('/',           requirePermission(Permission.PURCHASES_VIEW),   listInvoices)
router.get('/:id',        requirePermission(Permission.PURCHASES_VIEW),   getInvoice)
router.post('/',          requirePermission(Permission.PURCHASES_CREATE),  createInvoice)
router.post('/:id/confirm', requirePermission(Permission.PURCHASES_MANAGE), confirmInvoiceHandler)
router.post('/:id/cancel',  requirePermission(Permission.PURCHASES_MANAGE), cancelInvoiceHandler)

export default router
