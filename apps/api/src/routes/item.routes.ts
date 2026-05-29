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
import { verifyToken, requireFullAccess } from '../middleware/auth'
import { requirePermission, Permission } from '../middleware/requirePermission'
import { requireRole } from '../middleware/requireRole'
import { validateRequest } from '../middleware/validateRequest'
import { createItemSchema, updateItemSchema } from '../validators/item.validator'

const EXCEL_MIMES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
])
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (EXCEL_MIMES.has(file.mimetype)) return cb(null, true)
    cb(new Error('Only Excel files (.xlsx, .xls) are allowed'))
  },
})

const router = Router()
router.use(verifyToken)
router.use(requireFullAccess)

router.get('/categories',       listCategories)  // all roles need categories for dropdowns
router.get('/barcode/:barcode', requirePermission(Permission.INVENTORY_VIEW), lookupByBarcode)
router.get('/',                 requirePermission(Permission.INVENTORY_VIEW), listItems)
router.get('/:id',              requirePermission(Permission.INVENTORY_VIEW), getItem)

router.post('/validate-import', requirePermission(Permission.INVENTORY_EDIT), upload.single('file'), validateImportHandler)
router.post('/import',          requirePermission(Permission.INVENTORY_EDIT), upload.single('file'), importItemsHandler)
router.post('/',                requirePermission(Permission.INVENTORY_EDIT), validateRequest(createItemSchema), addItem)
router.put('/:id',              requirePermission(Permission.INVENTORY_EDIT), validateRequest(updateItemSchema), editItem)
router.delete('/:id',           requireRole('ADMIN'), deleteItem)

export default router
