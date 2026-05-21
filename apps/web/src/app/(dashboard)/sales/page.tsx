'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { salesService } from '@/services/sales.service'

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
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { page, limit: 20 }
      if (search) params.search = search
      if (status) params.status = status
      const res = await salesService.getAll(params)
      setInvoices(res.data.data ?? [])
      setTotal(res.data.total ?? 0)
    } catch {
      setInvoices([])
    } finally {
      setLoading(false)
    }
  }, [page, search, status])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / 20)

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">فواتير المبيعات</h1>
        <button
          onClick={() => router.push('/sales/new')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          + فاتورة جديدة
        </button>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
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
