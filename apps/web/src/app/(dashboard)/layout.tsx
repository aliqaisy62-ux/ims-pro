'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/contexts/AuthContext'
import { DashboardShell } from '@/components/layout/DashboardShell'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthContext()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login')
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500 text-lg">جار التحميل...</div>
      </div>
    )
  }

  if (!user) return null

  return <DashboardShell>{children}</DashboardShell>
}
