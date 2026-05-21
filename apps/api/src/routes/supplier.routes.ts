import { Router } from 'express'
import { listSuppliers, getSupplier, addSupplier, editSupplier, deleteSupplier, supplierStatement } from '../controllers/supplier.controller'
import { verifyToken } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { validateRequest } from '../middleware/validateRequest'
import { createSupplierSchema, updateSupplierSchema } from '../validators/supplier.validator'

const router = Router()
router.use(verifyToken)

router.get('/', listSuppliers)
router.get('/:id', getSupplier)
router.get('/:id/statement', supplierStatement)
router.post('/', requireRole('ADMIN', 'MANAGER'), validateRequest(createSupplierSchema), addSupplier)
router.put('/:id', requireRole('ADMIN', 'MANAGER'), validateRequest(updateSupplierSchema), editSupplier)
router.delete('/:id', requireRole('ADMIN'), deleteSupplier)

export default router
