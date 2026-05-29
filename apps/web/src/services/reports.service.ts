import api from '@/lib/api'

export const reportsService = {
  getTodaySummary: () =>
    api.get('/api/reports/today-summary').then((r) => r.data),
  getSales: (params: Record<string, string | undefined>) =>
    api.get('/api/reports/sales', { params }).then((r) => r.data),
  getPurchases: (params: Record<string, string | undefined>) =>
    api.get('/api/reports/purchases', { params }).then((r) => r.data),
  getProfit: (params: Record<string, string | undefined>) =>
    api.get('/api/reports/profit', { params }).then((r) => r.data),
  getInventory: () =>
    api.get('/api/reports/inventory').then((r) => r.data),
  getCustomerStatement: (id: string, params?: Record<string, string | undefined>) =>
    api.get(`/api/reports/customer-statement/${id}`, { params }).then((r) => r.data),
  getSupplierStatement: (id: string, params?: Record<string, string | undefined>) =>
    api.get(`/api/reports/supplier-statement/${id}`, { params }).then((r) => r.data),
  getTopSellers: (params: Record<string, string | number | undefined>) =>
    api.get('/api/reports/top-sellers', { params }).then((r) => r.data),
  getPeakHours: (params: Record<string, string | undefined>) =>
    api.get('/api/reports/peak-hours', { params }).then((r) => r.data),
}
