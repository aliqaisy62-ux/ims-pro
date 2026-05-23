'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

const pathTitleMap: Record<string, string> = {
  '/dashboard':      'لوحة التحكم',
  '/sales':          'المبيعات',
  '/sales/new':      'فاتورة مبيعات جديدة',
  '/purchases':      'المشتريات',
  '/purchases/new':  'فاتورة مشتريات جديدة',
  '/customers':      'العملاء',
  '/customers/new':  'عميل جديد',
  '/suppliers':      'الموردون',
  '/suppliers/new':  'مورد جديد',
  '/items':          'المنتجات',
  '/items/new':      'منتج جديد',
  '/expenses':       'المصروفات',
  '/expenses/new':   'مصروف جديد',
  '/vouchers':       'السندات',
  '/vouchers/new':   'سند جديد',
  '/stock':          'حركة المخزون',
  '/inventory':      'الجرد',
  '/cash-statement': 'كشف الصندوق',
  '/reports':        'التقارير',
  '/reports/sales':               'تقرير المبيعات',
  '/reports/purchases':           'تقرير المشتريات',
  '/reports/profit':              'تقرير الأرباح',
  '/reports/inventory':           'تقرير المخزون',
  '/reports/customer-statement':  'كشف حساب العميل',
  '/reports/supplier-statement':  'كشف حساب المورد',
  '/settings':       'الإعدادات',
  '/settings/users': 'المستخدمون',
  '/staff':          'إدارة الموظفين',
}

const roleLabelMap: Record<string, string> = {
  ADMIN:      'مدير النظام',
  MANAGER:    'مدير',
  CASHIER:    'كاشير',
  VIEWER:     'مشاهد',
  ACCOUNTANT: 'محاسب',
  STAFF:      'موظف',
}

const roleBadgeColor: Record<string, string> = {
  ADMIN:      '#ef4444',
  MANAGER:    '#3b82f6',
  CASHIER:    '#22c55e',
  VIEWER:     '#a855f7',
  ACCOUNTANT: '#059669',
  STAFF:      '#f97316',
}

function getPageTitle(pathname: string): string {
  if (pathTitleMap[pathname]) return pathTitleMap[pathname]

  // Match dynamic segments (e.g. /customers/123, /sales/456)
  const segments = pathname.split('/')
  if (segments.length >= 3) {
    const base = `/${segments[1]}`
    const last = segments[segments.length - 1]
    if (last === 'edit' || last === 'statement') {
      const subPath = `${base}/${last}`
      if (pathTitleMap[subPath]) return pathTitleMap[subPath]
    }
    if (pathTitleMap[base]) return pathTitleMap[base]
  }

  return 'IMS-Pro'
}

interface TopbarProps {
  sidebarWidth: number
  onMenuToggle: () => void
}

export function Topbar({ sidebarWidth, onMenuToggle }: TopbarProps) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const pageTitle = getPageTitle(pathname)

  const role = user?.role ?? ''
  const roleLabel = roleLabelMap[role] ?? role
  const badgeColor = roleBadgeColor[role] ?? '#64748b'

  return (
    <header
      dir="rtl"
      style={{
        position: 'fixed',
        top: 0,
        right: sidebarWidth,
        left: 0,
        height: 64,
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        zIndex: 40,
        transition: 'right 0.25s ease',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}
    >
      {/* Right side: hamburger + page title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          onClick={onMenuToggle}
          title="تبديل القائمة"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0 10px',
            borderRadius: 6,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            color: '#374151',
            minHeight: 44,
            minWidth: 44,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f3f4f6' }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
          aria-label="فتح/إغلاق القائمة"
        >
          <span style={{ display: 'block', width: 22, height: 2, backgroundColor: '#374151', borderRadius: 2 }} />
          <span style={{ display: 'block', width: 22, height: 2, backgroundColor: '#374151', borderRadius: 2 }} />
          <span style={{ display: 'block', width: 22, height: 2, backgroundColor: '#374151', borderRadius: 2 }} />
        </button>

        <h1 style={{ fontSize: 17, fontWeight: 600, color: '#111827', margin: 0 }}>
          {pageTitle}
        </h1>
      </div>

      {/* Left side: user info + logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {user && (
          <>
            {/* Role badge */}
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#fff',
                backgroundColor: badgeColor,
                borderRadius: 4,
                padding: '2px 8px',
                letterSpacing: 0.3,
              }}
            >
              {roleLabel}
            </span>

            {/* Username */}
            <span style={{ fontSize: 14, color: '#374151', fontWeight: 500 }}>
              {user.name ?? user.username}
            </span>
          </>
        )}

        {/* Logout button */}
        <button
          onClick={() => logout()}
          style={{
            background: 'none',
            border: '1px solid #e5e7eb',
            borderRadius: 6,
            padding: '0 16px',
            fontSize: 13,
            color: '#6b7280',
            cursor: 'pointer',
            transition: 'background-color 0.15s, color 0.15s',
            minHeight: 44,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#fee2e2'
            e.currentTarget.style.color = '#dc2626'
            e.currentTarget.style.borderColor = '#fca5a5'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = '#6b7280'
            e.currentTarget.style.borderColor = '#e5e7eb'
          }}
        >
          تسجيل الخروج
        </button>
      </div>
    </header>
  )
}
