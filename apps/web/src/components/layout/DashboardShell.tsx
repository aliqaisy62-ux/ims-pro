'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { PageTransition } from './PageTransition'
import { PageErrorBoundary } from '@/components/PageErrorBoundary'

const SIDEBAR_FULL = 256
const SIDEBAR_COLLAPSED = 64
const MOBILE_BREAKPOINT = 768
const STORAGE_KEY = 'sidebar-collapsed'

interface DashboardShellProps {
  children: React.ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Close mobile overlay when switching to desktop
  useEffect(() => {
    if (!isMobile) setMobileOpen(false)
  }, [isMobile])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored !== null) setCollapsed(stored === 'true')
    } catch {
      // localStorage may be unavailable
    }
  }, [])

  function handleToggle() {
    if (isMobile) {
      setMobileOpen((prev) => !prev)
    } else {
      setCollapsed((prev) => {
        const next = !prev
        try { localStorage.setItem(STORAGE_KEY, String(next)) } catch { /* ignore */ }
        return next
      })
    }
  }

  const sidebarWidth = isMobile ? 0 : collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_FULL

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }} dir="rtl">
      {/* Mobile overlay backdrop */}
      {isMobile && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            zIndex: 40,
            transition: 'opacity 0.25s',
          }}
        />
      )}

      <Sidebar
        collapsed={collapsed}
        onToggle={handleToggle}
        isMobile={isMobile}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <Topbar sidebarWidth={sidebarWidth} onMenuToggle={handleToggle} />

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
            <PageTransition>{children}</PageTransition>
          </PageErrorBoundary>
        </div>
      </main>
    </div>
  )
}
