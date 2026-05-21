'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { purchasesService } from '@/services/purchases.service'

interface Supplier {
  id: string
  name: string
  currency: string
}

interface PurchaseInvoice {
  id: string
  invoiceNumber: string
  supplier: Supplier | null
  total: number
  currency: string
  status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED' | 'RETURNED'
  createdAt: string
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'مسودة',
  CONFIRMED: 'مؤكدة',
  CANCELLED: 'ملغاة',
  RETURNED: 'مرتجعة',
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  CONFIRMED: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  RETURNED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
}

export default function PurchasesPage() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([])
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
      const res = await purchasesService.getAll(params)
      setInvoices(res.data.data)
      setTotal(res.data.total)
    } catch {
      setInvoices([])
    } finally {
      setLoading(false)
    }
  }, [page, search, status])

  useEffect(() => {
    load()
  }, [load])

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value)
    setPage(1)
  }

  function handleStatus(e: React.ChangeEvent<HTMLSelectElement>) {
    setStatus(e.target.value)
    setPage(1)
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">فواتير الشراء</h1>
        <button
          onClick={() => router.push('/purchases/new')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
        >
          + فاتورة شراء جديدة
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="بحث برقم الفاتورة..."
          value={search}
          onChange={handleSearch}
          className="w-full max-w-xs px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
        />
        <select
          value={status}
          onChange={handleStatus}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
        >
          <option value="">جميع الحالات</option>
          <option value="DRAFT">مسودة</option>
          <option value="CONFIRMED">مؤكدة</option>
          <option value="CANCELLED">ملغاة</option>
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">جار التحميل...</div>
        ) : invoices.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">لا توجد فواتير شراء</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              <tr>
                <th className="px-4 py-3 text-right font-medium">رقم الفاتورة</th>
                <th className="px-4 py-3 text-right font-medium">المورد</th>
                <th className="px-4 py-3 text-right font-medium">المجموع</th>
                <th className="px-4 py-3 text-right font-medium">العملة</th>
                <th className="px-4 py-3 text-right font-medium">الحالة</th>
                <th className="px-4 py-3 text-right font-medium">التاريخ</th>
                <th className="px-4 py-3 text-right font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                  <td className="px-4 py-3 font-mono font-medium text-gray-900 dark:text-white">
                    {inv.invoiceNumber}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {inv.supplier?.name || '—'}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    {Number(inv.total).toLocaleString('ar-IQ', { minimumFractionDigits: 3 })}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {inv.currency === 'USD' ? 'دولار' : 'دينار'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[inv.status] || STATUS_COLORS.DRAFT}`}>
                      {STATUS_LABELS[inv.status] || inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {new Date(inv.createdAt).toLocaleDateString('ar-IQ')}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => router.push(`/purchases/${inv.id}`)}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      عرض
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex gap-2 justify-center items-center">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            السابق
          </button>
          <span className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400">
            صفحة {page} من {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            التالي
          </button>
        </div>
      )}
    </div>
  )
}
