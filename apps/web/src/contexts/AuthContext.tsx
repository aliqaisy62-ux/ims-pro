'use client'

import { createContext, useContext, ReactNode } from 'react'
import { AuthUser } from '@ims-pro/types'

// DEV MODE: static admin session — no API calls, no token checks, never null
const DEV_USER: AuthUser = {
  id: 'dev-admin-001',
  username: 'admin',
  name: 'System Administrator',
  role: 'ADMIN',
  language: 'ar',
}

interface AuthContextValue {
  user: AuthUser
  isLoading: false
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: DEV_USER,
  isLoading: false,
  login: async () => {},
  logout: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider value={{
      user: DEV_USER,
      isLoading: false,
      login: async () => {},
      logout: async () => {},
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  return useContext(AuthContext)
}
