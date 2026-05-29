import { z } from 'zod'

export const purchaseLineSchema = z.object({
  itemId: z.string().cuid(),
  quantity: z.number().positive(),
  unitCost: z.number().nonnegative(),
  discount: z.number().min(0).max(100).default(0),
  expiryDate: z.string().optional().nullable(),
})

export const createPurchaseInvoiceSchema = z.object({
  supplierId: z.string().cuid(),
  currency: z.enum(['USD', 'IQD']),
  exchangeRate: z.number().positive(),
  discount: z.number().min(0).max(100).default(0),
  notes: z.string().optional().nullable(),
  items: z.array(purchaseLineSchema).min(1),
})

export const updatePurchaseInvoiceSchema = createPurchaseInvoiceSchema.partial()

export type PurchaseLineInput = z.infer<typeof purchaseLineSchema>
export type CreatePurchaseInvoiceInput = z.infer<typeof createPurchaseInvoiceSchema>
export type UpdatePurchaseInvoiceInput = z.infer<typeof updatePurchaseInvoiceSchema>
