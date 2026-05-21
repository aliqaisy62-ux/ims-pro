import { z } from 'zod'

export const createExpenseCategorySchema = z.object({
  nameAr: z.string().min(1).max(100),
  nameEn: z.string().min(1).max(100),
})
export const updateExpenseCategorySchema = createExpenseCategorySchema.partial()

export const createExpenseSchema = z.object({
  categoryId: z.string().cuid(),
  amount: z.number().positive(),
  currency: z.enum(['USD', 'IQD']),
  description: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})
export const updateExpenseSchema = createExpenseSchema.partial()

export type CreateExpenseCategoryInput = z.infer<typeof createExpenseCategorySchema>
export type UpdateExpenseCategoryInput = z.infer<typeof updateExpenseCategorySchema>
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>
