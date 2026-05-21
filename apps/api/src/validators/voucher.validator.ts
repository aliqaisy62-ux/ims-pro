import { z } from 'zod'

export const createVoucherSchema = z.object({
  type: z.enum(['DISBURSEMENT', 'RECEIPT']),
  entityType: z.enum(['CUSTOMER', 'SUPPLIER', 'OTHER']).default('OTHER'),
  entityId: z.string().cuid().optional().nullable(),
  amount: z.number().positive(),
  currency: z.enum(['USD', 'IQD']),
  exchangeRate: z.number().positive(),
  description: z.string().min(1),
})

export type CreateVoucherInput = z.infer<typeof createVoucherSchema>
