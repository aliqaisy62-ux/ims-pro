import { Router } from 'express'
import { listSuppliers, getSupplier, addSupplier, editSupplier, deleteSupplier, supplierStatement } from '../controllers/supplier.controller'
import { verifyToken, requireFullAccess } from '../middleware/auth'
import { requirePermission, Permission } from '../middleware/requirePermission'
import { requireRole } from '../middleware/requireRole'
import { validateRequest } from '../middleware/validateRequest'
import { createSupplierSchema, updateSupplierSchema } from '../validators/supplier.validator'

const router = Router()
router.use(verifyToken)
router.use(requireFullAccess)

router.get('/',              requirePermission(Permission.SUPPLIERS_VIEW), listSuppliers)
router.get('/:id',           requirePermission(Permission.SUPPLIERS_VIEW), getSupplier)
router.get('/:id/statement', requirePermission(Permission.SUPPLIERS_VIEW), supplierStatement)
router.post('/',             requirePermission(Permission.SUPPLIERS_EDIT), validateRequest(createSupplierSchema), addSupplier)
router.put('/:id',           requirePermission(Permission.SUPPLIERS_EDIT), validateRequest(updateSupplierSchema), editSupplier)
router.delete('/:id',        requireRole('ADMIN'), deleteSupplier)

export default router
