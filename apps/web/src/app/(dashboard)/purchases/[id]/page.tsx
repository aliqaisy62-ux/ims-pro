'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { purchasesService } from '@/services/purchases.service'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Supplier {
  id: string
  name: string
  currency: string
}

interface ItemInfo {
  id: string
  name_ar: string
  name_en: string
  barcode: string | null
  unit: string
}

interface InvoiceLine {
  id: string
  itemId: string
  item: ItemInfo
  quantity: number
  unitCost: number
  currency: string
  subtotal: number
  expiryDate: string | null
}

interface PurchaseInvoiceDetail {
  id: string
  invoiceNumber: string
  supplier: Supplier | null
  currency: 'IQD' | 'USD'
  exchangeRate: number
  subtotal: number
  discount: number
  total: number
  amountPaid: number
  balance: number
  notes: string | null
  status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED' | 'RETURNED'
  createdAt: string
  updatedAt: string
  createdBy: { id: string; name: string; username: string }
  items: InvoiceLine[]
}

// ─── Labels ───────────────────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

export default function PurchaseDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [invoice, setInvoice] = useState<PurchaseInvoiceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<'confirm' | 'cancel' | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await purchasesService.getById(id)
      setInvoice(res.data)
    } catch {
      setError('فشل في تحميل الفاتورة')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  async function handleConfirm() {
    if (!invoice) return
    if (!window.confirm('هل تريد تأكيد هذه الفاتورة؟ سيتم تحديث المخزون ورصيد المورد.')) return
    setError('')
    setActionLoading('confirm')
    try {
      await purchasesService.confirm(id)
      await load()
    } catch {
      setError('فشل في تأكيد الفاتورة')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleCancel() {
    if (!invoice) return
    const msg =
      invoice.status === 'CONFIRMED'
        ? 'هل تريد إلغاء هذه الفاتورة المؤكدة؟ سيتم عكس تأثيرها على المخزون والمورد.'
        : 'هل تريد إلغاء هذه الفاتورة؟'
    if (!window.confirm(msg)) return
    setError('')
    setActionLoading('cancel')
    try {
      await purchasesService.cancel(id)
      await load()
    } catch {
      setError('فشل في إلغاء الفاتورة')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div dir="rtl" className="p-8 text-center text-gray-500 dark:text-gray-400">
        جار التحميل...
      </div>
    )
  }

  if (!invoice) {
    return (
      <div dir="rtl" className="p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400 mb-4">الفاتورة غير موجودة</p>
        <button
          onClick={() => router.push('/purchases')}
          className="text-blue-600 hover:underline text-sm"
        >
          العودة إلى قائمة الفواتير
        </button>
      </div>
    )
  }

  const currencyLabel = invoice.currency === 'USD' ? 'دولار' : 'دينار'

  return (
    <div dir="rtl" className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/purchases')}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm"
          >
            → العودة للقائمة
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-mono">
              {invoice.invoiceNumber}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {new Date(invoice.createdAt).toLocaleString('ar-IQ')}
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[invoice.status] || STATUS_COLORS.DRAFT}`}
        >
          {STATUS_LABELS[invoice.status] || invoice.status}
        </span>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Invoice details */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-4">
        <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-4">بيانات الفاتورة</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-500 dark:text-gray-400 mb-0.5">المورد</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {invoice.supplier?.name || '—'}
            </p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 mb-0.5">العملة</p>
            <p className="font-medium text-gray-900 dark:text-white">{currencyLabel}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 mb-0.5">سعر الصرف</p>
            <p className="font-medium text-gray-900 dark:text-white font-mono">
              {Number(invoice.exchangeRate).toLocaleString('ar-IQ', { minimumFractionDigits: 3 })}
            </p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 mb-0.5">أنشأ بواسطة</p>
            <p className="font-medium text-gray-900 dark:text-white">{invoice.createdBy?.name}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 mb-0.5">آخر تحديث</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {new Date(invoice.updatedAt).toLocaleString('ar-IQ')}
            </p>
          </div>
          {invoice.notes && (
            <div className="col-span-2 sm:col-span-3">
              <p className="text-gray-500 dark:text-gray-400 mb-0.5">ملاحظات</p>
              <p className="font-medium text-gray-900 dark:text-white">{invoice.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Items table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-4">
        <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-4">الأصناف</h2>
        {invoice.items.length === 0 ? (
          <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-4">لا توجد أصناف</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="px-3 py-2 text-right font-medium">الصنف</th>
                  <th className="px-3 py-2 text-right font-medium">الوحدة</th>
                  <th className="px-3 py-2 text-right font-medium">الكمية</th>
                  <th className="px-3 py-2 text-right font-medium">سعر الوحدة</th>
                  <th className="px-3 py-2 text-right font-medium">الإجمالي</th>
                  <th className="px-3 py-2 text-right font-medium">تاريخ الانتهاء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {invoice.items.map((line) => (
                  <tr key={line.id}>
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {line.item.name_ar}
                      </div>
                      {line.item.barcode && (
                        <div className="text-xs text-gray-400 font-mono">{line.item.barcode}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{line.item.unit}</td>
                    <td className="px-3 py-2 text-gray-900 dark:text-white font-mono">
                      {Number(line.quantity).toLocaleString('ar-IQ', { minimumFractionDigits: 3 })}
                    </td>
                    <td className="px-3 py-2 text-gray-900 dark:text-white font-mono">
                      {Number(line.unitCost).toLocaleString('ar-IQ', { minimumFractionDigits: 3 })}
                    </td>
                    <td className="px-3 py-2 font-medium text-gray-900 dark:text-white font-mono">
                      {Number(line.subtotal).toLocaleString('ar-IQ', { minimumFractionDigits: 3 })}
                    </td>
                    <td className="px-3 py-2 text-gray-500 dark:text-gray-400">
                      {line.expiryDate
                        ? new Date(line.expiryDate).toLocaleDateString('ar-IQ')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
        <div className="flex justify-end">
          <div className="w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>المجموع الفرعي</span>
              <span className="font-mono">
                {Number(invoice.subtotal).toLocaleString('ar-IQ', { minimumFractionDigits: 3 })}{' '}
                {currencyLabel}
              </span>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>الخصم</span>
              <span className="font-mono text-red-500">
                -{Number(invoice.discount).toLocaleString('ar-IQ', { minimumFractionDigits: 3 })}{' '}
                {currencyLabel}
              </span>
            </div>
            <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 pt-2">
              <span>الإجمالي</span>
              <span className="font-mono">
                {Number(invoice.total).toLocaleString('ar-IQ', { minimumFractionDigits: 3 })}{' '}
                {currencyLabel}
              </span>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>المدفوع</span>
              <span className="font-mono">
                {Number(invoice.amountPaid).toLocaleString('ar-IQ', { minimumFractionDigits: 3 })}{' '}
                {currencyLabel}
              </span>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>الرصيد المتبقي</span>
              <span className={`font-mono ${Number(invoice.balance) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {Number(invoice.balance).toLocaleString('ar-IQ', { minimumFractionDigits: 3 })}{' '}
                {currencyLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {invoice.status !== 'CANCELLED' && invoice.status !== 'RETURNED' && (
        <div className="flex gap-3 justify-end pb-6">
          {invoice.status === 'DRAFT' && (
            <button
              onClick={handleConfirm}
              disabled={actionLoading !== null}
              className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {actionLoading === 'confirm' ? 'جار التأكيد...' : 'تأكيد الفاتورة'}
            </button>
          )}
          <button
            onClick={handleCancel}
            disabled={actionLoading !== null}
            className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {actionLoading === 'cancel' ? 'جار الإلغاء...' : 'إلغاء الفاتورة'}
          </button>
        </div>
      )}
    </div>
  )
}
