import { z } from 'zod'

export const salesLineSchema = z.object({
  itemId: z.string().cuid(),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  discount: z.number().min(0).max(100).default(0),
})

export const createSalesInvoiceSchema = z.object({
  customerId: z.string().cuid().optional().nullable(),
  priceType: z.enum(['RETAIL', 'WHOLESALE', 'SPECIAL', 'DOLLAR', 'DINAR']),
  paymentType: z.enum(['CASH', 'CREDIT']),
  currency: z.enum(['USD', 'IQD']),
  exchangeRate: z.number().positive(),
  discount: z.number().min(0).max(100).default(0),
  notes: z.string().optional(),
  items: z.array(salesLineSchema).min(1),
})

export const updateSalesInvoiceSchema = createSalesInvoiceSchema.partial()

export type CreateSalesInvoiceInput = z.infer<typeof createSalesInvoiceSchema>
export type UpdateSalesInvoiceInput = z.infer<typeof updateSalesInvoiceSchema>
export type SalesLineInput = z.infer<typeof salesLineSchema>
