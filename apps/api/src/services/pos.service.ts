import { PrismaClient, Prisma } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { PosCheckoutInput } from '../validators/pos.validator'

const prisma = new PrismaClient()

// ─── Price field selectors ─────────────────────────────────────────────────────
type PricedItem = {
  retailPrice: Decimal
  wholesalePrice: Decimal
  specialPrice: Decimal
  dollarPrice: Decimal
  dinarPrice: Decimal
}

const PRICE_GETTER: Record<string, (item: PricedItem) => Decimal> = {
  RETAIL:    (i) => i.retailPrice,
  WHOLESALE: (i) => i.wholesalePrice,
  SPECIAL:   (i) => i.specialPrice,
  DOLLAR:    (i) => i.dollarPrice,
  DINAR:     (i) => i.dinarPrice,
}

// ─── Invoice number generator (mirrors sales.service — runs inside a tx) ───────
async function generateInvoiceNumber(tx: Prisma.TransactionClient): Promise<string> {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const prefix = `INV-${dateStr}-`
  const startPos = prefix.length + 1
  const rows = await tx.$queryRaw<{ max_num: number | null }[]>`
    SELECT MAX(CAST(SUBSTR("invoiceNumber", ${startPos}) AS INTEGER)) AS max_num
    FROM "SalesInvoice"
    WHERE "invoiceNumber" LIKE ${prefix + '%'}
  `
  const maxNum = rows[0]?.max_num ? Number(rows[0].max_num) : 0
  return `${prefix}${String(maxNum + 1).padStart(4, '0')}`
}

// ─── POS Checkout ──────────────────────────────────────────────────────────────
/**
 * Atomic single-step checkout:
 *  1. Fetch current prices from DB (client prices are never trusted)
 *  2. Validate stock availability
 *  3. Create SalesInvoice with status CONFIRMED (skip DRAFT) + SalesInvoiceItems
 *  4. Decrement stock + create StockTransfer records
 *  5. Update customer balance if CREDIT
 *
 * Uses Serializable isolation to prevent concurrent oversell.
 * Retries up to 5 times on unique-constraint / serialization failures.
 */
export async function posCheckout(input: PosCheckoutInput, cashierId: string) {
  const { items, priceType, currency, exchangeRate, paymentMethod, customerId, amountPaid, notes } = input

  if (paymentMethod === 'CREDIT' && !customerId) {
    throw new Error('CREDIT_REQUIRES_CUSTOMER')
  }

  const getPrice = PRICE_GETTER[priceType]

  // Fetch all items in one query
  const itemIds = items.map((i) => i.itemId)
  const dbItems = await prisma.item.findMany({
    where: { id: { in: itemIds }, isActive: true },
    select: {
      id: true,
      name_ar: true,
      name_en: true,
      barcode: true,
      stockQty: true,
      retailPrice: true,
      wholesalePrice: true,
      specialPrice: true,
      dollarPrice: true,
      dinarPrice: true,
    },
  })

  const missing = itemIds.filter((id) => !dbItems.find((d) => d.id === id))
  if (missing.length > 0) throw new Error('ITEM_NOT_FOUND')

  // Build line items with server-side prices
  const lineItems = items.map((req) => {
    const db = dbItems.find((d) => d.id === req.itemId)!
    const unitPrice = new Decimal(getPrice(db).toString())
    const qty = new Decimal(req.quantity)
    return { itemId: req.itemId, quantity: qty, unitPrice, subtotal: qty.mul(unitPrice), currency, db }
  })

  const subtotal = lineItems.reduce((acc, l) => acc.plus(l.subtotal), new Decimal(0))
  const total = subtotal

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          // Re-validate stock inside the transaction (row-level lock via UPDATE)
          for (const line of lineItems) {
            const row = await tx.item.findUnique({
              where: { id: line.itemId },
              select: { stockQty: true, name_ar: true },
            })
            if (!row) throw new Error(`ITEM_NOT_FOUND:${line.itemId}`)
            if (new Decimal(row.stockQty.toString()).lt(line.quantity)) {
              throw new Error(`INSUFFICIENT_STOCK:${row.name_ar}`)
            }
          }

          const invoiceNumber = await generateInvoiceNumber(tx)
          const paid =
            paymentMethod === 'CASH'
              ? new Decimal(amountPaid != null ? amountPaid : total.toString())
              : new Decimal(0)
          const balance = paymentMethod === 'CASH' ? new Decimal(0) : total

          const invoice = await tx.salesInvoice.create({
            data: {
              invoiceNumber,
              customerId: customerId ?? null,
              type: paymentMethod,
              priceType,
              currency,
              exchangeRate: new Decimal(exchangeRate),
              subtotal,
              discount: 0,
              tax: 0,
              total,
              amountPaid: paid,
              balance,
              notes: notes ?? null,
              status: 'CONFIRMED',
              createdById: cashierId,
              items: {
                create: lineItems.map((l) => ({
                  itemId: l.itemId,
                  quantity: l.quantity,
                  unitPrice: l.unitPrice,
                  subtotal: l.subtotal,
                  currency: l.currency,
                })),
              },
            },
            include: {
              items: {
                include: {
                  item: { select: { id: true, name_ar: true, name_en: true, barcode: true } },
                },
              },
            },
          })

          // Decrement stock + audit trail
          for (const line of lineItems) {
            await tx.item.update({
              where: { id: line.itemId },
              data: { stockQty: { decrement: line.quantity.toNumber() } },
            })
            await tx.stockTransfer.create({
              data: {
                itemId: line.itemId,
                type: 'OUT',
                reason: 'TRANSFER',
                quantity: line.quantity,
                notes: `POS: ${invoice.invoiceNumber}`,
                createdById: cashierId,
              },
            })
          }

          // Update customer balance for credit sales
          if (paymentMethod === 'CREDIT' && customerId) {
            await tx.customer.update({
              where: { id: customerId },
              data: { balance: { increment: total.toNumber() } },
            })
          }

          return invoice
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      )
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code
      if ((code === 'P2002' || code === 'P2034') && attempt < 4) {
        await new Promise((r) => setTimeout(r, Math.random() * 40 + 10))
        continue
      }
      throw e
    }
  }

  throw new Error('Failed to complete checkout after retries')
}
