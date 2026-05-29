'use client'

import { useState } from 'react'
import { reportsService } from '@/services/reports.service'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface HourRow {
  hour: number
  label: string
  invoiceCount: number
  totalRevenue: number
}

function getDefaultFrom(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

function getDefaultTo(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function PeakHoursPage() {
  const [from, setFrom] = useState(getDefaultFrom())
  const [to, setTo] = useState(getDefaultTo())
  const [rows, setRows] = useState<HourRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fetched, setFetched] = useState(false)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await reportsService.getPeakHours({ from, to })
      setRows(res.data ?? [])
      setFetched(true)
    } catch {
      setError('فشل تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }

  const peakHour = rows.reduce<HourRow | null>(
    (best, r) => (!best || r.invoiceCount > best.invoiceCount ? r : best),
    null
  )

  const totalInvoices = rows.reduce((s, r) => s + r.invoiceCount, 0)
  const totalRevenue = rows.reduce((s, r) => s + r.totalRevenue, 0)

  return (
    <div dir="rtl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">أوقات الذروة</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          توزيع المبيعات على ساعات اليوم لتحديد أوقات الانشغال القصوى
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
        <button
          onClick={load}
          disabled={loading}
          className="min-h-[44px] px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
        >
          {loading ? 'جاري التحميل...' : 'عرض التقرير'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg p-3 mb-4 text-sm">
          {error}
        </div>
      )}

      {fetched && totalInvoices === 0 && (
        <div className="text-center py-16 text-gray-400">لا توجد مبيعات في هذه الفترة</div>
      )}

      {fetched && totalInvoices > 0 && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4">
              <div className="text-xs text-indigo-600 dark:text-indigo-400 mb-1">إجمالي الفواتير</div>
              <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                {totalInvoices.toLocaleString('ar-IQ')}
              </div>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
              <div className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">إجمالي الإيراد</div>
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {totalRevenue.toLocaleString('ar-IQ')} <span className="text-sm">د.ع</span>
              </div>
            </div>
            {peakHour && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                <div className="text-xs text-amber-600 dark:text-amber-400 mb-1">ساعة الذروة</div>
                <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                  {peakHour.label}
                  <span className="text-sm font-normal mr-2 text-amber-600">({peakHour.invoiceCount} فاتورة)</span>
                </div>
              </div>
            )}
          </div>

          {/* Invoice Count Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">عدد الفواتير بالساعة</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={rows} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} allowDecimals={false} />
                <Tooltip
                  formatter={(v: number) => [v, 'عدد الفواتير']}
                  labelFormatter={(l) => `الساعة ${l}`}
                />
                <Bar dataKey="invoiceCount" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">الإيراد بالساعة (د.ع)</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={rows} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={(v) => (v / 1000).toFixed(0) + 'k'} />
                <Tooltip
                  formatter={(v: number) => [v.toLocaleString('ar-IQ') + ' د.ع', 'الإيراد']}
                  labelFormatter={(l) => `الساعة ${l}`}
                />
                <Bar dataKey="totalRevenue" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Hour Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="px-4 py-3 text-right font-medium">الساعة</th>
                  <th className="px-4 py-3 text-right font-medium">عدد الفواتير</th>
                  <th className="px-4 py-3 text-right font-medium">إجمالي الإيراد</th>
                  <th className="px-4 py-3 text-right font-medium">نسبة النشاط</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {rows.filter((r) => r.invoiceCount > 0).map((row) => {
                  const pct = totalInvoices > 0 ? Math.round((row.invoiceCount / totalInvoices) * 100) : 0
                  const isPeak = peakHour?.hour === row.hour
                  return (
                    <tr key={row.hour} className={`hover:bg-gray-50 dark:hover:bg-gray-750 ${isPeak ? 'bg-amber-50 dark:bg-amber-900/10' : ''}`}>
                      <td className="px-4 py-3 font-mono font-medium text-gray-900 dark:text-white">
                        {row.label}
                        {isPeak && <span className="mr-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">ذروة</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.invoiceCount}</td>
                      <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">
                        {row.totalRevenue.toLocaleString('ar-IQ')} <span className="text-xs text-gray-400">د.ع</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2 max-w-[120px]">
                            <div
                              className="bg-indigo-500 h-2 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
