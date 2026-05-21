import { Request, Response } from 'express'
import {
  createExpenseCategorySchema,
  updateExpenseCategorySchema,
  createExpenseSchema,
  updateExpenseSchema,
} from '../validators/expense.validator'
import {
  getExpenseCategories,
  createExpenseCategory,
  updateExpenseCategory,
  softDeleteExpenseCategory,
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseSummary,
} from '../services/expense.service'

// ─── Category handlers ────────────────────────────────────────────────────────

export async function listCategories(req: Request, res: Response) {
  try {
    const categories = await getExpenseCategories()
    res.json({ success: true, data: categories })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch expense categories' })
  }
}

export async function createCategory(req: Request, res: Response) {
  try {
    const result = createExpenseCategorySchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      })
    }
    const category = await createExpenseCategory(result.data)
    res.status(201).json({ success: true, data: category })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to create expense category' })
  }
}

export async function updateCategory(req: Request, res: Response) {
  try {
    const result = updateExpenseCategorySchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      })
    }
    const category = await updateExpenseCategory(req.params.id, result.data)
    res.json({ success: true, data: category })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to update expense category' })
  }
}

export async function deleteCategory(req: Request, res: Response) {
  try {
    await softDeleteExpenseCategory(req.params.id)
    res.json({ success: true })
  } catch (err) {
    if (err instanceof Error && err.message === 'CATEGORY_IN_USE') {
      return res.status(400).json({ success: false, error: 'لا يمكن حذف الفئة لوجود مصاريف مرتبطة بها' })
    }
    res.status(500).json({ success: false, error: 'Failed to delete expense category' })
  }
}

// ─── Expense handlers ─────────────────────────────────────────────────────────

export async function listExpenses(req: Request, res: Response) {
  try {
    const { page, limit, categoryId, from, to, month } = req.query
    const result = await getExpenses({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      categoryId: categoryId as string | undefined,
      from: from as string | undefined,
      to: to as string | undefined,
      month: month as string | undefined,
    })
    res.json({ success: true, data: result })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch expenses' })
  }
}

export async function getExpense(req: Request, res: Response) {
  try {
    const expense = await getExpenseById(req.params.id)
    if (!expense) return res.status(404).json({ success: false, error: 'Expense not found' })
    res.json({ success: true, data: expense })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch expense' })
  }
}

export async function createExpenseHandler(req: Request, res: Response) {
  try {
    const result = createExpenseSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      })
    }
    const expense = await createExpense(result.data, req.user!.id)
    res.status(201).json({ success: true, data: expense })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to create expense' })
  }
}

export async function updateExpenseHandler(req: Request, res: Response) {
  try {
    const result = updateExpenseSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      })
    }
    const expense = await updateExpense(req.params.id, result.data)
    res.json({ success: true, data: expense })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to update expense' })
  }
}

export async function removeExpense(req: Request, res: Response) {
  try {
    await deleteExpense(req.params.id)
    res.json({ success: true })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to delete expense' })
  }
}

export async function expenseSummary(req: Request, res: Response) {
  try {
    const month = (req.query.month as string) || new Date().toISOString().slice(0, 7)
    const data = await getExpenseSummary(month)
    res.json({ success: true, data })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch expense summary' })
  }
}
