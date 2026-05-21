import { PrismaClient } from '@ims-pro/db'

const prisma = new PrismaClient()

// ─── Types ────────────────────────────────────────────────────────────────────

interface DayData {
  openingBalanceIQD: number
  openingBalanceUSD: number
  cashSalesIQD: number
  cashSalesUSD: number
  creditSales: number
  receipts: number
  disbursements: number
  expenses: number
  closingBalanceIQD: number
  closingBalanceUSD: number
}

interface StatementResult extends DayData {
  isClosed: boolean
  date: string
  id?: string
  notes?: string | null
}

// ─── Raw query result types ───────────────────────────────────────────────────

interface RawSalesRow {
  total_sum: string | null
}

interface RawVoucherRow {
  total_iqd: string | null
}

interface RawExpenseRow {
  total_iqd: string | null
}

// ─── calculateDayData ─────────────────────────────────────────────────────────

export async function calculateDayData(date: Date): Promise<DayData> {
  const dayStart = new Date(date)
  dayStart.setHours(0, 0, 0, 0)

  const dayEnd = new Date(date)
  dayEnd.setHours(23, 59, 59, 999)

  const previousDay = new Date(date)
  previousDay.setDate(date.getDate() - 1)
  previousDay.setHours(0, 0, 0, 0)

  // Opening balances from previous day's closed statement
  const prevStatement = await prisma.cashStatement.findFirst({
    where: {
      date: {
        gte: previousDay,
        lt: dayStart,
      },
    },
  })

  const openingBalanceIQD = prevStatement ? Number(prevStatement.closingBalanceIQD) : 0
  const openingBalanceUSD = prevStatement ? Number(prevStatement.closingBalanceUSD) : 0

  // Cash sales IQD
  const cashSalesIQDRows = await prisma.$queryRaw<RawSalesRow[]>`
    SELECT COALESCE(SUM(total), 0)::text AS total_sum
    FROM "SalesInvoice"
    WHERE type = 'CASH'
      AND currency = 'IQD'
      AND status = 'CONFIRMED'
      AND "createdAt" >= ${dayStart}
      AND "createdAt" <= ${dayEnd}
  `
  const cashSalesIQD = Number(cashSalesIQDRows[0]?.total_sum ?? 0)

  // Cash sales USD
  const cashSalesUSDRows = await prisma.$queryRaw<RawSalesRow[]>`
    SELECT COALESCE(SUM(total), 0)::text AS total_sum
    FROM "SalesInvoice"
    WHERE type = 'CASH'
      AND currency = 'USD'
      AND status = 'CONFIRMED'
      AND "createdAt" >= ${dayStart}
      AND "createdAt" <= ${dayEnd}
  `
  const cashSalesUSD = Number(cashSalesUSDRows[0]?.total_sum ?? 0)

  // Credit sales (all currencies converted to IQD)
  const creditSalesRows = await prisma.$queryRaw<RawSalesRow[]>`
    SELECT COALESCE(
      SUM(
        CASE
          WHEN currency = 'USD' THEN total * "exchangeRate"
          ELSE total
        END
      ),
      0
    )::text AS total_sum
    FROM "SalesInvoice"
    WHERE type = 'CREDIT'
      AND status = 'CONFIRMED'
      AND "createdAt" >= ${dayStart}
      AND "createdAt" <= ${dayEnd}
  `
  const creditSales = Number(creditSalesRows[0]?.total_sum ?? 0)

  // Receipts (RECEIPT vouchers → IQD equivalent)
  const receiptsRows = await prisma.$queryRaw<RawVoucherRow[]>`
    SELECT COALESCE(
      SUM(
        CASE
          WHEN currency = 'USD' THEN amount * "exchangeRate"
          ELSE amount
        END
      ),
      0
    )::text AS total_iqd
    FROM "PaymentVoucher"
    WHERE type = 'RECEIPT'
      AND "createdAt" >= ${dayStart}
      AND "createdAt" <= ${dayEnd}
  `
  const receipts = Number(receiptsRows[0]?.total_iqd ?? 0)

  // Disbursements (DISBURSEMENT vouchers → IQD equivalent)
  const disbursementsRows = await prisma.$queryRaw<RawVoucherRow[]>`
    SELECT COALESCE(
      SUM(
        CASE
          WHEN currency = 'USD' THEN amount * "exchangeRate"
          ELSE amount
        END
      ),
      0
    )::text AS total_iqd
    FROM "PaymentVoucher"
    WHERE type = 'DISBURSEMENT'
      AND "createdAt" >= ${dayStart}
      AND "createdAt" <= ${dayEnd}
  `
  const disbursements = Number(disbursementsRows[0]?.total_iqd ?? 0)

  // Expenses — use stored exchangeRate on each expense record
  const expensesRows = await prisma.$queryRaw<RawExpenseRow[]>`
    SELECT COALESCE(
      SUM(
        CASE
          WHEN currency = 'USD' THEN amount * "exchangeRate"
          ELSE amount
        END
      ),
      0
    )::text AS total_iqd
    FROM "Expense"
    WHERE "isActive" = true
      AND date >= ${dayStart}
      AND date <= ${dayEnd}
  `
  const expenses = Number(expensesRows[0]?.total_iqd ?? 0)

  // Closing balances
  const closingBalanceIQD = openingBalanceIQD + cashSalesIQD + receipts - disbursements - expenses
  const closingBalanceUSD = openingBalanceUSD + cashSalesUSD

  return {
    openingBalanceIQD,
    openingBalanceUSD,
    cashSalesIQD,
    cashSalesUSD,
    creditSales,
    receipts,
    disbursements,
    expenses,
    closingBalanceIQD,
    closingBalanceUSD,
  }
}

// ─── getTodayStatement ────────────────────────────────────────────────────────

export async function getTodayStatement(): Promise<StatementResult> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const saved = await prisma.cashStatement.findFirst({
    where: {
      date: {
        gte: today,
        lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      },
    },
  })

  if (saved && saved.isClosed) {
    return {
      id: saved.id,
      isClosed: true,
      date: today.toISOString().slice(0, 10),
      openingBalanceIQD: Number(saved.openingBalanceIQD),
      openingBalanceUSD: Number(saved.openingBalanceUSD),
      cashSalesIQD: Number(saved.cashSalesIQD),
      cashSalesUSD: Number(saved.cashSalesUSD),
      creditSales: Number(saved.creditSales),
      receipts: Number(saved.receipts),
      disbursements: Number(saved.disbursements),
      expenses: Number(saved.expenses),
      closingBalanceIQD: Number(saved.closingBalanceIQD),
      closingBalanceUSD: Number(saved.closingBalanceUSD),
      notes: saved.notes,
    }
  }

  const calculated = await calculateDayData(today)
  return {
    isClosed: false,
    date: today.toISOString().slice(0, 10),
    ...calculated,
  }
}

// ─── getStatementByDate ───────────────────────────────────────────────────────

export async function getStatementByDate(dateStr: string): Promise<StatementResult> {
  const parsed = new Date(dateStr)
  parsed.setHours(0, 0, 0, 0)
  const dayEnd = new Date(parsed.getTime() + 24 * 60 * 60 * 1000)

  const saved = await prisma.cashStatement.findFirst({
    where: {
      date: {
        gte: parsed,
        lt: dayEnd,
      },
    },
  })

  if (saved) {
    return {
      id: saved.id,
      isClosed: saved.isClosed,
      date: dateStr,
      openingBalanceIQD: Number(saved.openingBalanceIQD),
      openingBalanceUSD: Number(saved.openingBalanceUSD),
      cashSalesIQD: Number(saved.cashSalesIQD),
      cashSalesUSD: Number(saved.cashSalesUSD),
      creditSales: Number(saved.creditSales),
      receipts: Number(saved.receipts),
      disbursements: Number(saved.disbursements),
      expenses: Number(saved.expenses),
      closingBalanceIQD: Number(saved.closingBalanceIQD),
      closingBalanceUSD: Number(saved.closingBalanceUSD),
      notes: saved.notes,
    }
  }

  const calculated = await calculateDayData(parsed)
  return {
    isClosed: false,
    date: dateStr,
    ...calculated,
  }
}

// ─── closeStatement ───────────────────────────────────────────────────────────

export async function closeStatement(notes?: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const calculated = await calculateDayData(today)

  const saved = await prisma.cashStatement.upsert({
    where: { date: today },
    create: {
      date: today,
      openingBalanceIQD: calculated.openingBalanceIQD,
      openingBalanceUSD: calculated.openingBalanceUSD,
      cashSalesIQD: calculated.cashSalesIQD,
      cashSalesUSD: calculated.cashSalesUSD,
      creditSales: calculated.creditSales,
      receipts: calculated.receipts,
      disbursements: calculated.disbursements,
      expenses: calculated.expenses,
      closingBalanceIQD: calculated.closingBalanceIQD,
      closingBalanceUSD: calculated.closingBalanceUSD,
      isClosed: true,
      notes: notes ?? null,
    },
    update: {
      openingBalanceIQD: calculated.openingBalanceIQD,
      openingBalanceUSD: calculated.openingBalanceUSD,
      cashSalesIQD: calculated.cashSalesIQD,
      cashSalesUSD: calculated.cashSalesUSD,
      creditSales: calculated.creditSales,
      receipts: calculated.receipts,
      disbursements: calculated.disbursements,
      expenses: calculated.expenses,
      closingBalanceIQD: calculated.closingBalanceIQD,
      closingBalanceUSD: calculated.closingBalanceUSD,
      isClosed: true,
      notes: notes ?? null,
    },
  })

  return {
    id: saved.id,
    isClosed: saved.isClosed,
    date: today.toISOString().slice(0, 10),
    openingBalanceIQD: Number(saved.openingBalanceIQD),
    openingBalanceUSD: Number(saved.openingBalanceUSD),
    cashSalesIQD: Number(saved.cashSalesIQD),
    cashSalesUSD: Number(saved.cashSalesUSD),
    creditSales: Number(saved.creditSales),
    receipts: Number(saved.receipts),
    disbursements: Number(saved.disbursements),
    expenses: Number(saved.expenses),
    closingBalanceIQD: Number(saved.closingBalanceIQD),
    closingBalanceUSD: Number(saved.closingBalanceUSD),
    notes: saved.notes,
  }
}

// ─── getStatementRange ────────────────────────────────────────────────────────

export async function getStatementRange(from: string, to: string) {
  return prisma.cashStatement.findMany({
    where: {
      date: {
        gte: new Date(from),
        lte: new Date(to),
      },
    },
    orderBy: { date: 'desc' },
  })
}
