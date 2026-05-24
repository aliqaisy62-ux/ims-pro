import { Router } from 'express'
import multer from 'multer'
import {
  listItems,
  getItem,
  lookupByBarcode,
  addItem,
  editItem,
  deleteItem,
  listCategories,
  importItemsHandler,
  validateImportHandler,
} from '../controllers/item.controller'
import { verifyToken } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { validateRequest } from '../middleware/validateRequest'
import { createItemSchema, updateItemSchema } from '../validators/item.validator'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

router.use(verifyToken)

router.get('/categories', listCategories)
router.get('/barcode/:barcode', lookupByBarcode)
router.get('/', listItems)
router.get('/:id', getItem)
router.post('/validate-import', requireRole('ADMIN', 'MANAGER'), upload.single('file'), validateImportHandler)
router.post('/import', requireRole('ADMIN', 'MANAGER'), upload.single('file'), importItemsHandler)
router.post('/', requireRole('ADMIN', 'MANAGER', 'STAFF'), validateRequest(createItemSchema), addItem)
router.put('/:id', requireRole('ADMIN', 'MANAGER', 'STAFF'), validateRequest(updateItemSchema), editItem)
router.delete('/:id', requireRole('ADMIN'), deleteItem)

export default router
