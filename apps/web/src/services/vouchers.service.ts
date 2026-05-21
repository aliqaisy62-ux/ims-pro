import api from '@/lib/api'

export const vouchersService = {
  getAll: (params?: Record<string, any>) =>
    api.get('/api/vouchers', { params }).then((r) => r.data),
  getById: (id: string) =>
    api.get(`/api/vouchers/${id}`).then((r) => r.data),
  create: (data: any) =>
    api.post('/api/vouchers', data).then((r) => r.data),
}
