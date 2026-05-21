'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { salesService } from '@/services/sales.service'

type InvoiceStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED' | 'RETURNED'
type PaymentType = 'CASH' | 'CREDIT'
type PriceType = 'RETAIL' | 'WHOLESALE' | 'SPECIAL' | 'DOLLAR' | 'DINAR'
type Currency = 'USD' | 'IQD'

interface InvoiceItem {
  id: string
  quantity: number
  unitPrice: number
  subtotal: number
  currency: Currency
  item: {
    id: string
    name_ar: string
    name_en: string
    barcode: string | null
  }
}

interface Invoice {
  id: string
  invoiceNumber: string
  type: PaymentType
  priceType: PriceType
  currency: Currency
  exchangeRate: number
  subtotal: number
  discount: number
  total: number
  balance: number
  notes: string | null
  status: InvoiceStatus
  createdAt: string
  customer: { id: string; name: string; currency: string } | null
  createdBy: { id: string; name: string; username: string }
  items: InvoiceItem[]
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

const PRICE_TYPE_LABELS: Record<PriceType, string> = {
  RETAIL: 'مفرد',
  WHOLESALE: 'جملة',
  SPECIAL: 'خاص',
  DOLLAR: 'دولار',
  DINAR: 'دينار',
}

const PAYMENT_LABELS: Record<PaymentType, string> = {
  CASH: 'نقدي',
  CREDIT: 'آجل',
}

export default function SalesInvoiceDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await salesService.getById(id)
      setInvoice(res.data)
    } catch {
      setError('فشل في تحميل الفاتورة')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  async function handleConfirm() {
    setActionLoading(true)
    setActionError('')
    try {
      await salesService.confirm(id)
      await load()
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      setActionError(axiosErr.response?.data?.error ?? 'فشل في تأكيد الفاتورة')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleCancel() {
    if (!confirm('هل أنت متأكد من إلغاء هذه الفاتورة؟')) return
    setActionLoading(true)
    setActionError('')
    try {
      await salesService.cancel(id)
      await load()
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      setActionError(axiosErr.response?.data?.error ?? 'فشل في إلغاء الفاتورة')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleReturn() {
    if (!confirm('هل أنت متأكد من إرجاع هذه الفاتورة؟')) return
    setActionLoading(true)
    setActionError('')
    try {
      await salesService.returnInvoice(id)
      await load()
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      setActionError(axiosErr.response?.data?.error ?? 'فشل في إرجاع الفاتورة')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div dir="rtl" className="flex items-center justify-center min-h-64">
        <div className="text-gray-500">جار التحميل...</div>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div dir="rtl">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
          {error || 'الفاتورة غير موجودة'}
        </div>
        <button onClick={() => router.push('/sales')} className="mt-4 text-blue-600 hover:underline text-sm">
          ← العودة إلى قائمة الفواتير
        </button>
      </div>
    )
  }

  const discountAmount = Number(invoice.subtotal) * (Number(invoice.discount) / 100)

  return (
    <div dir="rtl" className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/sales')} className="text-gray-500 hover:text-gray-700 text-sm">
            ← رجوع
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white font-mono">
              {invoice.invoiceNumber}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {new Date(invoice.createdAt).toLocaleString('ar-IQ')}
            </p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_CLASSES[invoice.status]}`}>
          {STATUS_LABELS[invoice.status]}
        </span>
      </div>

      {/* Action error */}
      {actionError && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {actionError}
        </div>
      )}

      {/* Invoice info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 pb-2">
            معلومات الفاتورة
          </h2>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">نوع الدفع</span>
            <span className="font-medium text-gray-900 dark:text-white">{PAYMENT_LABELS[invoice.type]}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">نوع السعر</span>
            <span className="font-medium text-gray-900 dark:text-white">{PRICE_TYPE_LABELS[invoice.priceType]}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">العملة</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {invoice.currency === 'USD' ? 'دولار أمريكي' : 'دينار عراقي'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">سعر الصرف</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {Number(invoice.exchangeRate).toLocaleString('ar-IQ')} IQD
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">أنشأ بواسطة</span>
            <span className="font-medium text-gray-900 dark:text-white">{invoice.createdBy.name}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 pb-2">
            العميل والمبالغ
          </h2>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">العميل</span>
            <span className="font-medium text-gray-900 dark:text-white">{invoice.customer?.name ?? 'بدون عميل'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">المجموع الفرعي</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {Number(invoice.subtotal).toLocaleString('ar-IQ', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} {invoice.currency}
            </span>
          </div>
          {Number(invoice.discount) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">الخصم ({Number(invoice.discount)}%)</span>
              <span className="font-medium text-red-500">
                - {discountAmount.toLocaleString('ar-IQ', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} {invoice.currency}
              </span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold border-t border-gray-100 dark:border-gray-700 pt-2">
            <span className="text-gray-700 dark:text-gray-300">الإجمالي</span>
            <span className="text-gray-900 dark:text-white">
              {Number(invoice.total).toLocaleString('ar-IQ', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} {invoice.currency}
            </span>
          </div>
          {invoice.notes && (
            <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-700 rounded p-2 mt-2">
              {invoice.notes}
            </div>
          )}
        </div>
      </div>

      {/* Items table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            الأصناف ({invoice.items.length})
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
            <tr>
              <th className="px-4 py-3 text-right font-medium">الصنف</th>
              <th className="px-4 py-3 text-right font-medium">الباركود</th>
              <th className="px-4 py-3 text-center font-medium">الكمية</th>
              <th className="px-4 py-3 text-center font-medium">سعر الوحدة</th>
              <th className="px-4 py-3 text-center font-medium">الإجمالي</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {invoice.items.map((line) => (
              <tr key={line.id}>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900 dark:text-white">{line.item.name_ar}</div>
                  <div className="text-xs text-gray-400">{line.item.name_en}</div>
                </td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{line.item.barcode ?? '—'}</td>
                <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">
                  {Number(line.quantity).toLocaleString('ar-IQ', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                </td>
                <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">
                  {Number(line.unitPrice).toLocaleString('ar-IQ', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                </td>
                <td className="px-4 py-3 text-center font-medium text-gray-900 dark:text-white">
                  {Number(line.subtotal).toLocaleString('ar-IQ', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Action buttons */}
      {invoice.status === 'DRAFT' && (
        <div className="flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={actionLoading}
            className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium text-sm"
          >
            {actionLoading ? 'جار التأكيد...' : 'تأكيد الفاتورة'}
          </button>
          <button
            onClick={handleCancel}
            disabled={actionLoading}
            className="px-6 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 font-medium text-sm"
          >
            {actionLoading ? 'جار الإلغاء...' : 'إلغاء الفاتورة'}
          </button>
        </div>
      )}

      {invoice.status === 'CONFIRMED' && (
        <div className="flex gap-3">
          <button
            onClick={handleReturn}
            disabled={actionLoading}
            className="px-6 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 font-medium text-sm"
          >
            {actionLoading ? 'جار الإرجاع...' : 'إرجاع الفاتورة'}
          </button>
          <button
            onClick={handleCancel}
            disabled={actionLoading}
            className="px-6 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 font-medium text-sm"
          >
            {actionLoading ? 'جار الإلغاء...' : 'إلغاء الفاتورة'}
          </button>
        </div>
      )}
    </div>
  )
}
