import { PrismaClient, Prisma } from '@prisma/client'
import { CreateItemInput, UpdateItemInput } from '../validators/item.validator'

const prisma = new PrismaClient()

function generateBarcode(): string {
  const timestamp = Date.now().toString().slice(-8)
  return `IMS-${timestamp}`
}

// ─── Bulk import ──────────────────────────────────────────────────────────────

interface ImportRow {
  name_ar?: unknown
  name_en?: unknown
  barcode?: unknown
  unit?: unknown
  costPrice?: unknown
  retailPrice?: unknown
  wholesalePrice?: unknown
  specialPrice?: unknown
  dollarPrice?: unknown
  dinarPrice?: unknown
  stockQty?: unknown
  minimumStock?: unknown
}

export interface ImportResult {
  created: number
  updated: number
  skipped: number
  errors: string[]
}

function toNum(v: unknown): number {
  const n = Number(v)
  return isNaN(n) || n < 0 ? 0 : n
}

export async function importItems(rows: ImportRow[]): Promise<ImportResult> {
  const result: ImportResult = { created: 0, updated: 0, skipped: 0, errors: [] }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const label = `الصف ${i + 2}`

    const nameAr = row.name_ar?.toString().trim() ?? ''
    const nameEn = row.name_en?.toString().trim() ?? ''

    if (!nameAr) {
      result.errors.push(`${label}: الاسم العربي (name_ar) مطلوب`)
      result.skipped++
      continue
    }
    if (!nameEn) {
      result.errors.push(`${label}: الاسم الإنجليزي (name_en) مطلوب`)
      result.skipped++
      continue
    }

    const barcode = row.barcode?.toString().trim() || null

    const data = {
      name_ar: nameAr,
      name_en: nameEn,
      unit: row.unit?.toString().trim() || 'piece',
      costPrice: toNum(row.costPrice),
      retailPrice: toNum(row.retailPrice),
      wholesalePrice: toNum(row.wholesalePrice),
      specialPrice: toNum(row.specialPrice),
      dollarPrice: toNum(row.dollarPrice),
      dinarPrice: toNum(row.dinarPrice),
      stockQty: toNum(row.stockQty),
      minimumStock: toNum(row.minimumStock),
    }

    try {
      if (barcode) {
        const existing = await prisma.item.findFirst({ where: { barcode } })
        if (existing) {
          await prisma.item.update({ where: { id: existing.id }, data: { ...data, barcode } })
          result.updated++
        } else {
          await prisma.item.create({ data: { ...data, barcode } })
          result.created++
        }
      } else {
        await prisma.item.create({ data: { ...data, barcode: generateBarcode() } })
        result.created++
      }
    } catch (err) {
      result.errors.push(`${label}: ${err instanceof Error ? err.message : 'خطأ'}`)
      result.skipped++
    }
  }

  return result
}

export interface ValidationResult {
  toCreate: { row: number; name_ar: string; name_en: string; barcode: string | null }[]
  toUpdate: { row: number; name_ar: string; name_en: string; barcode: string; existingId: string }[]
  invalid: { row: number; errors: string[] }[]
  summary: { total: number; willCreate: number; willUpdate: number; invalid: number }
}

export async function validateImportRows(rows: ImportRow[]): Promise<ValidationResult> {
  const result: ValidationResult = {
    toCreate: [],
    toUpdate: [],
    invalid: [],
    summary: { total: rows.length, willCreate: 0, willUpdate: 0, invalid: 0 },
  }

  const seenBarcodes = new Map<string, number>()

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2
    const errors: string[] = []

    const nameAr = row.name_ar?.toString().trim() ?? ''
    const nameEn = row.name_en?.toString().trim() ?? ''
    if (!nameAr) errors.push('الاسم العربي (name_ar) مطلوب')
    if (!nameEn) errors.push('الاسم الإنجليزي (name_en) مطلوب')

    const barcode = row.barcode?.toString().trim() || null

    if (barcode) {
      if (seenBarcodes.has(barcode)) {
        errors.push(`الباركود ${barcode} مكرر في الملف (صف ${seenBarcodes.get(barcode)})`)
      } else {
        seenBarcodes.set(barcode, rowNum)
      }
    }

    if (errors.length > 0) {
      result.invalid.push({ row: rowNum, errors })
      result.summary.invalid++
      continue
    }

    if (barcode) {
      const existing = await prisma.item.findFirst({ where: { barcode } })
      if (existing) {
        result.toUpdate.push({ row: rowNum, name_ar: nameAr, name_en: nameEn, barcode, existingId: existing.id })
        result.summary.willUpdate++
      } else {
        result.toCreate.push({ row: rowNum, name_ar: nameAr, name_en: nameEn, barcode })
        result.summary.willCreate++
      }
    } else {
      result.toCreate.push({ row: rowNum, name_ar: nameAr, name_en: nameEn, barcode: null })
      result.summary.willCreate++
    }
  }

  return result
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
      where: where as Prisma.ItemWhereInput,
      include: { category: true, supplier: { select: { id: true, name: true } } },
      skip,
      take: pageSize,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.item.count({ where: where as Prisma.ItemWhereInput }),
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
