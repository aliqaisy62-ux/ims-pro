'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { salesService } from '@/services/sales.service'

type PriceType = 'RETAIL' | 'WHOLESALE' | 'SPECIAL' | 'DOLLAR' | 'DINAR'
type Currency = 'USD' | 'IQD'
type PaymentType = 'CASH' | 'CREDIT'

const PRICE_TYPE_LABELS: Record<PriceType, string> = {
  RETAIL: 'مفرد',
  WHOLESALE: 'جملة',
  SPECIAL: 'خاص',
  DOLLAR: 'دولار',
  DINAR: 'دينار',
}

const PRICE_TYPE_FIELD: Record<PriceType, string> = {
  RETAIL: 'retailPrice',
  WHOLESALE: 'wholesalePrice',
  SPECIAL: 'specialPrice',
  DOLLAR: 'dollarPrice',
  DINAR: 'dinarPrice',
}

interface InvoiceLine {
  itemId: string
  nameAr: string
  nameEn: string
  barcode: string
  quantity: number
  unitPrice: number
  discount: number
  lineTotal: number
}

interface CustomerOption {
  id: string
  name: string
  currency: string
}

function resolveItemPrice(item: Record<string, number>, priceType: PriceType, currency: Currency, exchangeRate: number): number {
  const field = PRICE_TYPE_FIELD[priceType]
  const raw = item[field] ?? 0
  if (priceType === 'DOLLAR' && currency === 'IQD') {
    return raw * exchangeRate
  }
  return raw
}

function calcLineTotal(qty: number, price: number, discount: number): number {
  return qty * price * (1 - discount / 100)
}

export default function NewSalesInvoicePage() {
  const router = useRouter()
  const barcodeRef = useRef<HTMLInputElement>(null)

  const [lines, setLines] = useState<InvoiceLine[]>([])
  const [priceType, setPriceType] = useState<PriceType>('RETAIL')
  const [currency, setCurrency] = useState<Currency>('IQD')
  const [exchangeRate, setExchangeRate] = useState<number>(1480)
  const [paymentType, setPaymentType] = useState<PaymentType>('CASH')
  const [discount, setDiscount] = useState<number>(0)
  const [notes, setNotes] = useState('')
  const [customerId, setCustomerId] = useState<string>('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([])
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [selectedCustomerName, setSelectedCustomerName] = useState('')
  const [barcodeInput, setBarcodeInput] = useState('')
  const [barcodeError, setBarcodeError] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Auto-focus barcode on mount
  useEffect(() => {
    barcodeRef.current?.focus()
  }, [])

  // Subtotal and total calculations
  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0)
  const discountAmount = subtotal * (discount / 100)
  const total = subtotal - discountAmount

  const searchCustomers = useCallback(async (q: string) => {
    if (!q.trim()) { setCustomerOptions([]); return }
    try {
      const res = await api.get('/api/customers', { params: { search: q, pageSize: 10 } })
      setCustomerOptions(res.data.data?.customers ?? [])
    } catch {
      setCustomerOptions([])
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => { searchCustomers(customerSearch) }, 300)
    return () => clearTimeout(t)
  }, [customerSearch, searchCustomers])

  async function handleBarcodeSubmit(e: React.FormEvent) {
    e.preventDefault()
    const barcode = barcodeInput.trim()
    if (!barcode) return
    setBarcodeError('')
    try {
      const res = await api.get(`/api/items/barcode/${barcode}`)
      const item = res.data.data
      if (!item) { setBarcodeError('المنتج غير موجود'); return }

      const price = resolveItemPrice(item, priceType, currency, exchangeRate)
      const existingIdx = lines.findIndex((l) => l.itemId === item.id)

      if (existingIdx >= 0) {
        setLines((prev) => prev.map((l, i) => {
          if (i !== existingIdx) return l
          const newQty = l.quantity + 1
          return { ...l, quantity: newQty, lineTotal: calcLineTotal(newQty, l.unitPrice, l.discount) }
        }))
      } else {
        setLines((prev) => [
          ...prev,
          {
            itemId: item.id,
            nameAr: item.name_ar,
            nameEn: item.name_en,
            barcode: item.barcode ?? '',
            quantity: 1,
            unitPrice: price,
            discount: 0,
            lineTotal: calcLineTotal(1, price, 0),
          },
        ])
      }
      setBarcodeInput('')
      barcodeRef.current?.focus()
    } catch {
      setBarcodeError('لم يتم العثور على المنتج بهذا الباركود')
    }
  }

  function updateLine(idx: number, field: 'quantity' | 'discount', value: number) {
    setLines((prev) => prev.map((l, i) => {
      if (i !== idx) return l
      const qty = field === 'quantity' ? value : l.quantity
      const disc = field === 'discount' ? value : l.discount
      return { ...l, [field]: value, lineTotal: calcLineTotal(qty, l.unitPrice, disc) }
    }))
  }

  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx))
  }

  function buildPayload() {
    return {
      customerId: customerId || null,
      priceType,
      paymentType,
      currency,
      exchangeRate,
      discount,
      notes: notes || undefined,
      items: lines.map((l) => ({
        itemId: l.itemId,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        discount: l.discount,
      })),
    }
  }

  async function handleDraft() {
    if (lines.length === 0) { setSubmitError('أضف صنفاً واحداً على الأقل'); return }
    setLoading(true)
    setSubmitError('')
    try {
      await salesService.create(buildPayload())
      router.push('/sales')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل في حفظ المسودة'
      setSubmitError(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm() {
    if (lines.length === 0) { setSubmitError('أضف صنفاً واحداً على الأقل'); return }
    if (paymentType === 'CREDIT' && !customerId) { setSubmitError('الفاتورة الآجلة تتطلب تحديد عميل'); return }
    setLoading(true)
    setSubmitError('')
    try {
      const created = await salesService.create(buildPayload())
      const invoiceId = created.data?.id
      if (!invoiceId) throw new Error('فشل في إنشاء الفاتورة')
      await salesService.confirm(invoiceId)
      router.push(`/sales/${invoiceId}`)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      const msg = axiosErr.response?.data?.error ?? (err instanceof Error ? err.message : 'فشل في تأكيد الفاتورة')
      setSubmitError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div dir="rtl" className="max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700 text-sm">
          ← رجوع
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">فاتورة مبيعات جديدة</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Right column: settings */}
        <div className="lg:col-span-1 space-y-4">
          {/* Price type */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">نوع السعر</h2>
            <div className="space-y-2">
              {(Object.keys(PRICE_TYPE_LABELS) as PriceType[]).map((pt) => (
                <label key={pt} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="priceType"
                    value={pt}
                    checked={priceType === pt}
                    onChange={() => setPriceType(pt)}
                    className="accent-blue-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{PRICE_TYPE_LABELS[pt]}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Currency + exchange rate */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">العملة</h2>
            <div className="flex gap-3 mb-3">
              {(['IQD', 'USD'] as Currency[]).map((c) => (
                <label key={c} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="currency"
                    value={c}
                    checked={currency === c}
                    onChange={() => setCurrency(c)}
                    className="accent-blue-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {c === 'IQD' ? 'دينار عراقي' : 'دولار أمريكي'}
                  </span>
                </label>
              ))}
            </div>
            <label className="block text-xs text-gray-500 mb-1">سعر الصرف (IQD)</label>
            <input
              type="number"
              min="1"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>

          {/* Payment type */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">طريقة الدفع</h2>
            <div className="flex gap-4">
              {(['CASH', 'CREDIT'] as PaymentType[]).map((pt) => (
                <label key={pt} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentType"
                    value={pt}
                    checked={paymentType === pt}
                    onChange={() => setPaymentType(pt)}
                    className="accent-blue-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {pt === 'CASH' ? 'نقدي' : 'آجل'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Customer selector */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 relative">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              العميل {paymentType === 'CREDIT' && <span className="text-red-500">*</span>}
            </h2>
            {selectedCustomerName ? (
              <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/30 rounded-lg px-3 py-2">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{selectedCustomerName}</span>
                <button
                  type="button"
                  onClick={() => { setCustomerId(''); setSelectedCustomerName(''); setCustomerSearch('') }}
                  className="text-red-500 hover:text-red-700 text-xs mr-2"
                >
                  حذف
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="بحث باسم العميل..."
                  value={customerSearch}
                  onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true) }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
                {showCustomerDropdown && customerOptions.length > 0 && (
                  <div className="absolute z-10 right-4 left-4 top-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {customerOptions.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={() => {
                          setCustomerId(c.id)
                          setSelectedCustomerName(c.name)
                          setCustomerSearch('')
                          setShowCustomerDropdown(false)
                        }}
                        className="w-full text-right px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Invoice discount */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">خصم الفاتورة %</h2>
            <input
              type="number"
              min="0"
              max="100"
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>

          {/* Notes */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">ملاحظات</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
        </div>

        {/* Left columns: barcode + items */}
        <div className="lg:col-span-2 space-y-4">
          {/* Barcode input */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">مسح الباركود / إضافة صنف</h2>
            <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
              <input
                ref={barcodeRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="امسح الباركود أو أدخله يدوياً..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                إضافة
              </button>
            </form>
            {barcodeError && (
              <p className="text-red-500 text-xs mt-2">{barcodeError}</p>
            )}
          </div>

          {/* Items table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            {lines.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                لم يتم إضافة أي أصناف بعد — امسح الباركود للبدء
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  <tr>
                    <th className="px-3 py-3 text-right font-medium">الصنف</th>
                    <th className="px-3 py-3 text-right font-medium w-24">الكمية</th>
                    <th className="px-3 py-3 text-right font-medium w-28">سعر الوحدة</th>
                    <th className="px-3 py-3 text-right font-medium w-20">خصم%</th>
                    <th className="px-3 py-3 text-right font-medium w-28">الإجمالي</th>
                    <th className="px-3 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {lines.map((line, idx) => (
                    <tr key={line.itemId}>
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-900 dark:text-white">{line.nameAr}</div>
                        <div className="text-xs text-gray-400 font-mono">{line.barcode}</div>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0.001"
                          step="0.001"
                          value={line.quantity}
                          onChange={(e) => updateLine(idx, 'quantity', Number(e.target.value))}
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm text-center"
                        />
                      </td>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300 text-center">
                        {line.unitPrice.toLocaleString('ar-IQ', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={line.discount}
                          onChange={(e) => updateLine(idx, 'discount', Number(e.target.value))}
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm text-center"
                        />
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-900 dark:text-white text-center">
                        {line.lineTotal.toLocaleString('ar-IQ', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          className="text-red-500 hover:text-red-700 text-lg leading-none"
                          title="حذف"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Summary */}
          {lines.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>المجموع الفرعي</span>
                  <span className="font-medium">{subtotal.toLocaleString('ar-IQ', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} {currency}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-red-500">
                    <span>الخصم ({discount}%)</span>
                    <span>- {discountAmount.toLocaleString('ar-IQ', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} {currency}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white border-t border-gray-100 dark:border-gray-700 pt-2 mt-2">
                  <span>الإجمالي</span>
                  <span>{total.toLocaleString('ar-IQ', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} {currency}</span>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {submitError}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleDraft}
              disabled={loading || lines.length === 0}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 dark:text-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 font-medium text-sm"
            >
              {loading ? 'جار الحفظ...' : 'حفظ مسودة'}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading || lines.length === 0}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium text-sm"
            >
              {loading ? 'جار التأكيد...' : 'تأكيد الفاتورة'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
