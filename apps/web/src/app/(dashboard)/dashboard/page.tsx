'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { cashStatementService } from '@/services/cashStatement.service'
import { stockService } from '@/services/stock.service'
import { FinancialSummary } from '@/components/dashboard/FinancialSummary'

interface DaySummary {
  cashSalesIQD: number
  cashSalesUSD: number
  creditSales: number
  receipts: number
  disbursements: number
  expenses: number
  closingBalanceIQD: number
  closingBalanceUSD: number
  isClosed: boolean
}

interface StatCardProps {
  label: string
  value: string
  sub?: string
  color: 'blue' | 'green' | 'amber' | 'red'
  href?: string
  loading?: boolean
}

function StatCard({ label, value, sub, color, href, loading }: StatCardProps) {
  const router = useRouter()
  const colors = {
    blue:  { bg: 'bg-blue-50 dark:bg-blue-900/20',   border: 'border-blue-200 dark:border-blue-700',   text: 'text-blue-700 dark:text-blue-300' },
    green: { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-700', text: 'text-green-700 dark:text-green-300' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-700', text: 'text-amber-700 dark:text-amber-300' },
    red:   { bg: 'bg-red-50 dark:bg-red-900/20',     border: 'border-red-200 dark:border-red-700',     text: 'text-red-700 dark:text-red-300' },
  }
  const c = colors[color]

  return (
    <div
      onClick={href ? () => router.push(href) : undefined}
      className={`rounded-xl p-5 shadow-sm border ${c.bg} ${c.border} ${href ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
    >
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{label}</p>
      {loading ? (
        <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      ) : (
        <>
          <p className={`text-2xl font-bold ${c.text}`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </>
      )}
    </div>
  )
}

function fmt(n: number, decimals = 0): string {
  return n.toLocaleString('ar-IQ', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [summary, setSummary] = useState<DaySummary | null>(null)
  const [lowStockCount, setLowStockCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [statRes, stockRes] = await Promise.all([
          cashStatementService.getToday().catch(() => null),
          stockService.getLowStock().catch(() => null),
        ])
        if (statRes?.data) setSummary(statRes.data)
        if (stockRes?.data) setLowStockCount(Array.isArray(stockRes.data) ? stockRes.data.length : 0)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const todaySalesIQD = summary ? summary.cashSalesIQD + summary.creditSales : 0
  const cashBalance = summary ? summary.closingBalanceIQD : 0
  const cashBalanceUSD = summary ? summary.closingBalanceUSD : 0

  return (
    <div dir="rtl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">لوحة التحكم</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          مرحباً، {user?.name} — {new Date().toLocaleDateString('ar-IQ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Today's financial summary */}
      <FinancialSummary />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="مبيعات اليوم (نقدي + آجل)"
          value={loading ? '...' : `${fmt(todaySalesIQD)} د.ع`}
          sub={summary ? `نقدي: ${fmt(summary.cashSalesIQD)} | آجل: ${fmt(summary.creditSales)}` : undefined}
          color="blue"
          href="/sales"
          loading={loading}
        />
        <StatCard
          label="رصيد الصندوق"
          value={loading ? '...' : `${fmt(cashBalance)} د.ع`}
          sub={cashBalanceUSD > 0 ? `${fmt(cashBalanceUSD, 2)} $` : undefined}
          color="green"
          href="/cash-statement"
          loading={loading}
        />
        <StatCard
          label="المقبوضات اليوم"
          value={loading ? '...' : `${fmt(summary?.receipts ?? 0)} د.ع`}
          sub={summary ? `مدفوعات: ${fmt(summary.disbursements)} د.ع` : undefined}
          color="amber"
          href="/vouchers"
          loading={loading}
        />
        <StatCard
          label="تنبيهات المخزون"
          value={loading ? '...' : lowStockCount !== null ? String(lowStockCount) : '—'}
          sub={lowStockCount ? 'صنف تحت الحد الأدنى' : 'المخزون في وضع جيد'}
          color={lowStockCount && lowStockCount > 0 ? 'red' : 'green'}
          href="/inventory"
          loading={loading}
        />
      </div>

      {/* Quick links */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
        <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-4">روابط سريعة</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            { href: '/sales/new',     label: 'فاتورة مبيعات جديدة',     icon: '🧾' },
            { href: '/purchases/new', label: 'فاتورة مشتريات جديدة',    icon: '🛒' },
            { href: '/vouchers/new',  label: 'سند قبض / صرف',          icon: '📋' },
            { href: '/expenses/new',  label: 'تسجيل مصروف',            icon: '💸' },
            { href: '/items/new',     label: 'إضافة منتج',              icon: '📦' },
            { href: '/customers/new', label: 'عميل جديد',              icon: '👥' },
            { href: '/reports',       label: 'التقارير',                icon: '📈' },
            { href: '/cash-statement', label: 'كشف الصندوق',           icon: '💰' },
            { href: '/sales',         label: 'إرجاع مبيعات',          icon: '↩️' },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-300 transition-colors"
            >
              <span>{link.icon}</span>
              <span className="truncate">{link.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
