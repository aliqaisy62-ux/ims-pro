import { Router } from 'express'
import { verifyToken } from '../middleware/auth'
import { requireRole } from '../middleware/requireRole'
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listExpenses,
  getExpense,
  createExpenseHandler,
  updateExpenseHandler,
  removeExpense,
  expenseSummary,
} from '../controllers/expense.controller'

// ─── Category router ──────────────────────────────────────────────────────────
export const expenseCategoryRouter = Router()
expenseCategoryRouter.use(verifyToken)
expenseCategoryRouter.get('/', listCategories)
expenseCategoryRouter.post('/', requireRole('MANAGER', 'ADMIN'), createCategory)
expenseCategoryRouter.put('/:id', requireRole('MANAGER', 'ADMIN'), updateCategory)
expenseCategoryRouter.delete('/:id', requireRole('ADMIN'), deleteCategory)

// ─── Expense router ───────────────────────────────────────────────────────────
// IMPORTANT: /summary MUST be declared before /:id
export const expenseRouter = Router()
expenseRouter.use(verifyToken)
expenseRouter.get('/summary', expenseSummary)
expenseRouter.get('/', listExpenses)
expenseRouter.get('/:id', getExpense)
expenseRouter.post('/', requireRole('MANAGER', 'ADMIN'), createExpenseHandler)
expenseRouter.put('/:id', requireRole('MANAGER', 'ADMIN'), updateExpenseHandler)
expenseRouter.delete('/:id', requireRole('ADMIN'), removeExpense)
