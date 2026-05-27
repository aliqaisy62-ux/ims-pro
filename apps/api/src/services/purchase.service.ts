import { PrismaClient, Prisma } from '@prisma/client'
import { CreatePurchaseInvoiceInput } from '../validators/purchase.validator'

const prisma = new PrismaClient()

// ─── Invoice Number Generator ─────────────────────────────────────────────────

async function generatePurchaseNumberInTx(tx: Prisma.TransactionClient): Promise<string> {
  const now = new Date()
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)
  const count = await tx.purchaseInvoice.count({ where: { createdAt: { gte: startOfDay } } })
  return `PUR-${dateStr}-${String(count + 1).padStart(4, '0')}`
}

// ─── List ──────────────────────────────────────────────────────────────────────

export async function getPurchaseInvoices(params: {
  page?: number
  limit?: number
  status?: string
  supplierId?: string
  from?: string
  to?: string
  search?: string
}) {
  const { page = 1, limit = 20, status, supplierId, from, to, search } = params
  const skip = (page - 1) * limit

  const where: Prisma.PurchaseInvoiceWhereInput = { isActive: true }

  if (status) {
    where.status = status
  }
  if (supplierId) {
    where.supplierId = supplierId
  }
  if (from || to) {
    where.createdAt = {}
    if (from) (where.createdAt as Prisma.DateTimeFilter).gte = new Date(from)
    if (to) (where.createdAt as Prisma.DateTimeFilter).lte = new Date(to)
  }
  if (search) {
    where.invoiceNumber = { contains: search, mode: 'insensitive' }
  }

  const [data, total] = await Promise.all([
    prisma.purchaseInvoice.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true, currency: true } },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.purchaseInvoice.count({ where }),
  ])

  return { data, total, page, limit }
}

// ─── Get By ID ────────────────────────────────────────────────────────────────

export async function getPurchaseInvoiceById(id: string) {
  return prisma.purchaseInvoice.findFirst({
    where: { id, isActive: true },
    include: {
      supplier: true,
      createdBy: { select: { id: true, name: true, username: true } },
      items: {
        include: {
          item: {
            select: {
              id: true,
              name_ar: true,
              name_en: true,
              barcode: true,
              unit: true,
              costPrice: true,
              stockQty: true,
            },
          },
        },
      },
    },
  })
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createPurchaseInvoice(
  data: CreatePurchaseInvoiceInput,
  userId: string
) {
  const lines = data.items.map((line) => {
    const lineSubtotal = line.quantity * line.unitCost
    const lineTotal = lineSubtotal - lineSubtotal * (line.discount / 100)
    return { ...line, subtotal: lineTotal }
  })

  const subtotal = lines.reduce((sum, l) => sum + l.subtotal, 0)
  const invoiceDiscountAmount = subtotal * (data.discount / 100)
  const total = subtotal - invoiceDiscountAmount

  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const invoiceNumber = await generatePurchaseNumberInTx(tx)
        return tx.purchaseInvoice.create({
          data: {
            invoiceNumber,
            supplierId: data.supplierId,
            currency: data.currency,
            exchangeRate: new Prisma.Decimal(data.exchangeRate),
            subtotal: new Prisma.Decimal(subtotal),
            discount: new Prisma.Decimal(invoiceDiscountAmount),
            total: new Prisma.Decimal(total),
            notes: data.notes ?? null,
            status: 'DRAFT',
            createdById: userId,
            items: {
              create: lines.map((line) => ({
                itemId: line.itemId,
                quantity: new Prisma.Decimal(line.quantity),
                unitCost: new Prisma.Decimal(line.unitCost),
                currency: data.currency,
                subtotal: new Prisma.Decimal(line.subtotal),
                expiryDate: line.expiryDate ? new Date(line.expiryDate) : null,
              })),
            },
          },
          include: {
            supplier: true,
            items: {
              include: {
                item: { select: { id: true, name_ar: true, name_en: true, barcode: true, unit: true } },
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
  throw new Error('Failed to generate unique purchase invoice number after retries')
}

// ─── Confirm ──────────────────────────────────────────────────────────────────

export async function confirmInvoice(invoiceId: string, userId: string) {
  const invoice = await prisma.purchaseInvoice.findFirst({
    where: { id: invoiceId, isActive: true },
    include: { items: true },
  })

  if (!invoice) {
    throw new Error('INVOICE_NOT_FOUND')
  }
  if (invoice.status !== 'DRAFT') {
    throw new Error('INVALID_STATUS')
  }

  await prisma.$transaction(
    async (tx) => {
      // Update each item: weighted average cost + stock increase
      for (const line of invoice.items) {
        const dbItem = await tx.item.findUnique({ where: { id: line.itemId } })
        if (!dbItem) throw new Error(`Item ${line.itemId} not found`)

        const oldQty = Number(dbItem.stockQty)
        const oldCost = Number(dbItem.costPrice)
        const newQty = Number(line.quantity)
        const newCost = Number(line.unitCost)
        const totalQty = oldQty + newQty
        const avgCost =
          totalQty > 0
            ? (oldQty * oldCost + newQty * newCost) / totalQty
            : newCost

        await tx.item.update({
          where: { id: line.itemId },
          data: {
            stockQty: new Prisma.Decimal(oldQty + newQty),
            costPrice: new Prisma.Decimal(avgCost),
          },
        })

        await tx.stockTransfer.create({
          data: {
            type: 'IN',
            reason: 'TRANSFER',
            itemId: line.itemId,
            quantity: line.quantity,
            notes: `فاتورة شراء: ${invoice.invoiceNumber}`,
            createdById: userId,
          },
        })
      }

      // Update supplier balance if credit invoice
      await tx.supplier.update({
        where: { id: invoice.supplierId },
        data: {
          balance: {
            increment: invoice.total,
          },
        },
      })

      await tx.purchaseInvoice.update({
        where: { id: invoiceId },
        data: {
          status: 'CONFIRMED',
          balance: invoice.total,
          amountPaid: new Prisma.Decimal(0),
        },
      })
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  )

  return getPurchaseInvoiceById(invoiceId)
}

// ─── Cancel ───────────────────────────────────────────────────────────────────

export async function cancelInvoice(invoiceId: string, userId: string) {
  const invoice = await prisma.purchaseInvoice.findFirst({
    where: { id: invoiceId, isActive: true },
    include: { items: true },
  })

  if (!invoice) {
    throw new Error('INVOICE_NOT_FOUND')
  }
  if (invoice.status === 'CANCELLED') {
    throw new Error('ALREADY_CANCELLED')
  }

  const wasConfirmed = invoice.status === 'CONFIRMED'

  await prisma.$transaction(
    async (tx) => {
      if (wasConfirmed) {
        // Reverse stock changes
        for (const line of invoice.items) {
          const dbItem = await tx.item.findUnique({ where: { id: line.itemId } })
          if (!dbItem) continue

          const currentQty = Number(dbItem.stockQty)
          const reversedQty = Number(line.quantity)
          const newQty = Math.max(0, currentQty - reversedQty)

          await tx.item.update({
            where: { id: line.itemId },
            data: {
              stockQty: new Prisma.Decimal(newQty),
              // Best effort: do not undo weighted average cost
            },
          })

          await tx.stockTransfer.create({
            data: {
              type: 'OUT',
              reason: 'ADJUSTMENT',
              itemId: line.itemId,
              quantity: line.quantity,
              notes: `إلغاء فاتورة شراء: ${invoice.invoiceNumber}`,
              createdById: userId,
            },
          })
        }

        // Reverse supplier balance
        await tx.supplier.update({
          where: { id: invoice.supplierId },
          data: {
            balance: {
              decrement: invoice.total,
            },
          },
        })
      }

      await tx.purchaseInvoice.update({
        where: { id: invoiceId },
        data: {
          status: 'CANCELLED',
          ...(wasConfirmed ? { balance: new Prisma.Decimal(0) } : {}),
        },
      })
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  )

  return getPurchaseInvoiceById(invoiceId)
}
