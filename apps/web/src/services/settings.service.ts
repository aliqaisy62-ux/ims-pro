import api from '@/lib/api'

export const settingsService = {
  getAll: () => api.get('/api/settings').then((r) => r.data),
  update: (data: Record<string, string>) => api.put('/api/settings', data).then((r) => r.data),
  updateExchangeRate: (rate: number) =>
    api.post('/api/settings/exchange-rate', { rate }).then((r) => r.data),
  getExchangeRateHistory: () =>
    api.get('/api/settings/exchange-rate/history').then((r) => r.data),
  getUsers: () => api.get('/api/settings/users').then((r) => r.data),
  createUser: (data: any) => api.post('/api/settings/users', data).then((r) => r.data),
  updateUser: (id: string, data: any) =>
    api.put(`/api/settings/users/${id}`, data).then((r) => r.data),
  resetPassword: (id: string, newPassword: string) =>
    api
      .post(`/api/settings/users/${id}/reset-password`, { newPassword })
      .then((r) => r.data),
}
