import { Router } from 'express'
import { verifyToken } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import { dbPush } from '../controllers/system.controller'

const router = Router()
router.use(verifyToken)

router.post('/db-push', requireRole('ADMIN'), dbPush)

export default router
