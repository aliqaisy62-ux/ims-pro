import api from '@/lib/api'

export interface PosCheckoutPayload {
  items: { itemId: string; quantity: number }[]
  priceType: 'RETAIL' | 'WHOLESALE' | 'SPECIAL' | 'DOLLAR' | 'DINAR'
  currency: 'IQD' | 'USD'
  exchangeRate: number
  paymentMethod: 'CASH' | 'CREDIT'
  customerId?: string | null
  amountPaid?: number
  notes?: string
}

export interface PosCheckoutResult {
  id: string
  invoiceNumber: string
  total: string | number
  currency: string
  amountPaid: string | number
}

export const posService = {
  checkout: (payload: PosCheckoutPayload): Promise<PosCheckoutResult> =>
    api.post('/api/pos/checkout', payload).then((r) => r.data.data),

  searchItems: (query: string) =>
    api
      .get('/api/items', { params: { search: query, pageSize: 20 } })
      .then((r) => r.data.data?.items ?? r.data.data ?? []),
}
