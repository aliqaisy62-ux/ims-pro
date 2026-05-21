'use client'

import { useState } from 'react'
import { reportsService } from '@/services/reports.service'

type PaymentType = 'CASH' | 'CREDIT'
type Currency = 'USD' | 'IQD'
type InvoiceStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED' | 'RETURNED'

interface SalesInvoice {
  id: string
  invoiceNumber: string
  customer: { id: string; name: string } | null
  type: PaymentType
  total: number
  currency: Currency
  status: InvoiceStatus
  createdAt: string
  _count: { items: number }
}

interface Summary {
  totalInvoices: number
  cashSalesIQD: number
  cashSalesUSD: number
  creditSalesIQD: number
  creditSalesUSD: number
  totalIQD: number
}

const PAYMENT_LABELS: Record<PaymentType, string> = { CASH: 'نقدي', CREDIT: 'آجل' }
const STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: 'مسودة',
  CONFIRMED: 'مؤكدة',
  CANCELLED: 'ملغاة',
  RETURNED: 'مرتجعة',
}
const STATUS_CLASSES: Record<InvoiceStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  CONFIRMED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  RETURNED: 'bg-amber-100 text-amber-700',
}

function getDefaultFrom(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

function getDefaultTo(): string {
  return new Date().toISOString().slice(0, 10)
}

function exportCsv(invoices: SalesInvoice[]) {
  const headers = ['رقم الفاتورة', 'العميل', 'النوع', 'الإجمالي', 'العملة', 'الحالة', 'التاريخ']
  const rows = invoices.map((inv) => [
    inv.invoiceNumber,
    inv.customer?.name ?? '',
    PAYMENT_LABELS[inv.type],
    String(Number(inv.total)),
    inv.currency,
    STATUS_LABELS[inv.status],
    new Date(inv.createdAt).toLocaleDateString('ar-IQ'),
  ])
  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(','))
    .join('\n')
  const bom = '﻿'
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `sales-report-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export default function SalesReportPage() {
  const [from, setFrom] = useState(getDefaultFrom())
  const [to, setTo] = useState(getDefaultTo())
  const [status, setStatus] = useState('CONFIRMED')
  const [invoices, setInvoices] = useState<SalesInvoice[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)

  async function handleSearch() {
    setLoading(true)
    setError('')
    try {
      const params: Record<string, string | undefined> = { from, to }
      if (status) params.status = status
      const res = await reportsService.getSales(params)
      setInvoices(res.data.invoices ?? [])
      setSummary(res.data.summary ?? null)
      setSearched(true)
    } catch {
      setError('حدث خطأ أثناء تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">تقرير المبيعات</h1>
        {invoices.length > 0 && (
          <button
            onClick={() => exportCsv(invoices)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
          >
            تصدير Excel
          </button>
        )}
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
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">الحالة</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="CONFIRMED">مؤكدة</option>
            <option value="DRAFT">مسودة</option>
            <option value="CANCELLED">ملغاة</option>
            <option value="RETURNED">مرتجعة</option>
            <option value="">الكل</option>
          </select>
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

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-5">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border-r-4 border-blue-500">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">إجمالي الفواتير</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.totalInvoices}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border-r-4 border-teal-500">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">المبيعات النقدية IQD</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {summary.cashSalesIQD.toLocaleString('ar-IQ')}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border-r-4 border-teal-400">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">المبيعات النقدية USD</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              ${summary.cashSalesUSD.toLocaleString()}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border-r-4 border-orange-500">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">المبيعات الآجلة IQD</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {summary.creditSalesIQD.toLocaleString('ar-IQ')}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border-r-4 border-green-500">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">الإجمالي بالدينار</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">
              {summary.totalIQD.toLocaleString('ar-IQ')}
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      {searched && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          {invoices.length === 0 ? (
            <div className="p-8 text-center text-gray-500">لا توجد فواتير في هذه الفترة</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  <tr>
                    <th className="px-4 py-3 text-right font-medium">رقم الفاتورة</th>
                    <th className="px-4 py-3 text-right font-medium">العميل</th>
                    <th className="px-4 py-3 text-right font-medium">النوع</th>
                    <th className="px-4 py-3 text-right font-medium">الإجمالي</th>
                    <th className="px-4 py-3 text-right font-medium">العملة</th>
                    <th className="px-4 py-3 text-right font-medium">الحالة</th>
                    <th className="px-4 py-3 text-right font-medium">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                      <td className="px-4 py-3 font-mono font-medium text-blue-600 dark:text-blue-400">
                        {inv.invoiceNumber}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {inv.customer?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            inv.type === 'CASH'
                              ? 'bg-teal-100 text-teal-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}
                        >
                          {PAYMENT_LABELS[inv.type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                        {Number(inv.total).toLocaleString('ar-IQ')}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {inv.currency === 'USD' ? 'دولار' : 'دينار'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASSES[inv.status]}`}
                        >
                          {STATUS_LABELS[inv.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(inv.createdAt).toLocaleDateString('ar-IQ')}
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
