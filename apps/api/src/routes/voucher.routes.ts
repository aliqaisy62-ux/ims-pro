import { Router } from 'express'
import { verifyToken } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { listVouchers, getVoucher, createVoucherHandler } from '../controllers/voucher.controller'

const router = Router()
router.use(verifyToken)

router.get('/', listVouchers)
router.post('/', requireRole('MANAGER', 'ADMIN'), createVoucherHandler)
router.get('/:id', getVoucher)

export default router
