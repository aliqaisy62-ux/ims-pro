import { PrismaClient, Prisma } from '@prisma/client'
import { CreateCustomerInput, UpdateCustomerInput } from '../validators/customer.validator'

const prisma = new PrismaClient()

export async function getCustomers(params: {
  search?: string
  type?: string
  page?: number
  pageSize?: number
}) {
  const { search, type, page = 1, pageSize = 20 } = params
  const skip = (page - 1) * pageSize
  const where: Record<string, unknown> = { isActive: true }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
    ]
  }
  if (type) where.type = type

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where: where as Prisma.CustomerWhereInput,
      skip,
      take: pageSize,
      orderBy: { name: 'asc' },
    }),
    prisma.customer.count({ where: where as Prisma.CustomerWhereInput }),
  ])
  return { customers, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

export async function getCustomerById(id: string) {
  return prisma.customer.findFirst({ where: { id, isActive: true } })
}

export async function createCustomer(data: CreateCustomerInput) {
  return prisma.customer.create({ data })
}

export async function updateCustomer(id: string, data: UpdateCustomerInput) {
  return prisma.customer.update({ where: { id }, data })
}

export async function softDeleteCustomer(id: string) {
  return prisma.customer.update({ where: { id }, data: { isActive: false } })
}

export async function getCustomerStatement(id: string, from?: string, to?: string) {
  const dateFilter: Record<string, unknown> = {}
  if (from) dateFilter.gte = new Date(from)
  if (to) dateFilter.lte = new Date(to)

  const [invoices, vouchers] = await Promise.all([
    prisma.salesInvoice.findMany({
      where: {
        customerId: id,
        isActive: true,
        status: 'CONFIRMED',
        ...(from || to ? { createdAt: dateFilter } : {}),
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, invoiceNumber: true, createdAt: true,
        total: true, amountPaid: true, balance: true, currency: true, type: true,
      },
    }),
    prisma.paymentVoucher.findMany({
      where: {
        entityType: 'CUSTOMER',
        entityId: id,
        ...(from || to ? { createdAt: dateFilter } : {}),
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, voucherNumber: true, createdAt: true, amount: true, currency: true, type: true, description: true },
    }),
  ])

  const customer = await getCustomerById(id)
  return { customer, invoices, vouchers }
}
