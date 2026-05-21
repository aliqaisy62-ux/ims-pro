import { PrismaClient, Prisma } from '@prisma/client'
import { CreateVoucherInput } from '../validators/voucher.validator'

const prisma = new PrismaClient()

// ─── Voucher number generator ─────────────────────────────────────────────────

export async function generateVoucherNumber(): Promise<string> {
  const now = new Date()
  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(now)
  endOfDay.setHours(23, 59, 59, 999)

  const countToday = await prisma.paymentVoucher.count({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  })

  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
  const seq = String(countToday + 1).padStart(4, '0')
  return `VCH-${dateStr}-${seq}`
}

// ─── Query functions ──────────────────────────────────────────────────────────

export async function getVouchers(params: {
  page?: number
  limit?: number
  type?: string
  entityType?: string
  entityId?: string
  from?: string
  to?: string
}) {
  const { page = 1, limit = 20, type, entityType, entityId } = params
  const { from, to } = params
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}
  if (type) where.type = type
  if (entityType) where.entityType = entityType
  if (entityId) where.entityId = entityId
  if (from || to) {
    const dateFilter: Record<string, Date> = {}
    if (from) dateFilter.gte = new Date(from)
    if (to) dateFilter.lte = new Date(to)
    where.createdAt = dateFilter
  }

  const [data, total] = await Promise.all([
    prisma.paymentVoucher.findMany({
      where: where as Parameters<typeof prisma.paymentVoucher.findMany>[0]['where'],
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
      },
    }),
    prisma.paymentVoucher.count({
      where: where as Parameters<typeof prisma.paymentVoucher.count>[0]['where'],
    }),
  ])

  return { data, total, page, limit }
}

export async function getVoucherById(id: string) {
  return prisma.paymentVoucher.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: { id: true, name: true },
      },
    },
  })
}

// ─── Create with transaction ──────────────────────────────────────────────────

export async function createVoucher(data: CreateVoucherInput, userId: string) {
  return prisma.$transaction(
    async (tx) => {
      const voucherNumber = await (async () => {
        const now = new Date()
        const startOfDay = new Date(now)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(now)
        endOfDay.setHours(23, 59, 59, 999)

        const countToday = await tx.paymentVoucher.count({
          where: {
            createdAt: { gte: startOfDay, lte: endOfDay },
          },
        })

        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
        const seq = String(countToday + 1).padStart(4, '0')
        return `VCH-${dateStr}-${seq}`
      })()

      // Apply balance effects
      if (data.type === 'RECEIPT' && data.entityType === 'CUSTOMER' && data.entityId) {
        await tx.customer.update({
          where: { id: data.entityId },
          data: { balance: { decrement: data.amount } },
        })
      }

      if (data.type === 'DISBURSEMENT' && data.entityType === 'SUPPLIER' && data.entityId) {
        await tx.supplier.update({
          where: { id: data.entityId },
          data: { balance: { decrement: data.amount } },
        })
      }

      return tx.paymentVoucher.create({
        data: {
          voucherNumber,
          type: data.type,
          entityType: data.entityType ?? 'OTHER',
          entityId: data.entityId ?? null,
          amount: data.amount,
          currency: data.currency,
          exchangeRate: data.exchangeRate,
          description: data.description,
          createdById: userId,
        },
        include: {
          createdBy: {
            select: { id: true, name: true },
          },
        },
      })
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  )
}
