'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { salesService } from '@/services/sales.service'
import { downloadSalesReportPDF } from '@/lib/pdf'

type InvoiceStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED' | 'RETURNED'
type PaymentType = 'CASH' | 'CREDIT'
type Currency = 'USD' | 'IQD'

interface SalesInvoice {
  id: string
  invoiceNumber: string
  customer: { id: string; name: string } | null
  total: number
  currency: Currency
  status: InvoiceStatus
  type: PaymentType
  createdAt: string
  _count: { items: number }
}

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

const PAYMENT_LABELS: Record<PaymentType, string> = {
  CASH: 'نقدي',
  CREDIT: 'آجل',
}

export default function SalesPage() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<SalesInvoice[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [pdfLoading, setPdfLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { page, limit: 20 }
      if (search) params.search = search
      if (status) params.status = status
      if (fromDate) params.from = fromDate
      if (toDate) params.to = toDate
      const res = await salesService.getAll(params)
      setInvoices(res.data.data ?? [])
      setTotal(res.data.total ?? 0)
    } catch {
      setInvoices([])
    } finally {
      setLoading(false)
    }
  }, [page, search, status, fromDate, toDate])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / 20)

  async function handleDownloadPDF() {
    setPdfLoading(true)
    try {
      const params: Record<string, string | number> = { page: 1, limit: 1000 }
      if (search) params.search = search
      if (status) params.status = status
      if (fromDate) params.from = fromDate
      if (toDate) params.to = toDate
      const res = await salesService.getAll(params)
      const allInvoices = res.data.data ?? []
      const s = res.data
      const summary = {
        totalInvoices: s.total ?? allInvoices.length,
        cashSalesIQD: allInvoices.filter((i: SalesInvoice) => i.type === 'CASH' && i.currency === 'IQD').reduce((a: number, i: SalesInvoice) => a + Number(i.total), 0),
        cashSalesUSD: allInvoices.filter((i: SalesInvoice) => i.type === 'CASH' && i.currency === 'USD').reduce((a: number, i: SalesInvoice) => a + Number(i.total), 0),
        creditSalesIQD: allInvoices.filter((i: SalesInvoice) => i.type === 'CREDIT' && i.currency === 'IQD').reduce((a: number, i: SalesInvoice) => a + Number(i.total), 0),
        creditSalesUSD: allInvoices.filter((i: SalesInvoice) => i.type === 'CREDIT' && i.currency === 'USD').reduce((a: number, i: SalesInvoice) => a + Number(i.total), 0),
        totalIQD: allInvoices.filter((i: SalesInvoice) => i.currency === 'IQD').reduce((a: number, i: SalesInvoice) => a + Number(i.total), 0),
      }
      await downloadSalesReportPDF(allInvoices, summary, { from: fromDate, to: toDate, status })
    } catch {
      // silent
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">فواتير المبيعات</h1>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadPDF}
            disabled={pdfLoading || loading}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
          >
            {pdfLoading ? (
              <span className="animate-spin w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full inline-block" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
            {pdfLoading ? 'جار التحميل...' : 'تصدير PDF'}
          </button>
          <button
            onClick={() => router.push('/sales/new')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            + فاتورة جديدة
          </button>
        </div>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <input
          type="text"
          placeholder="بحث برقم الفاتورة..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm min-w-[200px]"
        />
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1) }}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
        >
          <option value="">جميع الحالات</option>
          <option value="DRAFT">مسودة</option>
          <option value="CONFIRMED">مؤكدة</option>
          <option value="CANCELLED">ملغاة</option>
          <option value="RETURNED">مرتجعة</option>
        </select>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>من</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setPage(1) }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
          />
          <span>إلى</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => { setToDate(e.target.value); setPage(1) }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
          />
        </div>
        {(fromDate || toDate) && (
          <button
            onClick={() => { setFromDate(''); setToDate(''); setPage(1) }}
            className="text-xs text-gray-400 hover:text-red-500"
          >
            مسح التواريخ
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">جار التحميل...</div>
        ) : invoices.length === 0 ? (
          <div className="p-8 text-center text-gray-500">لا توجد فواتير</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              <tr>
                <th className="px-4 py-3 text-right font-medium">رقم الفاتورة</th>
                <th className="px-4 py-3 text-right font-medium">العميل</th>
                <th className="px-4 py-3 text-right font-medium">الأصناف</th>
                <th className="px-4 py-3 text-right font-medium">المجموع</th>
                <th className="px-4 py-3 text-right font-medium">العملة</th>
                <th className="px-4 py-3 text-right font-medium">الحالة</th>
                <th className="px-4 py-3 text-right font-medium">طريقة الدفع</th>
                <th className="px-4 py-3 text-right font-medium">التاريخ</th>
                <th className="px-4 py-3 text-right font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {invoices.map((inv) => (
                <tr
                  key={inv.id}
                  onClick={() => router.push(`/sales/${inv.id}`)}
                  className="hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer"
                >
                  <td className="px-4 py-3 font-mono font-medium text-blue-600 dark:text-blue-400">
                    {inv.invoiceNumber}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {inv.customer?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-center">
                    {inv._count.items}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    {Number(inv.total).toLocaleString('ar-IQ')}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {inv.currency === 'USD' ? 'دولار' : 'دينار'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASSES[inv.status]}`}>
                      {STATUS_LABELS[inv.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${inv.type === 'CASH' ? 'bg-teal-100 text-teal-700' : 'bg-orange-100 text-orange-700'}`}>
                      {PAYMENT_LABELS[inv.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(inv.createdAt).toLocaleDateString('ar-IQ')}
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    {inv.status === 'CONFIRMED' && (
                      <button
                        onClick={() => router.push(`/sales/${inv.id}/return`)}
                        className="text-orange-600 hover:underline text-xs px-2 py-1 rounded hover:bg-orange-50 dark:hover:bg-orange-900/20"
                      >
                        إرجاع
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex gap-2 justify-center">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 border rounded disabled:opacity-50 text-sm"
          >
            السابق
          </button>
          <span className="px-3 py-1 text-sm text-gray-600">
            صفحة {page} من {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 border rounded disabled:opacity-50 text-sm"
          >
            التالي
          </button>
        </div>
      )}
    </div>
  )
}
