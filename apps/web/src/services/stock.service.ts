import api from '@/lib/api'

export const stockService = {
  getTransfers: (params?: Record<string, any>) =>
    api.get('/api/stock/transfers', { params }).then((r) => r.data),
  createTransfer: (data: any) =>
    api.post('/api/stock/transfer', data).then((r) => r.data),
  getInventory: (params?: Record<string, any>) =>
    api.get('/api/stock/inventory', { params }).then((r) => r.data),
  getLowStock: () =>
    api.get('/api/stock/low-stock').then((r) => r.data),
  getExpiring: (days?: number) =>
    api.get('/api/stock/expiring', { params: { days } }).then((r) => r.data),
}
