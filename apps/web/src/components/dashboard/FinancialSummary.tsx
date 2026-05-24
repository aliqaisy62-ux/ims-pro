'use client'

import { useState, useEffect } from 'react'
import { reportsService } from '@/services/reports.service'
import { useAuthContext } from '@/contexts/AuthContext'
import { downloadFinancialSummaryPDF } from '@/lib/pdf'

interface TodaySummary {
  salesCount: number
  salesTotalIQD: number
  returnsCount: number
  returnsTotalIQD: number
  netSalesIQD: number
  expensesTotalIQD: number
  netProfitIQD: number
}

function fmt(n: number): string {
  return n.toLocaleString('ar-IQ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

const colorMap = {
  blue:  { bg: 'bg-blue-50 dark:bg-blue-900/20',   border: 'border-blue-200 dark:border-blue-700',   text: 'text-blue-700 dark:text-blue-300' },
  green: { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-700', text: 'text-green-700 dark:text-green-300' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-700', text: 'text-amber-700 dark:text-amber-300' },
  red:   { bg: 'bg-red-50 dark:bg-red-900/20',     border: 'border-red-200 dark:border-red-700',     text: 'text-red-700 dark:text-red-300' },
}

export function FinancialSummary() {
  const { user } = useAuthContext()
  const [data, setData] = useState<TodaySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [pdfLoading, setPdfLoading] = useState(false)

  // Profit data hidden from CASHIER
  const canSeeProfit = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'ACCOUNTANT'

  useEffect(() => {
    reportsService.getTodaySummary()
      .then(res => { if (res.success) setData(res.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleDownloadPDF() {
    if (!data || !canSeeProfit) return
    setPdfLoading(true)
    try {
      await downloadFinancialSummaryPDF(data)
    } finally {
      setPdfLoading(false)
    }
  }

  const cards = [
    {
      label: 'مبيعات اليوم',
      value: data ? `${fmt(data.salesTotalIQD)} د.ع` : '—',
      sub: data ? `${data.salesCount} فاتورة` : undefined,
      color: 'blue' as const,
    },
    {
      label: 'الإرجاعات',
      value: data ? `${fmt(data.returnsTotalIQD)} د.ع` : '—',
      sub: data ? `${data.returnsCount} إرجاع` : undefined,
      color: 'amber' as const,
    },
    ...(canSeeProfit ? [
      {
        label: 'صافي المبيعات',
        value: data ? `${fmt(data.netSalesIQD)} د.ع` : '—',
        sub: undefined,
        color: 'green' as const,
      },
      {
        label: 'صافي الربح',
        value: data ? `${fmt(data.netProfitIQD)} د.ع` : '—',
        sub: data ? `مصاريف: ${fmt(data.expensesTotalIQD)} د.ع` : undefined,
        color: (data?.netProfitIQD != null && data.netProfitIQD < 0 ? 'red' : 'green') as 'red' | 'green',
      },
    ] : []),
  ]

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          ملخص اليوم المالي
        </h2>
        {canSeeProfit && data && !loading && (
          <button
            onClick={handleDownloadPDF}
            disabled={pdfLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
          >
            {pdfLoading ? (
              <span className="animate-spin w-3 h-3 border border-red-500 border-t-transparent rounded-full inline-block" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
            {pdfLoading ? 'جار التحميل...' : 'تحميل PDF'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map(card => {
          const c = colorMap[card.color]
          return (
            <div key={card.label} className={`rounded-xl p-4 shadow-sm border ${c.bg} ${c.border}`}>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{card.label}</p>
              {loading ? (
                <div className="h-7 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              ) : (
                <>
                  <p className={`text-lg font-bold ${c.text}`}>{card.value}</p>
                  {card.sub && <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>}
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
