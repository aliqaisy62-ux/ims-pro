import { z } from 'zod'

export const posCheckoutSchema = z.object({
  items: z
    .array(
      z.object({
        itemId: z.string().min(1),
        quantity: z.number().int().positive(),
      })
    )
    .min(1, 'Cart must contain at least one item'),
  priceType: z
    .enum(['RETAIL', 'WHOLESALE', 'SPECIAL', 'DOLLAR', 'DINAR'])
    .default('RETAIL'),
  currency: z.enum(['IQD', 'USD']).default('IQD'),
  exchangeRate: z.number().positive().default(1480),
  paymentMethod: z.enum(['CASH', 'CREDIT']).default('CASH'),
  customerId: z.string().optional().nullable(),
  amountPaid: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
})

export type PosCheckoutInput = z.infer<typeof posCheckoutSchema>
