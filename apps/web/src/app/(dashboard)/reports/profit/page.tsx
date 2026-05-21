'use client'

import { useState } from 'react'
import { reportsService } from '@/services/reports.service'

interface ProfitItem {
  itemId: string
  nameAr: string
  nameEn: string
  quantitySold: number
  revenue: number
  costOfGoods: number
  grossProfit: number
}

interface ProfitSummary {
  totalRevenue: number
  totalCostOfGoods: number
  totalGrossProfit: number
  totalExpenses: number
  netProfit: number
}

function getDefaultFrom(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

function getDefaultTo(): string {
  return new Date().toISOString().slice(0, 10)
}

function fmt(n: number): string {
  return n.toLocaleString('ar-IQ', { maximumFractionDigits: 0 })
}

export default function ProfitReportPage() {
  const [from, setFrom] = useState(getDefaultFrom())
  const [to, setTo] = useState(getDefaultTo())
  const [items, setItems] = useState<ProfitItem[]>([])
  const [summary, setSummary] = useState<ProfitSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)

  async function handleSearch() {
    if (!from || !to) {
      setError('يجب تحديد تاريخ البداية والنهاية')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await reportsService.getProfit({ from, to })
      setItems(res.data.items ?? [])
      setSummary(res.data.summary ?? null)
      setSearched(true)
    } catch {
      setError('حدث خطأ أثناء تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }

  const profitColor = (n: number) =>
    n >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'

  return (
    <div dir="rtl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">تقرير الأرباح</h1>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-5 flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">من تاريخ</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">إلى تاريخ</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
        >
          {loading ? 'جار البحث...' : 'بحث'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-5">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border-r-4 border-blue-500">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">الإيرادات</p>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{fmt(summary.totalRevenue)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border-r-4 border-gray-400">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">تكلفة البضاعة</p>
            <p className="text-lg font-bold text-gray-700 dark:text-gray-300">{fmt(summary.totalCostOfGoods)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border-r-4 border-green-500">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">الربح الإجمالي</p>
            <p className={`text-lg font-bold ${profitColor(summary.totalGrossProfit)}`}>
              {fmt(summary.totalGrossProfit)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border-r-4 border-red-400">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">المصروفات</p>
            <p className="text-lg font-bold text-red-600 dark:text-red-400">{fmt(summary.totalExpenses)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border-r-4 border-teal-500">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">صافي الربح</p>
            <p className={`text-lg font-bold ${profitColor(summary.netProfit)}`}>
              {fmt(summary.netProfit)}
            </p>
          </div>
        </div>
      )}

      {/* Items Table */}
      {searched && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          {items.length === 0 ? (
            <div className="p-8 text-center text-gray-500">لا توجد مبيعات في هذه الفترة</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  <tr>
                    <th className="px-4 py-3 text-right font-medium">المنتج</th>
                    <th className="px-4 py-3 text-right font-medium">الكمية المباعة</th>
                    <th className="px-4 py-3 text-right font-medium">الإيرادات</th>
                    <th className="px-4 py-3 text-right font-medium">التكلفة</th>
                    <th className="px-4 py-3 text-right font-medium">الربح</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {items.map((item) => (
                    <tr key={item.itemId} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                      <td className="px-4 py-3 text-gray-900 dark:text-white">
                        <div className="font-medium">{item.nameAr}</div>
                        <div className="text-xs text-gray-500">{item.nameEn}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-center">
                        {Number(item.quantitySold).toLocaleString('ar-IQ')}
                      </td>
                      <td className="px-4 py-3 text-blue-600 dark:text-blue-400 font-medium">
                        {fmt(item.revenue)}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {fmt(item.costOfGoods)}
                      </td>
                      <td className={`px-4 py-3 font-bold ${profitColor(item.grossProfit)}`}>
                        {fmt(item.grossProfit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
