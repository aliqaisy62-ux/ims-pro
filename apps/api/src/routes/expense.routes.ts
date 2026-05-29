import { Router } from 'express'
import { verifyToken, requireFullAccess } from '../middleware/auth'
import { requirePermission, Permission } from '../middleware/requirePermission'
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
expenseCategoryRouter.use(requireFullAccess)
expenseCategoryRouter.get('/',    requirePermission(Permission.EXPENSES_VIEW),   listCategories)
expenseCategoryRouter.post('/',   requirePermission(Permission.EXPENSES_CREATE),  createCategory)
expenseCategoryRouter.put('/:id', requirePermission(Permission.EXPENSES_CREATE),  updateCategory)
expenseCategoryRouter.delete('/:id', requireRole('ADMIN'), deleteCategory)

// ─── Expense router ───────────────────────────────────────────────────────────
// IMPORTANT: /summary MUST be declared before /:id
export const expenseRouter = Router()
expenseRouter.use(verifyToken)
expenseRouter.use(requireFullAccess)
expenseRouter.get('/summary', requirePermission(Permission.EXPENSES_VIEW),   expenseSummary)
expenseRouter.get('/',        requirePermission(Permission.EXPENSES_VIEW),   listExpenses)
expenseRouter.get('/:id',     requirePermission(Permission.EXPENSES_VIEW),   getExpense)
expenseRouter.post('/',       requirePermission(Permission.EXPENSES_CREATE),  createExpenseHandler)
expenseRouter.put('/:id',     requirePermission(Permission.EXPENSES_CREATE),  updateExpenseHandler)
expenseRouter.delete('/:id',  requireRole('ADMIN'), removeExpense)
