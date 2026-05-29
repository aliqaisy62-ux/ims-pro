import { Request, Response } from 'express'
import { PrismaClient } from '@ims-pro/db'

const prisma = new PrismaClient()

export async function listAuditLogs(req: Request, res: Response) {
  try {
    const { userId, action, entity, from, to, page = '1', pageSize = '50' } = req.query

    const where: Record<string, unknown> = {}
    if (userId) where.userId = userId as string
    if (action) where.action = action as string
    if (entity) where.entity = entity as string
    if (from || to) {
      const dateFilter: Record<string, Date> = {}
      if (from) dateFilter.gte = new Date(from as string)
      if (to) {
        const d = new Date(to as string)
        d.setHours(23, 59, 59, 999)
        dateFilter.lte = d
      }
      where.createdAt = dateFilter
    }

    const skip = (parseInt(page as string, 10) - 1) * parseInt(pageSize as string, 10)
    const take = parseInt(pageSize as string, 10)

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, username: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    ])

    res.json({ success: true, data: { logs, total, page: parseInt(page as string, 10), pageSize: take } })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch audit logs'
    res.status(500).json({ success: false, error: msg })
  }
}
