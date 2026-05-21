import { Router } from 'express'
import { verifyToken } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import {
  listInvoices,
  getInvoice,
  createInvoice,
  confirmInvoiceHandler,
  cancelInvoiceHandler,
  returnInvoiceHandler,
} from '../controllers/sales.controller'

const router = Router()
router.use(verifyToken)

router.get('/', listInvoices)
router.post('/', createInvoice)
router.get('/:id', getInvoice)
router.post('/:id/confirm', confirmInvoiceHandler)
router.post('/:id/cancel', requireRole('MANAGER', 'ADMIN'), cancelInvoiceHandler)
router.post('/:id/return', requireRole('MANAGER', 'ADMIN'), returnInvoiceHandler)

export default router
