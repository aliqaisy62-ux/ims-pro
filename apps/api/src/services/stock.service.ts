import { PrismaClient, Prisma } from '@prisma/client'
import { CreateStockTransferInput } from '../validators/stock.validator'

const prisma = new PrismaClient()

export async function getStockTransfers(params: {
  page?: number
  limit?: number
  itemId?: string
  type?: string
  reason?: string
  from?: string
  to?: string
}) {
  const { page = 1, limit = 20, itemId, type, reason, from, to } = params
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}
  if (itemId) where.itemId = itemId
  if (type) where.type = type
  if (reason) where.reason = reason
  if (from || to) {
    const dateFilter: Record<string, Date> = {}
    if (from) dateFilter.gte = new Date(from)
    if (to) dateFilter.lte = new Date(to)
    where.createdAt = dateFilter
  }

  const [data, total] = await Promise.all([
    prisma.stockTransfer.findMany({
      where: where as Prisma.StockTransferWhereInput,
      include: {
        item: {
          select: { id: true, name_ar: true, name_en: true, barcode: true, unit: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.stockTransfer.count({
      where: where as Prisma.StockTransferWhereInput,
    }),
  ])

  return { data, total, page, limit }
}

export async function createStockTransfer(data: CreateStockTransferInput, userId: string) {
  return prisma.$transaction(
    async (tx) => {
      const item = await tx.item.findUnique({ where: { id: data.itemId } })
      if (!item) throw new Error('ITEM_NOT_FOUND')

      if (data.type === 'OUT') {
        if (new Prisma.Decimal(item.stockQty).lt(new Prisma.Decimal(data.quantity))) {
          throw new Error('INSUFFICIENT_STOCK')
        }
      }

      if (data.type === 'IN') {
        await tx.item.update({
          where: { id: data.itemId },
          data: { stockQty: { increment: data.quantity } },
        })
      } else {
        await tx.item.update({
          where: { id: data.itemId },
          data: { stockQty: { decrement: data.quantity } },
        })
      }

      return tx.stockTransfer.create({
        data: {
          type: data.type,
          itemId: data.itemId,
          quantity: data.quantity,
          reason: data.reason,
          notes: data.notes,
          createdById: userId,
        },
        include: {
          item: {
            select: { id: true, name_ar: true, name_en: true, barcode: true, unit: true },
          },
          createdBy: {
            select: { id: true, name: true },
          },
        },
      })
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  )
}

export async function getInventory(params: {
  search?: string
  categoryId?: string
  lowStock?: boolean
}) {
  const { search, categoryId, lowStock } = params

  const where: Record<string, unknown> = { isActive: true }

  if (search) {
    where.OR = [
      { name_ar: { contains: search } },
      { name_en: { contains: search, mode: 'insensitive' } },
      { barcode: { contains: search } },
    ]
  }

  if (categoryId) where.categoryId = categoryId

  if (lowStock) {
    const ids = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Item"
      WHERE "isActive" = true
        AND "minimumStock" > 0
        AND "stockQty" <= "minimumStock"
    `
    where.id = { in: ids.map((r) => r.id) }
  }

  const items = await prisma.item.findMany({
    where: where as Prisma.ItemWhereInput,
    include: { category: true },
    orderBy: { name_ar: 'asc' },
  })

  return items.map((item) => {
    const qty = Number(item.stockQty)
    const cost = Number(item.costPrice)
    const retail = Number(item.retailPrice)
    return {
      ...item,
      costValue: qty * cost,
      retailValue: qty * retail,
    }
  })
}

export async function getLowStockItems() {
  const ids = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Item"
    WHERE "isActive" = true
      AND "minimumStock" > 0
      AND "stockQty" <= "minimumStock"
  `

  if (ids.length === 0) return []

  return prisma.item.findMany({
    where: { id: { in: ids.map((r) => r.id) } },
    include: { category: true },
    orderBy: { stockQty: 'asc' },
  })
}

export async function getExpiringItems(days: number) {
  const threshold = new Date()
  threshold.setDate(threshold.getDate() + days)

  return prisma.item.findMany({
    where: {
      isActive: true,
      expiryDate: { not: null, lte: threshold },
    },
    include: { category: true },
    orderBy: { expiryDate: 'asc' },
  })
}
