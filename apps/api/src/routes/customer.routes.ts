import { Router } from 'express'
import { listCustomers, getCustomer, addCustomer, editCustomer, deleteCustomer, customerStatement } from '../controllers/customer.controller'
import { verifyToken } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { validateRequest } from '../middleware/validateRequest'
import { createCustomerSchema, updateCustomerSchema } from '../validators/customer.validator'

const router = Router()
router.use(verifyToken)

router.get('/', listCustomers)
router.get('/:id', getCustomer)
router.get('/:id/statement', customerStatement)
router.post('/', requireRole('ADMIN', 'MANAGER', 'STAFF', 'ACCOUNTANT'), validateRequest(createCustomerSchema), addCustomer)
router.put('/:id', requireRole('ADMIN', 'MANAGER', 'STAFF', 'ACCOUNTANT'), validateRequest(updateCustomerSchema), editCustomer)
router.delete('/:id', requireRole('ADMIN'), deleteCustomer)

export default router
