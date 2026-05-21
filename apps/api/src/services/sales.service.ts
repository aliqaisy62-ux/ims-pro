import { PrismaClient, Prisma } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { CreateSalesInvoiceInput } from '../validators/sales.validator'

const prisma = new PrismaClient()

export async function generateInvoiceNumber(): Promise<string> {
  const now = new Date()
  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(now)
  endOfDay.setHours(23, 59, 59, 999)

  const countToday = await prisma.salesInvoice.count({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  })

  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
  const seq = String(countToday + 1).padStart(4, '0')
  return `INV-${dateStr}-${seq}`
}

export async function getSalesInvoices(params: {
  page?: number
  limit?: number
  status?: string
  customerId?: string
  from?: string
  to?: string
  search?: string
}) {
  const { page = 1, limit = 20, status, customerId, from, to, search } = params
  const skip = (page - 1) * limit

  const where: Prisma.SalesInvoiceWhereInput = { isActive: true }

  if (status) where.status = status as Prisma.EnumInvoiceStatusFilter
  if (customerId) where.customerId = customerId
  if (from || to) {
    where.createdAt = {}
    if (from) where.createdAt.gte = new Date(from)
    if (to) where.createdAt.lte = new Date(to)
  }
  if (search) {
    where.invoiceNumber = { contains: search, mode: 'insensitive' }
  }

  const [data, total] = await Promise.all([
    prisma.salesInvoice.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: { id: true, name: true, currency: true },
        },
        _count: {
          select: { items: true },
        },
      },
    }),
    prisma.salesInvoice.count({ where }),
  ])

  return { data, total, page, limit }
}

export async function getSalesInvoiceById(id: string) {
  return prisma.salesInvoice.findFirst({
    where: { id, isActive: true },
    include: {
      customer: true,
      createdBy: {
        select: { id: true, name: true, username: true },
      },
      items: {
        include: {
          item: {
            select: { id: true, name_ar: true, name_en: true, barcode: true },
          },
        },
      },
    },
  })
}

export async function createSalesInvoice(data: CreateSalesInvoiceInput, userId: string) {
  if (data.paymentType === 'CREDIT' && !data.customerId) {
    throw new Error('CREDIT_REQUIRES_CUSTOMER')
  }

  const exchangeRateDecimal = new Decimal(data.exchangeRate)
  const invoiceDiscountPct = new Decimal(data.discount ?? 0)

  // Calculate line totals
  const lineData = data.items.map((line) => {
    const qty = new Decimal(line.quantity)
    const price = new Decimal(line.unitPrice)
    const discountFactor = new Decimal(1).minus(new Decimal(line.discount ?? 0).div(100))
    const lineSubtotal = qty.mul(price).mul(discountFactor)
    return {
      itemId: line.itemId,
      quantity: qty,
      unitPrice: price,
      subtotal: lineSubtotal,
      currency: data.currency as 'USD' | 'IQD',
    }
  })

  const subtotal = lineData.reduce((acc, l) => acc.plus(l.subtotal), new Decimal(0))
  const discountFactor = new Decimal(1).minus(invoiceDiscountPct.div(100))
  const total = subtotal.mul(discountFactor)

  const invoiceNumber = await generateInvoiceNumber()

  const invoice = await prisma.salesInvoice.create({
    data: {
      invoiceNumber,
      customerId: data.customerId ?? null,
      type: data.paymentType,
      priceType: data.priceType,
      currency: data.currency,
      exchangeRate: exchangeRateDecimal,
      subtotal,
      discount: invoiceDiscountPct,
      total,
      balance: total,
      notes: data.notes ?? null,
      status: 'DRAFT',
      createdById: userId,
      items: {
        create: lineData.map((l) => ({
          itemId: l.itemId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          subtotal: l.subtotal,
          currency: l.currency,
        })),
      },
    },
    include: {
      customer: true,
      items: {
        include: {
          item: {
            select: { id: true, name_ar: true, name_en: true, barcode: true },
          },
        },
      },
    },
  })

  return invoice
}

export async function confirmInvoice(invoiceId: string, userId: string) {
  const invoice = await prisma.salesInvoice.findFirst({
    where: { id: invoiceId, isActive: true },
    include: { items: true },
  })

  if (!invoice) throw new Error('INVOICE_NOT_FOUND')
  if (invoice.status !== 'DRAFT') {
    const err = new Error('INVOICE_NOT_DRAFT')
    ;(err as Error & { statusCode: number }).statusCode = 400
    throw err
  }

  await prisma.$transaction(
    async (tx) => {
      for (const line of invoice.items) {
        const dbItem = await tx.item.findUnique({ where: { id: line.itemId } })
        if (!dbItem) throw new Error(`ITEM_NOT_FOUND:${line.itemId}`)

        const currentStock = new Decimal(dbItem.stockQty.toString())
        const requiredQty = new Decimal(line.quantity.toString())

        if (currentStock.lessThan(requiredQty)) {
          throw new Error(`INSUFFICIENT_STOCK:${dbItem.name_ar}:${dbItem.name_en}`)
        }

        await tx.item.update({
          where: { id: line.itemId },
          data: { stockQty: { decrement: requiredQty.toNumber() } },
        })

        await tx.stockTransfer.create({
          data: {
            itemId: line.itemId,
            type: 'OUT',
            reason: 'TRANSFER',
            quantity: line.quantity,
            notes: `فاتورة مبيعات: ${invoice.invoiceNumber}`,
            createdById: userId,
          },
        })
      }

      if (invoice.type === 'CREDIT' && invoice.customerId) {
        await tx.customer.update({
          where: { id: invoice.customerId },
          data: { balance: { increment: new Decimal(invoice.total.toString()).toNumber() } },
        })
      }

      await tx.salesInvoice.update({
        where: { id: invoiceId },
        data: { status: 'CONFIRMED' },
      })
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  )

  return getSalesInvoiceById(invoiceId)
}

export async function cancelInvoice(invoiceId: string, userId: string) {
  const invoice = await prisma.salesInvoice.findFirst({
    where: { id: invoiceId, isActive: true },
    include: { items: true },
  })

  if (!invoice) throw new Error('INVOICE_NOT_FOUND')
  if (invoice.status === 'CANCELLED') throw new Error('ALREADY_CANCELLED')

  const wasConfirmed = invoice.status === 'CONFIRMED'

  await prisma.$transaction(
    async (tx) => {
      if (wasConfirmed) {
        for (const line of invoice.items) {
          await tx.item.update({
            where: { id: line.itemId },
            data: { stockQty: { increment: new Decimal(line.quantity.toString()).toNumber() } },
          })

          await tx.stockTransfer.create({
            data: {
              itemId: line.itemId,
              type: 'IN',
              reason: 'RETURN',
              quantity: line.quantity,
              notes: `إلغاء فاتورة: ${invoice.invoiceNumber}`,
              createdById: userId,
            },
          })
        }

        if (invoice.type === 'CREDIT' && invoice.customerId) {
          await tx.customer.update({
            where: { id: invoice.customerId },
            data: { balance: { decrement: new Decimal(invoice.total.toString()).toNumber() } },
          })
        }
      }

      await tx.salesInvoice.update({
        where: { id: invoiceId },
        data: { status: 'CANCELLED' },
      })
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  )

  return getSalesInvoiceById(invoiceId)
}

export async function returnInvoice(invoiceId: string, userId: string) {
  const invoice = await prisma.salesInvoice.findFirst({
    where: { id: invoiceId, isActive: true },
    include: { items: true },
  })

  if (!invoice) throw new Error('INVOICE_NOT_FOUND')
  if (invoice.status !== 'CONFIRMED') {
    const err = new Error('ONLY_CONFIRMED_CAN_BE_RETURNED')
    ;(err as Error & { statusCode: number }).statusCode = 400
    throw err
  }

  await prisma.$transaction(
    async (tx) => {
      for (const line of invoice.items) {
        await tx.item.update({
          where: { id: line.itemId },
          data: { stockQty: { increment: new Decimal(line.quantity.toString()).toNumber() } },
        })

        await tx.stockTransfer.create({
          data: {
            itemId: line.itemId,
            type: 'IN',
            reason: 'RETURN',
            quantity: line.quantity,
            notes: `إرجاع فاتورة: ${invoice.invoiceNumber}`,
            createdById: userId,
          },
        })
      }

      if (invoice.type === 'CREDIT' && invoice.customerId) {
        await tx.customer.update({
          where: { id: invoice.customerId },
          data: { balance: { decrement: new Decimal(invoice.total.toString()).toNumber() } },
        })
      }

      await tx.salesInvoice.update({
        where: { id: invoiceId },
        data: { status: 'RETURNED' },
      })
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  )

  return getSalesInvoiceById(invoiceId)
}
