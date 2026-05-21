import { Router } from 'express'
import { verifyToken } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import {
  listInvoices,
  getInvoice,
  createInvoice,
  confirmInvoiceHandler,
  cancelInvoiceHandler,
} from '../controllers/purchase.controller'

const router = Router()

router.use(verifyToken)

router.get('/', listInvoices)
router.post('/', requireRole('MANAGER', 'ADMIN'), createInvoice)
router.get('/:id', getInvoice)
router.post('/:id/confirm', requireRole('MANAGER', 'ADMIN'), confirmInvoiceHandler)
router.post('/:id/cancel', requireRole('MANAGER', 'ADMIN'), cancelInvoiceHandler)

export default router
