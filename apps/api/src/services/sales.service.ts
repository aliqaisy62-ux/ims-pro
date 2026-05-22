import { PrismaClient, Prisma } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { CreateSalesInvoiceInput } from '../validators/sales.validator'

const prisma = new PrismaClient()

async function generateInvoiceNumberInTx(tx: Prisma.TransactionClient): Promise<string> {
  // Advisory lock serializes number generation across concurrent transactions
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(20260001)`
  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
  const prefix = `INV-${dateStr}-`
  // Use MAX of existing sequence numbers for today to avoid gaps from deletions
  const result = await tx.$queryRaw<{ max_num: string | null }[]>`
    SELECT MAX(SUBSTRING("invoiceNumber" FROM ${prefix.length + 1}::int)::int) AS max_num
    FROM "SalesInvoice"
    WHERE "invoiceNumber" LIKE ${prefix + '%'}
  `
  const maxNum = result[0]?.max_num ? Number(result[0].max_num) : 0
  return `${prefix}${String(maxNum + 1).padStart(4, '0')}`
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

  const lineData = data.items.map((line) => {
    const qty = new Decimal(line.quantity)
    const price = new Decimal(line.unitPrice)
    const discountFactor = new Decimal(1).minus(new Decimal(line.discount ?? 0).div(100))
    return {
      itemId: line.itemId,
      quantity: qty,
      unitPrice: price,
      subtotal: qty.mul(price).mul(discountFactor),
      currency: data.currency as 'USD' | 'IQD',
    }
  })

  const subtotal = lineData.reduce((acc, l) => acc.plus(l.subtotal), new Decimal(0))
  const total = subtotal.mul(new Decimal(1).minus(invoiceDiscountPct.div(100)))

  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const invoiceNumber = await generateInvoiceNumberInTx(tx)
        return tx.salesInvoice.create({
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
                item: { select: { id: true, name_ar: true, name_en: true, barcode: true } },
              },
            },
          },
        })
      }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted })
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code
      if ((code === 'P2002' || code === 'P2034') && attempt < 9) {
        await new Promise(r => setTimeout(r, Math.random() * 30 + 5))
        continue
      }
      throw e
    }
  }
  throw new Error('Failed to generate unique invoice number after retries')
}

export async function confirmInvoice(invoiceId: string, userId: string, amountPaid?: number) {
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

  await prisma.$transaction(async (tx) => {
    for (const line of invoice.items) {
      const requiredQty = new Decimal(line.quantity.toString())
      // Atomic conditional decrement — row lock prevents concurrent oversell
      const updated = await tx.item.updateMany({
        where: { id: line.itemId, stockQty: { gte: requiredQty.toNumber() } },
        data: { stockQty: { decrement: requiredQty.toNumber() } },
      })
      if (updated.count === 0) {
        const dbItem = await tx.item.findUnique({ where: { id: line.itemId } })
        if (!dbItem) throw new Error(`ITEM_NOT_FOUND:${line.itemId}`)
        throw new Error(`INSUFFICIENT_STOCK:${dbItem.name_ar}:${dbItem.name_en}`)
      }
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

    const isCash = invoice.type === 'CASH'
    const paid = isCash
      ? new Decimal(amountPaid != null ? amountPaid : invoice.total.toString())
      : new Decimal(0)
    const newBalance = isCash ? new Decimal(0) : invoice.total

    await tx.salesInvoice.update({
      where: { id: invoiceId },
      data: { status: 'CONFIRMED', amountPaid: paid, balance: newBalance },
    })
  })

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
