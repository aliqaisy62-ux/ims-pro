import { z } from 'zod'

export const updateSettingsSchema = z.object({
  business_name_ar: z.string().min(1).optional(),
  business_name_en: z.string().min(1).optional(),
  default_currency: z.enum(['IQD', 'USD']).optional(),
  default_price_type: z.enum(['RETAIL', 'WHOLESALE', 'SPECIAL', 'DOLLAR', 'DINAR']).optional(),
  tax_rate: z.string().optional(),
  paper_width: z.enum(['58', '80']).optional(),
  minimum_stock_alert: z.enum(['true', 'false']).optional(),
})

export const updateExchangeRateSchema = z.object({
  rate: z.number().positive().min(1),
})

const ALL_ROLES = ['ADMIN', 'MANAGER', 'CASHIER', 'VIEWER', 'ACCOUNTANT', 'STAFF'] as const

export const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(6),
  role: z.enum(ALL_ROLES),
  language: z.enum(['ar', 'en']).default('ar'),
})

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  role: z.enum(ALL_ROLES).optional(),
  language: z.enum(['ar', 'en']).optional(),
  isActive: z.boolean().optional(),
})

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(6),
})

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>
export type UpdateExchangeRateInput = z.infer<typeof updateExchangeRateSchema>
export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
