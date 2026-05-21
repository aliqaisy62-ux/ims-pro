import { Router } from 'express'
import {
  listItems,
  getItem,
  lookupByBarcode,
  addItem,
  editItem,
  deleteItem,
  listCategories,
} from '../controllers/item.controller'
import { verifyToken } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { validateRequest } from '../middleware/validateRequest'
import { createItemSchema, updateItemSchema } from '../validators/item.validator'

const router = Router()

router.use(verifyToken)

router.get('/categories', listCategories)
router.get('/barcode/:barcode', lookupByBarcode)
router.get('/', listItems)
router.get('/:id', getItem)
router.post('/', requireRole('ADMIN', 'MANAGER'), validateRequest(createItemSchema), addItem)
router.put('/:id', requireRole('ADMIN', 'MANAGER'), validateRequest(updateItemSchema), editItem)
router.delete('/:id', requireRole('ADMIN'), deleteItem)

export default router
