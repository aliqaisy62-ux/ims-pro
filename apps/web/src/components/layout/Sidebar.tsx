'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

type Role = 'ADMIN' | 'MANAGER' | 'CASHIER' | 'VIEWER'

interface NavItem {
  href: string
  icon: string
  labelAr: string
  roles: Role[]
}

const navItems: NavItem[] = [
  { href: '/dashboard',      icon: '📊', labelAr: 'لوحة التحكم',   roles: ['ADMIN', 'MANAGER', 'CASHIER', 'VIEWER'] },
  { href: '/sales',          icon: '🧾', labelAr: 'المبيعات',       roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
  { href: '/purchases',      icon: '🛒', labelAr: 'المشتريات',      roles: ['ADMIN', 'MANAGER'] },
  { href: '/customers',      icon: '👥', labelAr: 'العملاء',        roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
  { href: '/suppliers',      icon: '🏭', labelAr: 'الموردون',       roles: ['ADMIN', 'MANAGER'] },
  { href: '/items',          icon: '📦', labelAr: 'المنتجات',       roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
  { href: '/expenses',       icon: '💸', labelAr: 'المصروفات',      roles: ['ADMIN', 'MANAGER'] },
  { href: '/vouchers',       icon: '📋', labelAr: 'السندات',        roles: ['ADMIN', 'MANAGER'] },
  { href: '/stock',          icon: '🔄', labelAr: 'حركة المخزون',  roles: ['ADMIN', 'MANAGER'] },
  { href: '/inventory',      icon: '📉', labelAr: 'الجرد',          roles: ['ADMIN', 'MANAGER', 'VIEWER'] },
  { href: '/cash-statement', icon: '💰', labelAr: 'كشف الصندوق',   roles: ['ADMIN', 'MANAGER'] },
  { href: '/reports',        icon: '📈', labelAr: 'التقارير',       roles: ['ADMIN', 'MANAGER', 'VIEWER'] },
  { href: '/settings',       icon: '⚙️', labelAr: 'الإعدادات',     roles: ['ADMIN'] },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { user } = useAuth()

  const userRole = user?.role as Role | undefined

  const filteredItems = navItems.filter(
    (item) => userRole && item.roles.includes(userRole)
  )

  const sidebarWidth = collapsed ? 64 : 256

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
        transition: 'width 0.25s ease',
        zIndex: 50,
        overflowX: 'hidden',
        boxShadow: '-2px 0 8px rgba(0,0,0,0.15)',
      }}
      dir="rtl"
    >
      {/* Logo */}
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '0' : '0 20px',
          borderBottom: '1px solid #334155',
          flexShrink: 0,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ fontSize: 22, fontWeight: 700, color: '#38bdf8', letterSpacing: 1 }}>
          {collapsed ? 'IMS' : 'IMS-Pro'}
        </span>
      </div>

      {/* Navigation */}
      <nav
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '8px 0',
        }}
      >
        {filteredItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.labelAr : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: collapsed ? '12px 0' : '12px 20px',
                justifyContent: collapsed ? 'center' : 'flex-start',
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
              {!collapsed && (
                <span style={{ fontSize: 14, fontWeight: isActive ? 600 : 400 }}>
                  {item.labelAr}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Collapse Toggle */}
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
          {/* Arrow: points left (←) when expanded to collapse, right (→) when collapsed to expand */}
          <span style={{ display: 'inline-block', transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.25s' }}>
            &#8594;
          </span>
        </button>
      </div>
    </aside>
  )
}
