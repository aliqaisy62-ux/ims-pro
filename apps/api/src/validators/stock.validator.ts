import { z } from 'zod'

export const createStockTransferSchema = z.object({
  itemId: z.string().cuid(),
  type: z.enum(['IN', 'OUT']),
  reason: z.enum(['DAMAGE', 'ADJUSTMENT', 'TRANSFER', 'RETURN', 'EXPIRED']),
  quantity: z.number().positive(),
  notes: z.string().optional(),
})

export type CreateStockTransferInput = z.infer<typeof createStockTransferSchema>
