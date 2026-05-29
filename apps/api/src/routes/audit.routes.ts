import { Router } from 'express'
import { verifyToken } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { listAuditLogs } from '../controllers/audit.controller'

const router = Router()
router.use(verifyToken)

router.get('/', requireRole('ADMIN'), listAuditLogs)

export default router
