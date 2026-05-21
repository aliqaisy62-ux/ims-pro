import { PrismaClient } from '@ims-pro/db'

const prisma = new PrismaClient()

// ─── Date helpers ──────────────────────────────────────────────────────────────

function startOfDay(dateStr: string): Date {
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(dateStr: string): Date {
  const d = new Date(dateStr)
  d.setHours(23, 59, 59, 999)
  return d
}

// ─── Sales Report ──────────────────────────────────────────────────────────────

export async function getSalesReport(params: {
  from: string
  to: string
  customerId?: string
  status?: string
}) {
  const { from, to, customerId, status } = params

  const where: Record<string, unknown> = {
    isActive: true,
    status: status ?? 'CONFIRMED',
    createdAt: {
      gte: startOfDay(from),
      lte: endOfDay(to),
    },
  }

  if (customerId) where.customerId = customerId

  const invoices = await prisma.salesInvoice.findMany({
    where: where as Parameters<typeof prisma.salesInvoice.findMany>[0]['where'],
    orderBy: { createdAt: 'desc' },
    include: {
      customer: { select: { id: true, name: true } },
      _count: { select: { items: true } },
    },
  })

  let cashSalesIQD = 0
  let cashSalesUSD = 0
  let creditSalesIQD = 0
  let creditSalesUSD = 0
  let totalIQD = 0

  for (const inv of invoices) {
    const total = Number(inv.total)
    const totalInIQD = inv.currency === 'USD' ? total * Number(inv.exchangeRate) : total
    totalIQD += totalInIQD

    if (inv.type === 'CASH') {
      if (inv.currency === 'IQD') cashSalesIQD += total
      else cashSalesUSD += total
    } else {
      if (inv.currency === 'IQD') creditSalesIQD += total
      else creditSalesUSD += total
    }
  }

  return {
    invoices,
    summary: {
      totalInvoices: invoices.length,
      cashSalesIQD,
      cashSalesUSD,
      creditSalesIQD,
      creditSalesUSD,
      totalIQD,
    },
  }
}

// ─── Purchases Report ──────────────────────────────────────────────────────────

export async function getPurchasesReport(params: {
  from: string
  to: string
  supplierId?: string
}) {
  const { from, to, supplierId } = params

  const where: Record<string, unknown> = {
    isActive: true,
    status: 'CONFIRMED',
    createdAt: {
      gte: startOfDay(from),
      lte: endOfDay(to),
    },
  }

  if (supplierId) where.supplierId = supplierId

  const invoices = await prisma.purchaseInvoice.findMany({
    where: where as Parameters<typeof prisma.purchaseInvoice.findMany>[0]['where'],
    orderBy: { createdAt: 'desc' },
    include: {
      supplier: { select: { id: true, name: true } },
    },
  })

  let totalIQD = 0
  let totalUSD = 0

  for (const inv of invoices) {
    const total = Number(inv.total)
    if (inv.currency === 'IQD') totalIQD += total
    else totalUSD += total
  }

  return {
    invoices,
    summary: {
      totalInvoices: invoices.length,
      totalIQD,
      totalUSD,
    },
  }
}

// ─── Profit Report ─────────────────────────────────────────────────────────────

export async function getProfitReport(params: { from: string; to: string }) {
  const { from, to } = params

  // Fetch all confirmed sales invoice items in range with their items
  const salesItems = await prisma.salesInvoiceItem.findMany({
    where: {
      invoice: {
        isActive: true,
        status: 'CONFIRMED',
        createdAt: {
          gte: startOfDay(from),
          lte: endOfDay(to),
        },
      },
    },
    include: {
      item: {
        select: {
          id: true,
          name_ar: true,
          name_en: true,
          costPrice: true,
        },
      },
      invoice: {
        select: { currency: true, exchangeRate: true },
      },
    },
  })

  // Group by itemId
  const grouped: Record<
    string,
    {
      itemId: string
      nameAr: string
      nameEn: string
      quantitySold: number
      revenue: number
      costOfGoods: number
    }
  > = {}

  for (const si of salesItems) {
    const { itemId } = si
    const qty = Number(si.quantity)
    // Convert subtotal to IQD
    const subtotal = Number(si.subtotal)
    const invoiceCurrency = si.invoice.currency
    const exchangeRate = Number(si.invoice.exchangeRate)
    const revenueIQD =
      invoiceCurrency === 'USD' ? subtotal * exchangeRate : subtotal

    const costPriceIQD = Number(si.item.costPrice) // costPrice stored in IQD
    const cogForLine = qty * costPriceIQD

    if (!grouped[itemId]) {
      grouped[itemId] = {
        itemId,
        nameAr: si.item.name_ar,
        nameEn: si.item.name_en,
        quantitySold: 0,
        revenue: 0,
        costOfGoods: 0,
      }
    }
    grouped[itemId].quantitySold += qty
    grouped[itemId].revenue += revenueIQD
    grouped[itemId].costOfGoods += cogForLine
  }

  const items = Object.values(grouped).map((g) => ({
    ...g,
    grossProfit: g.revenue - g.costOfGoods,
  }))

  const totalRevenue = items.reduce((s, i) => s + i.revenue, 0)
  const totalCostOfGoods = items.reduce((s, i) => s + i.costOfGoods, 0)
  const totalGrossProfit = totalRevenue - totalCostOfGoods

  // Sum expenses in range (USD * 1480, IQD as-is)
  const expenses = await prisma.expense.findMany({
    where: {
      isActive: true,
      date: {
        gte: startOfDay(from),
        lte: endOfDay(to),
      },
    },
    select: { amount: true, currency: true, exchangeRate: true },
  })

  const totalExpenses = expenses.reduce((sum, e) => {
    const amt = Number(e.amount)
    return sum + (e.currency === 'USD' ? amt * Number(e.exchangeRate) : amt)
  }, 0)

  const netProfit = totalGrossProfit - totalExpenses

  return {
    items,
    summary: {
      totalRevenue,
      totalCostOfGoods,
      totalGrossProfit,
      totalExpenses,
      netProfit,
    },
  }
}

// ─── Inventory Report ──────────────────────────────────────────────────────────

export async function getInventoryReport() {
  const dbItems = await prisma.item.findMany({
    where: { isActive: true },
    include: {
      category: { select: { name_ar: true } },
    },
    orderBy: { name_ar: 'asc' },
  })

  const LOW_STOCK_THRESHOLD = 5

  const items = dbItems.map((item) => {
    const stockQty = Number(item.stockQty)
    const costPrice = Number(item.costPrice)
    const retailPrice = Number(item.retailPrice)
    return {
      id: item.id,
      nameAr: item.name_ar,
      nameEn: item.name_en,
      barcode: item.barcode ?? null,
      stockQty,
      costPrice,
      retailPrice,
      minimumStock: Number(item.minimumStock),
      costValue: stockQty * costPrice,
      retailValue: stockQty * retailPrice,
      category: item.category?.name_ar ?? '',
    }
  })

  const totalCostValue = items.reduce((s, i) => s + i.costValue, 0)
  const totalRetailValue = items.reduce((s, i) => s + i.retailValue, 0)
  const lowStockCount = items.filter(
    (i) => i.stockQty <= (i.minimumStock > 0 ? i.minimumStock : LOW_STOCK_THRESHOLD)
  ).length

  return {
    items,
    summary: {
      totalItems: items.length,
      totalCostValue,
      totalRetailValue,
      lowStockCount,
    },
  }
}

// ─── Customer Statement ────────────────────────────────────────────────────────

export async function getCustomerStatement(params: {
  customerId: string
  from?: string
  to?: string
}) {
  const { customerId, from, to } = params

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, isActive: true },
  })
  if (!customer) throw new Error('CUSTOMER_NOT_FOUND')

  const dateFilter: Record<string, Date> = {}
  if (from) dateFilter.gte = startOfDay(from)
  if (to) dateFilter.lte = endOfDay(to)
  const hasDateFilter = Object.keys(dateFilter).length > 0

  // CREDIT sales invoices
  const invoicesWhere: Record<string, unknown> = {
    customerId,
    type: 'CREDIT',
    status: 'CONFIRMED',
    isActive: true,
  }
  if (hasDateFilter) invoicesWhere.createdAt = dateFilter

  const salesInvoices = await prisma.salesInvoice.findMany({
    where: invoicesWhere as Parameters<typeof prisma.salesInvoice.findMany>[0]['where'],
    select: {
      id: true,
      invoiceNumber: true,
      total: true,
      currency: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  // RECEIPT vouchers for this customer
  const vouchersWhere: Record<string, unknown> = {
    type: 'RECEIPT',
    entityType: 'CUSTOMER',
    entityId: customerId,
  }
  if (hasDateFilter) vouchersWhere.createdAt = dateFilter

  const receipts = await prisma.paymentVoucher.findMany({
    where: vouchersWhere as Parameters<typeof prisma.paymentVoucher.findMany>[0]['where'],
    select: {
      id: true,
      voucherNumber: true,
      amount: true,
      currency: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  type TxRow = {
    date: string
    type: 'INVOICE' | 'RECEIPT'
    reference: string
    amount: number
    currency: string
    balanceEffect: number
  }

  const transactions: TxRow[] = [
    ...salesInvoices.map((inv): TxRow => ({
      date: inv.createdAt.toISOString(),
      type: 'INVOICE',
      reference: inv.invoiceNumber,
      amount: Number(inv.total),
      currency: inv.currency,
      balanceEffect: Number(inv.total), // increases debt
    })),
    ...receipts.map((v): TxRow => ({
      date: v.createdAt.toISOString(),
      type: 'RECEIPT',
      reference: v.voucherNumber,
      amount: Number(v.amount),
      currency: v.currency,
      balanceEffect: -Number(v.amount), // decreases debt
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const totalInvoiced = salesInvoices.reduce((s, i) => s + Number(i.total), 0)
  const totalPaid = receipts.reduce((s, v) => s + Number(v.amount), 0)
  const currentBalance = Number(customer.balance)

  return {
    customer,
    transactions,
    summary: {
      totalInvoiced,
      totalPaid,
      currentBalance,
    },
  }
}

// ─── Supplier Statement ────────────────────────────────────────────────────────

export async function getSupplierStatement(params: {
  supplierId: string
  from?: string
  to?: string
}) {
  const { supplierId, from, to } = params

  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, isActive: true },
  })
  if (!supplier) throw new Error('SUPPLIER_NOT_FOUND')

  const dateFilter: Record<string, Date> = {}
  if (from) dateFilter.gte = startOfDay(from)
  if (to) dateFilter.lte = endOfDay(to)
  const hasDateFilter = Object.keys(dateFilter).length > 0

  // Confirmed purchase invoices
  const purchasesWhere: Record<string, unknown> = {
    supplierId,
    status: 'CONFIRMED',
    isActive: true,
  }
  if (hasDateFilter) purchasesWhere.createdAt = dateFilter

  const purchaseInvoices = await prisma.purchaseInvoice.findMany({
    where: purchasesWhere as Parameters<typeof prisma.purchaseInvoice.findMany>[0]['where'],
    select: {
      id: true,
      invoiceNumber: true,
      total: true,
      currency: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  // DISBURSEMENT vouchers for this supplier
  const vouchersWhere: Record<string, unknown> = {
    type: 'DISBURSEMENT',
    entityType: 'SUPPLIER',
    entityId: supplierId,
  }
  if (hasDateFilter) vouchersWhere.createdAt = dateFilter

  const disbursements = await prisma.paymentVoucher.findMany({
    where: vouchersWhere as Parameters<typeof prisma.paymentVoucher.findMany>[0]['where'],
    select: {
      id: true,
      voucherNumber: true,
      amount: true,
      currency: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  type TxRow = {
    date: string
    type: 'INVOICE' | 'RECEIPT'
    reference: string
    amount: number
    currency: string
    balanceEffect: number
  }

  const transactions: TxRow[] = [
    ...purchaseInvoices.map((inv): TxRow => ({
      date: inv.createdAt.toISOString(),
      type: 'INVOICE',
      reference: inv.invoiceNumber,
      amount: Number(inv.total),
      currency: inv.currency,
      balanceEffect: Number(inv.total), // increases what we owe
    })),
    ...disbursements.map((v): TxRow => ({
      date: v.createdAt.toISOString(),
      type: 'RECEIPT',
      reference: v.voucherNumber,
      amount: Number(v.amount),
      currency: v.currency,
      balanceEffect: -Number(v.amount), // decreases what we owe
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const totalInvoiced = purchaseInvoices.reduce((s, i) => s + Number(i.total), 0)
  const totalPaid = disbursements.reduce((s, v) => s + Number(v.amount), 0)
  const currentBalance = Number(supplier.balance)

  return {
    supplier,
    transactions,
    summary: {
      totalInvoiced,
      totalPaid,
      currentBalance,
    },
  }
}
