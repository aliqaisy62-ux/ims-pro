import axios from 'axios'

let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken() {
  return accessToken
}

const api = axios.create({
  // Use relative /api so requests always route through Nginx on the same host.
  // Override with NEXT_PUBLIC_API_URL at build time for non-Nginx deployments.
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  withCredentials: true,
})

let isRefreshing = false
let refreshQueue: Array<(token: string | null) => void> = []

function processQueue(token: string | null) {
  refreshQueue.forEach((cb) => cb(token))
  refreshQueue = []
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push((token) => {
          if (token) {
            original.headers.Authorization = `Bearer ${token}`
            resolve(api(original))
          } else {
            reject(error)
          }
        })
      })
    }
    original._retry = true
    isRefreshing = true
    try {
      const { data } = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || ''}/api/auth/refresh`,
        {},
        { withCredentials: true }
      )
      const newToken = data.data.accessToken
      setAccessToken(newToken)
      processQueue(newToken)
      original.headers.Authorization = `Bearer ${newToken}`
      return api(original)
    } catch {
      setAccessToken(null)
      processQueue(null)
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
      return Promise.reject(error)
    } finally {
      isRefreshing = false
    }
  }
)

export default api
