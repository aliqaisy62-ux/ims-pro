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

router.get('/', requireRole('ADMIN', 'MANAGER', 'CASHIER', 'STAFF'), listInvoices)
router.post('/', requireRole('ADMIN', 'MANAGER', 'CASHIER', 'STAFF'), createInvoice)
router.get('/:id', requireRole('ADMIN', 'MANAGER', 'CASHIER', 'STAFF'), getInvoice)
router.post('/:id/confirm', requireRole('ADMIN', 'MANAGER', 'CASHIER', 'STAFF'), confirmInvoiceHandler)
router.post('/:id/cancel', requireRole('ADMIN', 'MANAGER'), cancelInvoiceHandler)
router.post('/:id/return', requireRole('ADMIN', 'MANAGER'), returnInvoiceHandler)

export default router
