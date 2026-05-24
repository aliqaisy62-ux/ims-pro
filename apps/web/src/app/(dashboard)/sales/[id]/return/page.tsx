'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { salesService } from '@/services/sales.service'

interface InvoiceLine {
  id: string
  itemId: string
  quantity: number
  unitPrice: number
  currency: string
  item: { name_ar: string; name_en: string; barcode: string | null }
}

interface Invoice {
  id: string
  invoiceNumber: string
  status: string
  type: string
  currency: string
  total: number
  createdAt: string
  customer: { name: string } | null
  items: InvoiceLine[]
}

export default function ReturnPage() {
  const params = useParams()
  const router = useRouter()
  const invoiceId = params.id as string

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [searchId, setSearchId] = useState(invoiceId)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [success, setSuccess] = useState(false)

  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = () => searchRef.current?.focus()
    document.addEventListener('ims-focus-barcode', handler)
    return () => document.removeEventListener('ims-focus-barcode', handler)
  }, [])

  const loadInvoice = useCallback(async (id: string) => {
    if (!id) return
    setLoading(true)
    setFetchError('')
    setSelected({})
    setQuantities({})
    setSubmitError('')
    setSuccess(false)
    try {
      const res = await salesService.getById(id)
      if (res.success && res.data) {
        setInvoice(res.data)
        const qtys: Record<string, number> = {}
        for (const line of res.data.items) {
          qtys[line.itemId] = Number(line.quantity)
        }
        setQuantities(qtys)
      } else {
        setFetchError('الفاتورة غير موجودة')
      }
    } catch {
      setFetchError('الفاتورة غير موجودة')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadInvoice(invoiceId) }, [invoiceId, loadInvoice])

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    const id = searchId.trim()
    if (id) router.push(`/sales/${id}/return`)
  }

  function toggleItem(itemId: string) {
    setSelected(prev => ({ ...prev, [itemId]: !prev[itemId] }))
  }

  function toggleAll(checked: boolean) {
    const next: Record<string, boolean> = {}
    invoice?.items.forEach(l => { next[l.itemId] = checked })
    setSelected(next)
  }

  function setQty(itemId: string, val: number, max: number) {
    setQuantities(prev => ({ ...prev, [itemId]: Math.max(1, Math.min(val, max)) }))
  }

  async function handleSubmit() {
    if (!invoice) return
    const returnItems = invoice.items
      .filter(l => selected[l.itemId])
      .map(l => ({ itemId: l.itemId, quantity: quantities[l.itemId] ?? Number(l.quantity) }))

    if (returnItems.length === 0) {
      setSubmitError('يجب تحديد صنف واحد على الأقل للإرجاع')
      return
    }

    setSubmitting(true)
    setSubmitError('')
    try {
      await salesService.partialReturn(invoice.id, returnItems)
      setSuccess(true)
      setTimeout(() => router.push('/sales'), 2000)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'فشل تسجيل الإرجاع'
      setSubmitError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const selectedCount = Object.values(selected).filter(Boolean).length
  const canReturn = invoice?.status === 'CONFIRMED'

  return (
    <div dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm"
        >
          → رجوع
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">إرجاع مبيعات</h1>
      </div>

      {/* Invoice search */}
      <form onSubmit={handleSearchSubmit} className="mb-6 flex gap-2 max-w-md">
        <input
          ref={searchRef}
          type="text"
          value={searchId}
          onChange={e => setSearchId(e.target.value)}
          placeholder="أدخل رقم الفاتورة (ID)..."
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          بحث (F3)
        </button>
      </form>

      {loading && (
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
          <span className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full inline-block" />
          جار تحميل الفاتورة...
        </div>
      )}

      {fetchError && !loading && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg px-4 py-3 text-red-700 dark:text-red-300 text-sm">
          {fetchError}
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg px-4 py-3 text-green-700 dark:text-green-300 font-medium text-sm">
          تم تسجيل الإرجاع بنجاح — جار التحويل...
        </div>
      )}

      {invoice && !loading && !success && (
        <>
          {!canReturn && (
            <div className="mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-4 py-3 text-amber-700 dark:text-amber-300 text-sm">
              لا يمكن إرجاع هذه الفاتورة — الحالة الحالية: <strong>{invoice.status}</strong>
            </div>
          )}

          {/* Invoice info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 mb-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-400 text-xs mb-1">رقم الفاتورة</p>
                <p className="font-mono font-bold text-gray-900 dark:text-white">{invoice.invoiceNumber}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">العميل</p>
                <p className="font-medium text-gray-900 dark:text-white">{invoice.customer?.name ?? 'بدون عميل'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">الإجمالي</p>
                <p className="font-bold text-gray-900 dark:text-white">
                  {Number(invoice.total).toLocaleString('ar-IQ')} {invoice.currency}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">التاريخ</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {new Date(invoice.createdAt).toLocaleDateString('ar-IQ')}
                </p>
              </div>
            </div>
          </div>

          {/* Items table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700 mb-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="px-4 py-3 text-right font-medium w-12">
                    <input
                      type="checkbox"
                      disabled={!canReturn}
                      checked={selectedCount === invoice.items.length && invoice.items.length > 0}
                      onChange={e => toggleAll(e.target.checked)}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3 text-right font-medium">الصنف</th>
                  <th className="px-4 py-3 text-right font-medium">الكمية المباعة</th>
                  <th className="px-4 py-3 text-right font-medium">كمية الإرجاع</th>
                  <th className="px-4 py-3 text-right font-medium">سعر الوحدة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {invoice.items.map(line => (
                  <tr
                    key={line.itemId}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-750 ${selected[line.itemId] ? 'bg-orange-50 dark:bg-orange-900/10' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        disabled={!canReturn}
                        checked={!!selected[line.itemId]}
                        onChange={() => toggleItem(line.itemId)}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">{line.item.name_ar}</div>
                      <div className="text-xs text-gray-400">{line.item.name_en}</div>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">
                      {Number(line.quantity).toLocaleString('ar-IQ')}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={1}
                        max={Number(line.quantity)}
                        value={quantities[line.itemId] ?? Number(line.quantity)}
                        onChange={e => setQty(line.itemId, Number(e.target.value), Number(line.quantity))}
                        disabled={!selected[line.itemId] || !canReturn}
                        className="w-24 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-40"
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">
                      {Number(line.unitPrice).toLocaleString('ar-IQ')} {line.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {submitError && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg px-4 py-3 text-red-700 dark:text-red-300 text-sm">
              {submitError}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleSubmit}
              disabled={submitting || selectedCount === 0 || !canReturn}
              className="min-h-[44px] px-6 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors font-medium text-sm"
            >
              {submitting
                ? 'جار المعالجة...'
                : `تأكيد الإرجاع${selectedCount > 0 ? ` (${selectedCount} صنف)` : ''}`}
            </button>
            <button
              onClick={() => router.push('/sales')}
              className="min-h-[44px] px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
            >
              إلغاء
            </button>
          </div>
        </>
      )}
    </div>
  )
}
