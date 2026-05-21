import api from '@/lib/api'

export const purchasesService = {
  getAll: (params?: Record<string, string | number>) =>
    api.get('/api/purchases', { params }).then((r) => r.data),
  getById: (id: string) =>
    api.get(`/api/purchases/${id}`).then((r) => r.data),
  create: (data: Record<string, unknown>) =>
    api.post('/api/purchases', data).then((r) => r.data),
  confirm: (id: string) =>
    api.post(`/api/purchases/${id}/confirm`).then((r) => r.data),
  cancel: (id: string) =>
    api.post(`/api/purchases/${id}/cancel`).then((r) => r.data),
}
