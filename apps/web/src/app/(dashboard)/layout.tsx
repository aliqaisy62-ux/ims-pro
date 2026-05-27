'use client'

import { DashboardShell } from '@/components/layout/DashboardShell'

// DEV MODE: auth guards disabled — always render dashboard
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>
}
