'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { purchasesService } from '@/services/purchases.service'

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'مسودة',
  CONFIRMED: 'مؤكدة',
  CANCELLED: 'ملغاة',
}

interface InvoiceLine {
  id: string
  quantity: number
  unitCost: number
  subtotal: number
  currency: string
  expiryDate: string | null
  item: { id: string; name_ar: string; name_en: string; barcode: string | null; unit: string }
}

interface PurchaseInvoice {
  id: string
  invoiceNumber: string
  supplier: { id: string; name: string; currency: string } | null
  currency: 'IQD' | 'USD'
  exchangeRate: number
  subtotal: number
  discount: number
  total: number
  amountPaid: number
  balance: number
  notes: string | null
  status: string
  createdAt: string
  createdBy: { id: string; name: string; username: string }
  items: InvoiceLine[]
}

export default function PrintPurchasePage() {
  const params = useParams()
  const id = params.id as string
  const [invoice, setInvoice] = useState<PurchaseInvoice | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    purchasesService.getById(id)
      .then((res) => {
        setInvoice(res.data)
        setTimeout(() => window.print(), 500)
      })
      .catch(() => setError('فشل في تحميل الفاتورة'))
  }, [id])

  if (error) return <div dir="rtl" className="p-8 text-red-600">{error}</div>
  if (!invoice) return <div dir="rtl" className="p-8 text-center text-gray-500">جار التحميل...</div>

  const currencyLabel = invoice.currency === 'USD' ? 'دولار' : 'دينار'

  return (
    <>
      <style>{`
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
          @page { margin: 10mm; size: A4; }
        }
        body { font-family: 'Segoe UI', Tahoma, sans-serif; }
      `}</style>

      <div className="no-print fixed top-4 left-4 flex gap-2 z-10">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          🖨️ طباعة
        </button>
        <button
          onClick={() => window.close()}
          className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
        >
          إغلاق
        </button>
      </div>

      <div dir="rtl" className="max-w-2xl mx-auto p-8 bg-white text-gray-900">
        {/* Header */}
        <div className="text-center mb-6 border-b-2 border-gray-800 pb-4">
          <h1 className="text-2xl font-bold">IMS-Pro</h1>
          <p className="text-sm text-gray-500 mt-1">فاتورة شراء</p>
        </div>

        {/* Invoice meta */}
        <div className="flex justify-between items-start mb-6">
          <div className="space-y-1 text-sm">
            <div>
              <span className="text-gray-500">رقم الفاتورة: </span>
              <span className="font-bold font-mono">{invoice.invoiceNumber}</span>
            </div>
            <div>
              <span className="text-gray-500">التاريخ: </span>
              <span>{new Date(invoice.createdAt).toLocaleString('ar-IQ')}</span>
            </div>
            <div>
              <span className="text-gray-500">الحالة: </span>
              <span className="font-medium">{STATUS_LABELS[invoice.status] ?? invoice.status}</span>
            </div>
            <div>
              <span className="text-gray-500">العملة: </span>
              <span>{currencyLabel}</span>
            </div>
            <div>
              <span className="text-gray-500">سعر الصرف: </span>
              <span className="font-mono">{Number(invoice.exchangeRate).toLocaleString('ar-IQ')}</span>
            </div>
          </div>
          <div className="space-y-1 text-sm text-left">
            <div>
              <span className="text-gray-500">المورد: </span>
              <span className="font-medium">{invoice.supplier?.name ?? '—'}</span>
            </div>
            <div>
              <span className="text-gray-500">المحرر: </span>
              <span>{invoice.createdBy.name}</span>
            </div>
          </div>
        </div>

        {/* Items table */}
        <table className="w-full text-sm mb-6 border-collapse">
          <thead>
            <tr className="bg-gray-100 border border-gray-300">
              <th className="px-3 py-2 text-right font-medium border border-gray-300">#</th>
              <th className="px-3 py-2 text-right font-medium border border-gray-300">الصنف</th>
              <th className="px-3 py-2 text-center font-medium border border-gray-300 w-16">الوحدة</th>
              <th className="px-3 py-2 text-center font-medium border border-gray-300 w-20">الكمية</th>
              <th className="px-3 py-2 text-center font-medium border border-gray-300 w-28">سعر الوحدة</th>
              <th className="px-3 py-2 text-center font-medium border border-gray-300 w-28">الإجمالي</th>
              <th className="px-3 py-2 text-center font-medium border border-gray-300 w-24">الانتهاء</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((line, idx) => (
              <tr key={line.id} className="border border-gray-300">
                <td className="px-3 py-2 text-center border border-gray-300 text-gray-500">{idx + 1}</td>
                <td className="px-3 py-2 border border-gray-300">
                  <div className="font-medium">{line.item.name_ar}</div>
                  {line.item.barcode && (
                    <div className="text-xs text-gray-400 font-mono">{line.item.barcode}</div>
                  )}
                </td>
                <td className="px-3 py-2 text-center border border-gray-300 text-gray-500">
                  {line.item.unit}
                </td>
                <td className="px-3 py-2 text-center border border-gray-300">
                  {Number(line.quantity).toLocaleString('ar-IQ', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                </td>
                <td className="px-3 py-2 text-center border border-gray-300">
                  {Number(line.unitCost).toLocaleString('ar-IQ', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                </td>
                <td className="px-3 py-2 text-center border border-gray-300 font-medium">
                  {Number(line.subtotal).toLocaleString('ar-IQ', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                </td>
                <td className="px-3 py-2 text-center border border-gray-300 text-gray-500 text-xs">
                  {line.expiryDate ? new Date(line.expiryDate).toLocaleDateString('ar-IQ') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-6">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">المجموع الفرعي</span>
              <span>{Number(invoice.subtotal).toLocaleString('ar-IQ', { minimumFractionDigits: 3 })} {currencyLabel}</span>
            </div>
            {Number(invoice.discount) > 0 && (
              <div className="flex justify-between text-red-600">
                <span>الخصم</span>
                <span>- {Number(invoice.discount).toLocaleString('ar-IQ', { minimumFractionDigits: 3 })} {currencyLabel}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold border-t border-gray-400 pt-1 mt-1">
              <span>الإجمالي</span>
              <span>{Number(invoice.total).toLocaleString('ar-IQ', { minimumFractionDigits: 3 })} {currencyLabel}</span>
            </div>
            {Number(invoice.amountPaid) > 0 && (
              <div className="flex justify-between text-green-700">
                <span>المدفوع</span>
                <span>{Number(invoice.amountPaid).toLocaleString('ar-IQ', { minimumFractionDigits: 3 })} {currencyLabel}</span>
              </div>
            )}
            <div className="flex justify-between text-red-600">
              <span>الرصيد المتبقي</span>
              <span>{Number(invoice.balance).toLocaleString('ar-IQ', { minimumFractionDigits: 3 })} {currencyLabel}</span>
            </div>
          </div>
        </div>

        {invoice.notes && (
          <div className="border border-gray-300 rounded p-3 text-sm text-gray-600 mb-6">
            <span className="font-medium">ملاحظات: </span>
            {invoice.notes}
          </div>
        )}

        <div className="border-t border-gray-300 pt-4 text-center text-xs text-gray-400">
          شكراً لتعاملكم معنا
        </div>
      </div>
    </>
  )
}
