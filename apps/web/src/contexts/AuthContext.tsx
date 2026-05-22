'use client'

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
import axios from 'axios'
import { setAccessToken } from '@/lib/api'
import { AuthUser } from '@ims-pro/types'

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    // Try silent refresh on mount to restore session from HttpOnly cookie
    axios
      .post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001'}/api/auth/refresh`,
        {},
        { withCredentials: true }
      )
      .then(({ data }) => {
        setAccessToken(data.data.accessToken)
        setUser(data.data.user)
      })
      .catch(() => {
        setAccessToken(null)
        setUser(null)
      })
      .finally(() => setIsLoading(false))
  }, [])

  async function login(username: string, password: string) {
    const { data } = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001'}/api/auth/login`,
      { username, password },
      { withCredentials: true }
    )
    setAccessToken(data.data.accessToken)
    setUser(data.data.user)
  }

  async function logout() {
    await axios
      .post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001'}/api/auth/logout`,
        {},
        { withCredentials: true }
      )
      .catch(() => {})
    setAccessToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider')
  return ctx
}
