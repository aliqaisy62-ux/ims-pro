import { PrismaClient } from '@prisma/client'
import { CreateItemInput, UpdateItemInput } from '../validators/item.validator'

const prisma = new PrismaClient()

function generateBarcode(): string {
  const timestamp = Date.now().toString().slice(-8)
  return `IMS-${timestamp}`
}

export async function getItems(params: {
  search?: string
  categoryId?: string
  isActive?: boolean
  lowStock?: boolean
  page?: number
  pageSize?: number
}) {
  const { search, categoryId, isActive = true, lowStock, page = 1, pageSize = 20 } = params
  const skip = (page - 1) * pageSize

  // Build base where
  const where: Record<string, unknown> = { isActive }
  if (search) {
    where.OR = [
      { name_ar: { contains: search } },
      { name_en: { contains: search, mode: 'insensitive' } },
      { barcode: { contains: search } },
    ]
  }
  if (categoryId) where.categoryId = categoryId

  if (lowStock) {
    const lowStockIds = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Item" WHERE "isActive" = true AND "minimumStock" > 0 AND "stockQty" <= "minimumStock"
    `
    where.id = { in: lowStockIds.map((i) => i.id) }
  }

  const [items, total] = await Promise.all([
    prisma.item.findMany({
      where: where as Parameters<typeof prisma.item.findMany>[0]['where'],
      include: { category: true, supplier: { select: { id: true, name: true } } },
      skip,
      take: pageSize,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.item.count({ where: where as Parameters<typeof prisma.item.count>[0]['where'] }),
  ])

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

export async function getItemById(id: string) {
  return prisma.item.findFirst({
    where: { id, isActive: true },
    include: { category: true, supplier: { select: { id: true, name: true } } },
  })
}

export async function getItemByBarcode(barcode: string) {
  return prisma.item.findFirst({
    where: { barcode, isActive: true },
    include: { category: true },
  })
}

export async function createItem(data: CreateItemInput) {
  return prisma.item.create({
    data: {
      ...data,
      barcode: data.barcode || generateBarcode(),
      costPrice: data.costPrice ?? 0,
      retailPrice: data.retailPrice ?? 0,
      wholesalePrice: data.wholesalePrice ?? 0,
      specialPrice: data.specialPrice ?? 0,
      dollarPrice: data.dollarPrice ?? 0,
      dinarPrice: data.dinarPrice ?? 0,
      minimumStock: data.minimumStock ?? 0,
    },
    include: { category: true },
  })
}

export async function updateItem(id: string, data: UpdateItemInput) {
  return prisma.item.update({
    where: { id },
    data,
    include: { category: true },
  })
}

export async function softDeleteItem(id: string) {
  return prisma.item.update({ where: { id }, data: { isActive: false } })
}

export async function getCategories() {
  return prisma.category.findMany({ orderBy: { name_ar: 'asc' } })
}
