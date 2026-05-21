import api from '@/lib/api'

export const suppliersService = {
  getAll: (params?: Record<string, string | number>) =>
    api.get('/api/suppliers', { params }).then((r) => r.data.data),
  getById: (id: string) =>
    api.get(`/api/suppliers/${id}`).then((r) => r.data.data),
  getStatement: (id: string, from?: string, to?: string) =>
    api.get(`/api/suppliers/${id}/statement`, { params: { from, to } }).then((r) => r.data.data),
  create: (data: Record<string, unknown>) =>
    api.post('/api/suppliers', data).then((r) => r.data.data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/api/suppliers/${id}`, data).then((r) => r.data.data),
  delete: (id: string) =>
    api.delete(`/api/suppliers/${id}`).then((r) => r.data),
}
