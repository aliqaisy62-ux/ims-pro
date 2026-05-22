'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthContext } from '@/contexts/AuthContext'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { UserRole } from '@ims-pro/types'

// Route prefix → allowed roles. First match wins.
const ROUTE_ROLES: Array<{ prefix: string; roles: UserRole[] }> = [
  { prefix: '/staff',          roles: ['ADMIN'] },
  { prefix: '/settings',       roles: ['ADMIN'] },
  { prefix: '/reports',        roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'VIEWER'] },
  { prefix: '/purchases',      roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT'] },
  { prefix: '/stock',          roles: ['ADMIN', 'MANAGER'] },
  { prefix: '/inventory',      roles: ['ADMIN', 'MANAGER', 'VIEWER', 'ACCOUNTANT'] },
  { prefix: '/cash-statement', roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT'] },
  { prefix: '/expenses',       roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT'] },
  { prefix: '/vouchers',       roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT'] },
  { prefix: '/suppliers',      roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT'] },
]

function isAllowed(pathname: string, role: UserRole): boolean {
  const rule = ROUTE_ROLES.find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + '/'))
  if (!rule) return true
  return rule.roles.includes(role)
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthContext()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (isLoading) return
    if (!user) { router.replace('/login'); return }
    if (!isAllowed(pathname, user.role)) router.replace('/dashboard')
  }, [user, isLoading, router, pathname])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500 text-lg">جار التحميل...</div>
      </div>
    )
  }

  if (!user) return null
  if (!isAllowed(pathname, user.role)) return null

  return <DashboardShell>{children}</DashboardShell>
}
