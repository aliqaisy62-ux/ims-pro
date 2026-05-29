'use client'

import { useState } from 'react'
import { reportsService } from '@/services/reports.service'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface TopSellerRow {
  rank: number
  itemId: string
  name_ar: string
  name_en: string
  barcode: string
  totalQty: number
  totalRevenue: number
}

function getDefaultFrom(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

function getDefaultTo(): string {
  return new Date().toISOString().slice(0, 10)
}

const BAR_COLORS = ['#f43f5e', '#fb923c', '#facc15', '#4ade80', '#60a5fa', '#a78bfa', '#f472b6', '#34d399', '#38bdf8', '#c084fc']

export default function TopSellersPage() {
  const [from, setFrom] = useState(getDefaultFrom())
  const [to, setTo] = useState(getDefaultTo())
  const [limit, setLimit] = useState(10)
  const [rows, setRows] = useState<TopSellerRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fetched, setFetched] = useState(false)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await reportsService.getTopSellers({ from, to, limit })
      setRows(res.data ?? [])
      setFetched(true)
    } catch {
      setError('فشل تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div dir="rtl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">أكثر المنتجات مبيعاً</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          تصنيف المنتجات الأعلى مبيعاً حسب الإيراد خلال الفترة المحددة
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">من</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">إلى</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">عدد النتائج</label>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
          >
            {[5, 10, 20, 50].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="min-h-[44px] px-5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
        >
          {loading ? 'جاري التحميل...' : 'عرض التقرير'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg p-3 mb-4 text-sm">
          {error}
        </div>
      )}

      {fetched && rows.length === 0 && (
        <div className="text-center py-16 text-gray-400">لا توجد مبيعات في هذه الفترة</div>
      )}

      {rows.length > 0 && (
        <>
          {/* Bar Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">الإيراد حسب المنتج (IQD)</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={rows} margin={{ top: 5, right: 10, left: 10, bottom: 60 }}>
                <XAxis
                  dataKey="name_ar"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={(v) => (v / 1000).toFixed(0) + 'k'} />
                <Tooltip formatter={(v: number) => v.toLocaleString('ar-IQ') + ' د.ع'} />
                <Bar dataKey="totalRevenue" radius={[4, 4, 0, 0]}>
                  {rows.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="px-4 py-3 text-right font-medium">#</th>
                  <th className="px-4 py-3 text-right font-medium">المنتج</th>
                  <th className="px-4 py-3 text-right font-medium">الباركود</th>
                  <th className="px-4 py-3 text-right font-medium">الكمية المباعة</th>
                  <th className="px-4 py-3 text-right font-medium">إجمالي الإيراد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {rows.map((row) => (
                  <tr key={row.itemId} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                    <td className="px-4 py-3 text-gray-500">
                      <span
                        className="inline-flex w-7 h-7 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: BAR_COLORS[(row.rank - 1) % BAR_COLORS.length] }}
                      >
                        {row.rank}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{row.name_ar}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{row.barcode || '—'}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.totalQty.toLocaleString('ar-IQ')}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                      {row.totalRevenue.toLocaleString('ar-IQ')} <span className="text-xs text-gray-400">د.ع</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
