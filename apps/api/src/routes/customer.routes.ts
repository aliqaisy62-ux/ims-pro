import { Router } from 'express'
import { listCustomers, getCustomer, addCustomer, editCustomer, deleteCustomer, customerStatement } from '../controllers/customer.controller'
import { verifyToken, requireFullAccess } from '../middleware/auth'
import { requirePermission, Permission } from '../middleware/requirePermission'
import { requireRole } from '../middleware/requireRole'
import { validateRequest } from '../middleware/validateRequest'
import { createCustomerSchema, updateCustomerSchema } from '../validators/customer.validator'

const router = Router()
router.use(verifyToken)
router.use(requireFullAccess)

router.get('/',               requirePermission(Permission.CUSTOMERS_VIEW), listCustomers)
router.get('/:id',            requirePermission(Permission.CUSTOMERS_VIEW), getCustomer)
router.get('/:id/statement',  requirePermission(Permission.CUSTOMERS_VIEW), customerStatement)
router.post('/',              requirePermission(Permission.CUSTOMERS_EDIT), validateRequest(createCustomerSchema), addCustomer)
router.put('/:id',            requirePermission(Permission.CUSTOMERS_EDIT), validateRequest(updateCustomerSchema), editCustomer)
router.delete('/:id',         requireRole('ADMIN'), deleteCustomer)

export default router
