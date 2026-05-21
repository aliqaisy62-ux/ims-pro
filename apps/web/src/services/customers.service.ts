import api from '@/lib/api'

export const customersService = {
  getAll: (params?: Record<string, string | number>) =>
    api.get('/api/customers', { params }).then((r) => r.data.data),
  getById: (id: string) =>
    api.get(`/api/customers/${id}`).then((r) => r.data.data),
  getStatement: (id: string, from?: string, to?: string) =>
    api.get(`/api/customers/${id}/statement`, { params: { from, to } }).then((r) => r.data.data),
  create: (data: Record<string, unknown>) =>
    api.post('/api/customers', data).then((r) => r.data.data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/api/customers/${id}`, data).then((r) => r.data.data),
  delete: (id: string) =>
    api.delete(`/api/customers/${id}`).then((r) => r.data),
}
