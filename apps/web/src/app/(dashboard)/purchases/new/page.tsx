'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { purchasesService } from '@/services/purchases.service'
import api from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SupplierOption {
  id: string
  name: string
  currency: string
}

interface SupplierDetail {
  balance: number
  phone: string | null
}

interface ItemOption {
  id: string
  name_ar: string
  name_en: string
  barcode: string | null
  unit: string
  costPrice: number
  stockQty: number
}

interface LineItem {
  key: number
  itemId: string
  itemName: string
  barcode: string
  unit: string
  quantity: number
  unitCost: number
  discount: number
  subtotal: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcLineSubtotal(quantity: number, unitCost: number, discount: number): number {
  const gross = quantity * unitCost
  return gross - gross * (discount / 100)
}

let keyCounter = 0
function nextKey() {
  return ++keyCounter
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewPurchasePage() {
  const router = useRouter()

  // ── Supplier search
  const [supplierSearch, setSupplierSearch] = useState('')
  const [supplierOptions, setSupplierOptions] = useState<SupplierOption[]>([])
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierOption | null>(null)
  const [supplierDetail, setSupplierDetail] = useState<SupplierDetail | null>(null)
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false)
  const supplierRef = useRef<HTMLDivElement>(null)

  // ── Item search
  const [itemSearch, setItemSearch] = useState('')
  const [itemOptions, setItemOptions] = useState<ItemOption[]>([])
  const [showItemDropdown, setShowItemDropdown] = useState(false)
  const itemRef = useRef<HTMLDivElement>(null)

  // ── Form state
  const [currency, setCurrency] = useState<'IQD' | 'USD'>('IQD')
  const [exchangeRate, setExchangeRate] = useState<number>(1480)

  // Load exchange rate from settings on mount
  useEffect(() => {
    api.get('/api/settings').then((r) => {
      const rate = Number(r.data?.data?.exchange_rate)
      if (rate > 0) setExchangeRate(rate)
    }).catch(() => {})
  }, [])
  const [invoiceDiscount, setInvoiceDiscount] = useState<number>(0)
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<LineItem[]>([])

  // ── UI state
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')

  // ─── Supplier search ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!supplierSearch.trim()) {
      setSupplierOptions([])
      setShowSupplierDropdown(false)
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.get('/api/suppliers', { params: { search: supplierSearch, pageSize: 10 } })
        setSupplierOptions(res.data.data?.suppliers || [])
        setShowSupplierDropdown(true)
      } catch {
        setSupplierOptions([])
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [supplierSearch])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (supplierRef.current && !supplierRef.current.contains(e.target as Node)) {
        setShowSupplierDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function selectSupplier(s: SupplierOption) {
    setSelectedSupplier(s)
    setSupplierSearch(s.name)
    setShowSupplierDropdown(false)
  }

  function clearSupplier() {
    setSelectedSupplier(null)
    setSupplierSearch('')
    setSupplierDetail(null)
  }

  useEffect(() => {
    if (!selectedSupplier) return
    api.get(`/api/suppliers/${selectedSupplier.id}`).then((r) => {
      const s = r.data?.data
      if (s) setSupplierDetail({ balance: Number(s.balance), phone: s.phone ?? null })
    }).catch(() => setSupplierDetail(null))
  }, [selectedSupplier])

  // ─── Item search ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!itemSearch.trim()) {
      setItemOptions([])
      setShowItemDropdown(false)
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.get('/api/items', { params: { search: itemSearch, pageSize: 10 } })
        setItemOptions(res.data.data?.items || [])
        setShowItemDropdown(true)
      } catch {
        setItemOptions([])
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [itemSearch])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (itemRef.current && !itemRef.current.contains(e.target as Node)) {
        setShowItemDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function addItem(item: ItemOption) {
    const existing = lines.findIndex((l) => l.itemId === item.id)
    if (existing !== -1) {
      // Increment quantity if already added
      setLines((prev) =>
        prev.map((l, i) =>
          i === existing
            ? {
                ...l,
                quantity: l.quantity + 1,
                subtotal: calcLineSubtotal(l.quantity + 1, l.unitCost, l.discount),
              }
            : l
        )
      )
    } else {
      const unitCost = Number(item.costPrice) || 0
      const line: LineItem = {
        key: nextKey(),
        itemId: item.id,
        itemName: item.name_ar || item.name_en,
        barcode: item.barcode || '',
        unit: item.unit,
        quantity: 1,
        unitCost,
        discount: 0,
        subtotal: calcLineSubtotal(1, unitCost, 0),
      }
      setLines((prev) => [...prev, line])
    }
    setItemSearch('')
    setShowItemDropdown(false)
  }

  function updateLine(key: number, field: 'quantity' | 'unitCost' | 'discount', value: number) {
    setLines((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l
        const updated = { ...l, [field]: value }
        updated.subtotal = calcLineSubtotal(updated.quantity, updated.unitCost, updated.discount)
        return updated
      })
    )
  }

  function removeLine(key: number) {
    setLines((prev) => prev.filter((l) => l.key !== key))
  }

  // ─── Totals ────────────────────────────────────────────────────────────────

  const subtotal = lines.reduce((sum, l) => sum + l.subtotal, 0)
  const discountAmount = subtotal * (invoiceDiscount / 100)
  const total = subtotal - discountAmount

  // ─── Build payload ─────────────────────────────────────────────────────────

  function buildPayload() {
    if (!selectedSupplier) throw new Error('يرجى اختيار مورد')
    if (lines.length === 0) throw new Error('يرجى إضافة صنف واحد على الأقل')
    return {
      supplierId: selectedSupplier.id,
      currency,
      exchangeRate,
      discount: invoiceDiscount,
      notes: notes || null,
      items: lines.map((l) => ({
        itemId: l.itemId,
        quantity: l.quantity,
        unitCost: l.unitCost,
        discount: l.discount,
      })),
    }
  }

  // ─── Save as draft ─────────────────────────────────────────────────────────

  async function handleSaveDraft() {
    setError('')
    setSaving(true)
    try {
      const payload = buildPayload()
      const res = await purchasesService.create(payload)
      router.push(`/purchases/${res.data.id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'فشل في حفظ الفاتورة')
    } finally {
      setSaving(false)
    }
  }

  // ─── Create + confirm ──────────────────────────────────────────────────────

  async function handleConfirm() {
    setError('')
    setConfirming(true)
    try {
      const payload = buildPayload()
      const createRes = await purchasesService.create(payload)
      const invoiceId = createRes.data.id
      await purchasesService.confirm(invoiceId)
      router.push(`/purchases/${invoiceId}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'فشل في تأكيد الفاتورة')
    } finally {
      setConfirming(false)
    }
  }

  const isSubmitting = saving || confirming

  return (
    <div dir="rtl" className="max-w-5xl">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          → رجوع
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">فاتورة شراء جديدة</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* ── Header fields ── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-4">بيانات الفاتورة</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            {/* Supplier */}
            <div className="sm:col-span-2 lg:col-span-1" ref={supplierRef}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                المورد <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={supplierSearch}
                  onChange={(e) => {
                    setSupplierSearch(e.target.value)
                    if (selectedSupplier) clearSupplier()
                  }}
                  placeholder="ابحث باسم المورد..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
                {showSupplierDropdown && supplierOptions.length > 0 && (
                  <ul className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {supplierOptions.map((s) => (
                      <li
                        key={s.id}
                        onMouseDown={() => selectSupplier(s)}
                        className="px-3 py-2 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 text-sm text-gray-900 dark:text-white"
                      >
                        {s.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {selectedSupplier && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                    ✓ {selectedSupplier.name}
                  </p>
                  {supplierDetail && (
                    <div className="flex gap-4 text-xs text-gray-500">
                      <span>
                        الرصيد:&nbsp;
                        <span className={supplierDetail.balance > 0 ? 'text-red-500 font-medium' : 'text-green-600 font-medium'}>
                          {supplierDetail.balance.toLocaleString('ar-IQ')} {currency}
                        </span>
                      </span>
                      {supplierDetail.phone && <span>📞 {supplierDetail.phone}</span>}
                    </div>
                  )}
                  <button onClick={clearSupplier} className="text-xs text-red-400 hover:text-red-600">تغيير المورد</button>
                </div>
              )}
            </div>

            {/* Currency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                العملة
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as 'IQD' | 'USD')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="IQD">دينار عراقي (IQD)</option>
                <option value="USD">دولار أمريكي (USD)</option>
              </select>
            </div>

            {/* Exchange rate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                سعر الصرف
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>

            {/* Invoice discount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                خصم الفاتورة (%)
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                max="100"
                value={invoiceDiscount}
                onChange={(e) => setInvoiceDiscount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>

            {/* Notes */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                ملاحظات
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ملاحظات اختيارية..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
          </div>
        </div>

        {/* ── Items section ── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-4">الأصناف</h2>

          {/* Item search */}
          <div className="mb-4" ref={itemRef}>
            <div className="relative max-w-md">
              <input
                type="text"
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder="ابحث بالاسم أو الباركود لإضافة صنف..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
              {showItemDropdown && itemOptions.length > 0 && (
                <ul className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {itemOptions.map((item) => (
                    <li
                      key={item.id}
                      onMouseDown={() => addItem(item)}
                      className="px-3 py-2 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 text-sm border-b border-gray-100 dark:border-gray-600 last:border-0"
                    >
                      <div className="font-medium text-gray-900 dark:text-white">{item.name_ar}</div>
                      <div className="flex items-center justify-between mt-0.5">
                        <div className="flex items-center gap-3">
                          {item.barcode && (
                            <span className="text-xs text-gray-400 font-mono">{item.barcode}</span>
                          )}
                          <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                            {Number(item.costPrice).toLocaleString('ar-IQ', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} {currency}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">
                          مخزون: {Number(item.stockQty).toLocaleString('ar-IQ')}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Lines table */}
          {lines.length === 0 ? (
            <div className="p-6 text-center text-gray-400 dark:text-gray-500 text-sm border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
              لم يتم إضافة أصناف بعد — ابحث عن صنف أعلاه لإضافته
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  <tr>
                    <th className="px-3 py-2 text-right font-medium">الصنف</th>
                    <th className="px-3 py-2 text-right font-medium">الوحدة</th>
                    <th className="px-3 py-2 text-right font-medium w-28">الكمية</th>
                    <th className="px-3 py-2 text-right font-medium w-36">سعر الوحدة</th>
                    <th className="px-3 py-2 text-right font-medium w-24">خصم %</th>
                    <th className="px-3 py-2 text-right font-medium w-36">الإجمالي</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {lines.map((line) => (
                    <tr key={line.key}>
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-900 dark:text-white">{line.itemName}</div>
                        {line.barcode && (
                          <div className="text-xs text-gray-400 font-mono">{line.barcode}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{line.unit}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="0.001"
                          min="0.001"
                          value={line.quantity}
                          onChange={(e) => updateLine(line.key, 'quantity', Number(e.target.value))}
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm text-left"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          value={line.unitCost}
                          onChange={(e) => updateLine(line.key, 'unitCost', Number(e.target.value))}
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm text-left"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          max="100"
                          value={line.discount}
                          onChange={(e) => updateLine(line.key, 'discount', Number(e.target.value))}
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm text-left"
                        />
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-900 dark:text-white text-left">
                        {line.subtotal.toLocaleString('ar-IQ', { minimumFractionDigits: 3 })}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => removeLine(line.key)}
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
            </div>
          )}
        </div>

        {/* ── Summary ── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-2 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>المجموع الفرعي</span>
                <span className="font-mono">
                  {subtotal.toLocaleString('ar-IQ', { minimumFractionDigits: 3 })} {currency}
                </span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>الخصم ({invoiceDiscount}%)</span>
                <span className="font-mono text-red-500">
                  -{discountAmount.toLocaleString('ar-IQ', { minimumFractionDigits: 3 })} {currency}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 pt-2">
                <span>الإجمالي</span>
                <span className="font-mono">
                  {total.toLocaleString('ar-IQ', { minimumFractionDigits: 3 })} {currency}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="flex gap-3 justify-end pb-6">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="px-5 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm disabled:opacity-50 transition-colors"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSubmitting}
            className="px-5 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {saving ? 'جار الحفظ...' : 'حفظ مسودة'}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {confirming ? 'جار التأكيد...' : 'تأكيد الفاتورة'}
          </button>
        </div>
      </div>
    </div>
  )
}
