'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { AuthUser } from '@ims-pro/types'

// DEV MODE: hardcoded admin session — no API calls needed
const DEV_USER: AuthUser = {
  id: 'dev-admin-001',
  username: 'admin',
  name: 'System Administrator',
  role: 'ADMIN',
  language: 'ar',
}

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user] = useState<AuthUser | null>(DEV_USER)

  async function login(_username: string, _password: string) {
    // no-op in dev mode
  }

  async function logout() {
    // no-op in dev mode
  }

  return (
    <AuthContext.Provider value={{ user, isLoading: false, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider')
  return ctx
}
