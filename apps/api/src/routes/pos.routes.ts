import { Router } from 'express'
import { verifyToken } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { checkoutHandler } from '../controllers/pos.controller'

const router = Router()

router.use(verifyToken)

router.post(
  '/checkout',
  requireRole('ADMIN', 'MANAGER', 'CASHIER', 'STAFF'),
  checkoutHandler
)

export default router
