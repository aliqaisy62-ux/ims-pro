import { z } from 'zod'

export const createItemSchema = z.object({
  barcode: z.string().optional().nullable(),
  name_ar: z.string().min(1),
  name_en: z.string().min(1),
  unit: z.string().default('piece'),
  categoryId: z.string().optional().nullable(),
  costPrice: z.number().min(0).default(0),
  retailPrice: z.number().min(0).default(0),
  wholesalePrice: z.number().min(0).default(0),
  specialPrice: z.number().min(0).default(0),
  dollarPrice: z.number().min(0).default(0),
  dinarPrice: z.number().min(0).default(0),
  stockQty: z.number().min(0).default(0),
  minimumStock: z.number().min(0).default(0),
  expiryDate: z.string().datetime().optional().nullable(),
  supplierId: z.string().optional().nullable(),
})

export const updateItemSchema = createItemSchema.partial()

export type CreateItemInput = z.infer<typeof createItemSchema>
export type UpdateItemInput = z.infer<typeof updateItemSchema>
