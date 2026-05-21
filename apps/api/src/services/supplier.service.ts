import { PrismaClient } from '@prisma/client'
import { CreateSupplierInput, UpdateSupplierInput } from '../validators/supplier.validator'

const prisma = new PrismaClient()

export async function getSuppliers(params: {
  search?: string
  page?: number
  pageSize?: number
}) {
  const { search, page = 1, pageSize = 20 } = params
  const skip = (page - 1) * pageSize
  const where: Record<string, unknown> = { isActive: true }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
    ]
  }

  const [suppliers, total] = await Promise.all([
    prisma.supplier.findMany({
      where: where as Parameters<typeof prisma.supplier.findMany>[0]['where'],
      skip,
      take: pageSize,
      orderBy: { name: 'asc' },
    }),
    prisma.supplier.count({ where: where as Parameters<typeof prisma.supplier.count>[0]['where'] }),
  ])
  return { suppliers, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

export async function getSupplierById(id: string) {
  return prisma.supplier.findFirst({ where: { id, isActive: true } })
}

export async function createSupplier(data: CreateSupplierInput) {
  return prisma.supplier.create({ data })
}

export async function updateSupplier(id: string, data: UpdateSupplierInput) {
  return prisma.supplier.update({ where: { id }, data })
}

export async function softDeleteSupplier(id: string) {
  return prisma.supplier.update({ where: { id }, data: { isActive: false } })
}

export async function getSupplierStatement(id: string, from?: string, to?: string) {
  const dateFilter: Record<string, unknown> = {}
  if (from) dateFilter.gte = new Date(from)
  if (to) dateFilter.lte = new Date(to)

  const [invoices, vouchers] = await Promise.all([
    prisma.purchaseInvoice.findMany({
      where: {
        supplierId: id,
        isActive: true,
        status: 'CONFIRMED',
        ...(from || to ? { createdAt: dateFilter } : {}),
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, invoiceNumber: true, createdAt: true,
        total: true, amountPaid: true, balance: true, currency: true,
      },
    }),
    prisma.paymentVoucher.findMany({
      where: {
        entityType: 'SUPPLIER',
        entityId: id,
        ...(from || to ? { createdAt: dateFilter } : {}),
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, voucherNumber: true, createdAt: true, amount: true, currency: true, type: true, description: true },
    }),
  ])

  const supplier = await getSupplierById(id)
  return { supplier, invoices, vouchers }
}
