import api from '@/lib/api'

export const itemsService = {
  getAll: (params?: Record<string, string | number | boolean>) =>
    api.get('/api/items', { params }).then((r) => r.data.data),

  getById: (id: string) =>
    api.get(`/api/items/${id}`).then((r) => r.data.data),

  getByBarcode: (barcode: string) =>
    api.get(`/api/items/barcode/${encodeURIComponent(barcode)}`).then((r) => r.data.data),

  getCategories: () =>
    api.get('/api/items/categories').then((r) => r.data.data),

  create: (data: Record<string, unknown>) =>
    api.post('/api/items', data).then((r) => r.data.data),

  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/api/items/${id}`, data).then((r) => r.data.data),

  delete: (id: string) =>
    api.delete(`/api/items/${id}`).then((r) => r.data),

  validateImport: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/api/items/validate-import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data)
  },
  importItems: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/api/items/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data)
  },
}
