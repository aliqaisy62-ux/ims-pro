import { z } from 'zod'

export const createCustomerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  type: z.enum(['RETAIL', 'WHOLESALE']).default('RETAIL'),
  creditLimit: z.number().min(0).default(0),
  currency: z.enum(['USD', 'IQD']).default('IQD'),
  notes: z.string().optional().nullable(),
})

export const updateCustomerSchema = createCustomerSchema.partial()
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>
