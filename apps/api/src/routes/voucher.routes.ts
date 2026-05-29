import { Router } from 'express'
import { verifyToken, requireFullAccess } from '../middleware/auth'
import { requirePermission, Permission } from '../middleware/requirePermission'
import { listVouchers, getVoucher, createVoucherHandler } from '../controllers/voucher.controller'

const router = Router()
router.use(verifyToken)
router.use(requireFullAccess)

router.get('/',    requirePermission(Permission.VOUCHERS_VIEW),   listVouchers)
router.get('/:id', requirePermission(Permission.VOUCHERS_VIEW),   getVoucher)
router.post('/',   requirePermission(Permission.VOUCHERS_CREATE),  createVoucherHandler)

export default router
