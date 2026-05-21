import { Router } from 'express'
import { verifyToken } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { listVouchers, getVoucher, createVoucherHandler } from '../controllers/voucher.controller'

const router = Router()
router.use(verifyToken)

router.get('/', requireRole('ADMIN', 'MANAGER', 'ACCOUNTANT'), listVouchers)
router.post('/', requireRole('ADMIN', 'MANAGER', 'ACCOUNTANT'), createVoucherHandler)
router.get('/:id', requireRole('ADMIN', 'MANAGER', 'ACCOUNTANT'), getVoucher)

export default router
