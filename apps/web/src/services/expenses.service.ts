import api from '@/lib/api'

export const expensesService = {
  getCategories: () => api.get('/api/expense-categories').then((r) => r.data),
  createCategory: (data: any) => api.post('/api/expense-categories', data).then((r) => r.data),
  updateCategory: (id: string, data: any) =>
    api.put(`/api/expense-categories/${id}`, data).then((r) => r.data),
  deleteCategory: (id: string) =>
    api.delete(`/api/expense-categories/${id}`).then((r) => r.data),
  getAll: (params?: Record<string, any>) =>
    api.get('/api/expenses', { params }).then((r) => r.data),
  getById: (id: string) => api.get(`/api/expenses/${id}`).then((r) => r.data),
  create: (data: any) => api.post('/api/expenses', data).then((r) => r.data),
  update: (id: string, data: any) => api.put(`/api/expenses/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/api/expenses/${id}`).then((r) => r.data),
  getSummary: (month: string) =>
    api.get('/api/expenses/summary', { params: { month } }).then((r) => r.data),
}
