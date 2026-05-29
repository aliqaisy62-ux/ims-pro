'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { triggerHaptic } from '@/lib/haptics'

type Role = 'ADMIN' | 'MANAGER' | 'CASHIER' | 'VIEWER' | 'ACCOUNTANT' | 'STAFF'

interface NavItem {
  href: string
  icon: string
  labelAr: string
  roles: Role[]
}

const navItems: NavItem[] = [
  { href: '/dashboard',      icon: '📊', labelAr: 'لوحة التحكم',    roles: ['ADMIN', 'MANAGER', 'VIEWER', 'ACCOUNTANT', 'STAFF'] },
  { href: '/pos',            icon: '🏪', labelAr: 'نقطة البيع',      roles: ['ADMIN', 'MANAGER', 'CASHIER', 'STAFF'] },
  { href: '/sales',          icon: '🧾', labelAr: 'المبيعات',        roles: ['ADMIN', 'MANAGER', 'CASHIER', 'STAFF'] },
  { href: '/purchases',      icon: '🛒', labelAr: 'المشتريات',       roles: ['ADMIN', 'MANAGER'] },
  { href: '/customers',      icon: '👥', labelAr: 'العملاء',         roles: ['ADMIN', 'MANAGER', 'CASHIER', 'STAFF', 'ACCOUNTANT'] },
  { href: '/suppliers',      icon: '🏭', labelAr: 'الموردون',        roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT'] },
  { href: '/items',          icon: '📦', labelAr: 'المنتجات',        roles: ['ADMIN', 'MANAGER', 'CASHIER', 'STAFF'] },
  { href: '/expenses',       icon: '💸', labelAr: 'المصروفات',       roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT'] },
  { href: '/vouchers',       icon: '📋', labelAr: 'السندات',         roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT'] },
  { href: '/stock',          icon: '🔄', labelAr: 'حركة المخزون',   roles: ['ADMIN', 'MANAGER'] },
  { href: '/inventory',      icon: '📉', labelAr: 'الجرد',           roles: ['ADMIN', 'MANAGER', 'VIEWER', 'ACCOUNTANT'] },
  { href: '/cash-statement', icon: '💰', labelAr: 'كشف الصندوق',    roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT'] },
  { href: '/reports',        icon: '📈', labelAr: 'التقارير',        roles: ['ADMIN', 'MANAGER', 'VIEWER', 'ACCOUNTANT'] },
  { href: '/staff',          icon: '👤', labelAr: 'إدارة الموظفين',  roles: ['ADMIN'] },
  { href: '/settings',       icon: '⚙️', labelAr: 'الإعدادات',      roles: ['ADMIN'] },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  isMobile?: boolean
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function Sidebar({ collapsed, onToggle, isMobile, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const { user } = useAuth()

  const userRole = user?.role as Role | undefined
  const filteredItems = navItems.filter((item) => userRole && item.roles.includes(userRole))

  const isVisible = isMobile ? mobileOpen : true
  const sidebarWidth = isMobile ? 260 : collapsed ? 64 : 256

  const translateX = isMobile
    ? mobileOpen ? '0%' : '100%'
    : '0%'

  return (
    <aside
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        height: '100vh',
        width: sidebarWidth,
        backgroundColor: '#1e293b',
        color: '#f1f5f9',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.25s ease, transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        transform: `translateX(${translateX})`,
        zIndex: 50,
        overflowX: 'hidden',
        boxShadow: isVisible ? '-2px 0 8px rgba(0,0,0,0.15)' : 'none',
      }}
      dir="rtl"
    >
      {/* Logo */}
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
          padding: collapsed && !isMobile ? '0' : '0 20px',
          borderBottom: '1px solid #334155',
          flexShrink: 0,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ fontSize: 22, fontWeight: 700, color: '#38bdf8', letterSpacing: 1 }}>
          {collapsed && !isMobile ? 'IMS' : 'IMS-Pro'}
        </span>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 0' }}>
        {filteredItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed && !isMobile ? item.labelAr : undefined}
              onClick={() => {
                triggerHaptic()
                if (onMobileClose) onMobileClose()
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: collapsed && !isMobile ? '12px 0' : '12px 20px',
                justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
                textDecoration: 'none',
                color: isActive ? '#38bdf8' : '#94a3b8',
                backgroundColor: isActive ? 'rgba(56,189,248,0.12)' : 'transparent',
                borderRight: isActive ? '3px solid #38bdf8' : '3px solid transparent',
                transition: 'background-color 0.15s, color 0.15s',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'
                  e.currentTarget.style.color = '#f1f5f9'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = '#94a3b8'
                }
              }}
            >
              <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
              {!(collapsed && !isMobile) && (
                <span style={{ fontSize: 14, fontWeight: isActive ? 600 : 400 }}>
                  {item.labelAr}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Collapse Toggle — desktop only */}
      {!isMobile && (
        <div style={{ borderTop: '1px solid #334155', flexShrink: 0 }}>
          <button
            onClick={onToggle}
            title={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
            style={{
              width: '100%',
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              fontSize: 18,
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#f1f5f9' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b' }}
          >
            <span style={{ display: 'inline-block', transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.25s' }}>
              &#8594;
            </span>
          </button>
        </div>
      )}
    </aside>
  )
}
