'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { PageErrorBoundary } from '@/components/PageErrorBoundary'

const SIDEBAR_FULL = 256
const SIDEBAR_COLLAPSED = 64
const STORAGE_KEY = 'sidebar-collapsed'

interface DashboardShellProps {
  children: React.ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false)

  // Restore collapse state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored !== null) {
        setCollapsed(stored === 'true')
      }
    } catch {
      // localStorage may be unavailable (e.g. SSR guard)
    }
  }, [])

  function handleToggle() {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY, String(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_FULL

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }} dir="rtl">
      {/* Fixed sidebar */}
      <Sidebar collapsed={collapsed} onToggle={handleToggle} />

      {/* Fixed topbar — offset by sidebar width on the right */}
      <Topbar sidebarWidth={sidebarWidth} onMenuToggle={handleToggle} />

      {/* Main content area */}
      <main
        style={{
          marginRight: sidebarWidth,
          paddingTop: 64,
          minHeight: '100vh',
          transition: 'margin-right 0.25s ease',
        }}
      >
        <div style={{ padding: 24 }}>
          <PageErrorBoundary>
            {children}
          </PageErrorBoundary>
        </div>
      </main>
    </div>
  )
}
