'use client'

import { useState, useEffect } from 'react'
import { reportsService } from '@/services/reports.service'

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

export function FinancialSummary() {
  const [data, setData] = useState<TodaySummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    reportsService.getTodaySummary()
      .then(res => { if (res.success) setData(res.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const isLoss = data != null && data.netProfitIQD < 0

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
      color: (isLoss ? 'red' : 'green') as 'red' | 'green',
    },
  ]

  const colorMap = {
    blue:  { bg: 'bg-blue-50 dark:bg-blue-900/20',   border: 'border-blue-200 dark:border-blue-700',   text: 'text-blue-700 dark:text-blue-300' },
    green: { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-700', text: 'text-green-700 dark:text-green-300' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-700', text: 'text-amber-700 dark:text-amber-300' },
    red:   { bg: 'bg-red-50 dark:bg-red-900/20',     border: 'border-red-200 dark:border-red-700',     text: 'text-red-700 dark:text-red-300' },
  }

  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
        ملخص اليوم المالي
      </h2>
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
