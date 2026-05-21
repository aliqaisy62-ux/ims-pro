import { PrismaClient } from '@prisma/client'
import { CreateExpenseInput, UpdateExpenseInput } from '../validators/expense.validator'

const prisma = new PrismaClient()

// ─── Category functions ───────────────────────────────────────────────────────

export async function getExpenseCategories() {
  return prisma.expenseCategory.findMany({
    orderBy: { name_ar: 'asc' },
  })
}

export async function createExpenseCategory(data: { nameAr: string; nameEn: string }) {
  return prisma.expenseCategory.create({
    data: {
      name_ar: data.nameAr,
      name_en: data.nameEn,
    },
  })
}

export async function updateExpenseCategory(
  id: string,
  data: Partial<{ nameAr: string; nameEn: string }>
) {
  const updateData: Record<string, string> = {}
  if (data.nameAr !== undefined) updateData.name_ar = data.nameAr
  if (data.nameEn !== undefined) updateData.name_en = data.nameEn
  return prisma.expenseCategory.update({
    where: { id },
    data: updateData,
  })
}

export async function softDeleteExpenseCategory(id: string): Promise<void> {
  const count = await prisma.expense.count({
    where: { categoryId: id, isActive: true },
  })
  if (count > 0) {
    throw new Error('CATEGORY_IN_USE')
  }
  // No isActive on ExpenseCategory in schema — perform hard delete when safe
  await prisma.expenseCategory.delete({ where: { id } })
}

// ─── Expense functions ────────────────────────────────────────────────────────

export async function getExpenses(params: {
  page?: number
  limit?: number
  categoryId?: string
  from?: string
  to?: string
  month?: string
}) {
  const { page = 1, limit = 20, categoryId, month } = params
  let { from, to } = params

  if (month) {
    const [year, mon] = month.split('-').map(Number)
    const firstDay = new Date(year, mon - 1, 1)
    const lastDay = new Date(year, mon, 0, 23, 59, 59, 999)
    from = firstDay.toISOString()
    to = lastDay.toISOString()
  }

  const where: Record<string, unknown> = { isActive: true }
  if (categoryId) where.categoryId = categoryId
  if (from || to) {
    const dateFilter: Record<string, Date> = {}
    if (from) dateFilter.gte = new Date(from)
    if (to) dateFilter.lte = new Date(to)
    where.date = dateFilter
  }

  const skip = (page - 1) * limit

  const [data, total] = await Promise.all([
    prisma.expense.findMany({
      where: where as Parameters<typeof prisma.expense.findMany>[0]['where'],
      skip,
      take: limit,
      orderBy: { date: 'desc' },
      include: {
        category: true,
      },
    }),
    prisma.expense.count({
      where: where as Parameters<typeof prisma.expense.count>[0]['where'],
    }),
  ])

  return { data, total }
}

export async function getExpenseById(id: string) {
  return prisma.expense.findFirst({
    where: { id, isActive: true },
    include: {
      category: true,
      createdBy: {
        select: { id: true, name: true, username: true },
      },
    },
  })
}

export async function createExpense(data: CreateExpenseInput, userId: string) {
  return prisma.expense.create({
    data: {
      categoryId: data.categoryId,
      amount: data.amount,
      currency: data.currency,
      description: data.description ?? '',
      date: new Date(data.date),
      createdById: userId,
    },
    include: { category: true },
  })
}

export async function updateExpense(id: string, data: UpdateExpenseInput) {
  const updateData: Record<string, unknown> = {}
  if (data.categoryId !== undefined) updateData.categoryId = data.categoryId
  if (data.amount !== undefined) updateData.amount = data.amount
  if (data.currency !== undefined) updateData.currency = data.currency
  if (data.description !== undefined) updateData.description = data.description
  if (data.date !== undefined) updateData.date = new Date(data.date)

  return prisma.expense.update({
    where: { id },
    data: updateData,
    include: { category: true },
  })
}

export async function deleteExpense(id: string): Promise<void> {
  await prisma.expense.update({
    where: { id },
    data: { isActive: false },
  })
}

export async function getExpenseSummary(
  month: string
): Promise<
  Array<{
    categoryId: string
    categoryNameAr: string
    categoryNameEn: string
    totalIQD: number
    count: number
  }>
> {
  const [year, mon] = month.split('-').map(Number)
  const firstDay = new Date(year, mon - 1, 1)
  const lastDay = new Date(year, mon, 0, 23, 59, 59, 999)

  const expenses = await prisma.expense.findMany({
    where: {
      isActive: true,
      date: { gte: firstDay, lte: lastDay },
    },
    include: { category: true },
  })

  const grouped: Record<
    string,
    {
      categoryId: string
      categoryNameAr: string
      categoryNameEn: string
      totalIQD: number
      count: number
    }
  > = {}

  for (const expense of expenses) {
    const { categoryId } = expense
    const amountNum = Number(expense.amount)
    // exchangeRate not in actual schema — treat IQD as-is, USD amounts stored as IQD equivalent
    // For USD expenses we store in the amount field directly; no exchangeRate field in real schema
    const amountIQD = expense.currency === 'USD' ? amountNum * 1480 : amountNum

    if (!grouped[categoryId]) {
      grouped[categoryId] = {
        categoryId,
        categoryNameAr: expense.category.name_ar,
        categoryNameEn: expense.category.name_en,
        totalIQD: 0,
        count: 0,
      }
    }
    grouped[categoryId].totalIQD += amountIQD
    grouped[categoryId].count += 1
  }

  return Object.values(grouped).sort((a, b) => b.totalIQD - a.totalIQD)
}
