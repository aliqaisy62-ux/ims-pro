import api from '@/lib/api'

export const cashStatementService = {
  getToday: () => api.get('/api/cash-statement/today').then((r) => r.data),
  getByDate: (date: string) =>
    api.get('/api/cash-statement', { params: { date } }).then((r) => r.data),
  close: (notes?: string) =>
    api.post('/api/cash-statement/close', { notes }).then((r) => r.data),
  getRange: (from: string, to: string) =>
    api.get('/api/cash-statement/range', { params: { from, to } }).then((r) => r.data),
}
