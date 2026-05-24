'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { salesService } from '@/services/sales.service'
import { useSoundFeedback } from '@/hooks/useSoundFeedback'
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner'
import { CameraScanner } from '@/components/barcode/CameraScanner'
import { QuickAddItemModal, type ScannedItem } from '@/components/barcode/QuickAddItemModal'

type PriceType = 'RETAIL' | 'WHOLESALE' | 'SPECIAL' | 'DOLLAR' | 'DINAR'
type Currency = 'USD' | 'IQD'
type PaymentType = 'CASH' | 'CREDIT'

const PRICE_TYPE_LABELS: Record<PriceType, string> = {
  RETAIL: 'مفرد',
  WHOLESALE: 'جملة',
  SPECIAL: 'خاص',
  DOLLAR: '$',
  DINAR: 'دينار',
}

const PRICE_TYPE_FIELD: Record<PriceType, keyof AllPrices> = {
  RETAIL: 'retailPrice',
  WHOLESALE: 'wholesalePrice',
  SPECIAL: 'specialPrice',
  DOLLAR: 'dollarPrice',
  DINAR: 'dinarPrice',
}

interface AllPrices {
  retailPrice: number
  wholesalePrice: number
  specialPrice: number
  dollarPrice: number
  dinarPrice: number
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
  linePriceType: PriceType
  allPrices: AllPrices
}

interface CustomerOption {
  id: string
  name: string
  currency: string
}

interface CustomerDetail {
  balance: number
  creditLimit: number | null
}

interface ItemData extends AllPrices {
  id: string
  name_ar: string
  name_en: string
  barcode: string | null
  stockQty: number
}

function resolvePrice(prices: AllPrices, priceType: PriceType, currency: Currency, exchangeRate: number): number {
  const raw = prices[PRICE_TYPE_FIELD[priceType]] ?? 0
  if (priceType === 'DOLLAR' && currency === 'IQD') return raw * exchangeRate
  return raw
}

function calcLineTotal(qty: number, price: number, discount: number): number {
  return qty * price * (1 - discount / 100)
}

export default function NewSalesInvoicePage() {
  const router = useRouter()
  const barcodeRef = useRef<HTMLInputElement>(null)
  const confirmClickRef = useRef<() => void>(() => {})
  const { playBeep, playBuzz } = useSoundFeedback()

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
  const [customerDetail, setCustomerDetail] = useState<CustomerDetail | null>(null)
  const [barcodeInput, setBarcodeInput] = useState('')
  const [itemSearch, setItemSearch] = useState('')
  const [itemOptions, setItemOptions] = useState<ItemData[]>([])
  const [showItemDropdown, setShowItemDropdown] = useState(false)
  const itemRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'ok' | 'err'>('idle')

  // Camera + quick-add modals
  const [showCamera, setShowCamera] = useState(false)
  const [batchMode, setBatchMode] = useState(true)
  const [lastScannedLabel, setLastScannedLabel] = useState('')
  const [quickAddBarcode, setQuickAddBarcode] = useState<string | null>(null)

  // Pay modal
  const [showPayModal, setShowPayModal] = useState(false)
  const [paidAmount, setPaidAmount] = useState<number>(0)

  useEffect(() => {
    api.get('/api/settings').then((r) => {
      const rate = Number(r.data?.data?.exchange_rate)
      if (rate > 0) setExchangeRate(rate)
    }).catch(() => {})
    barcodeRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!customerId || paymentType !== 'CREDIT') { setCustomerDetail(null); return }
    api.get(`/api/customers/${customerId}`).then((r) => {
      const c = r.data?.data
      if (c) setCustomerDetail({ balance: Number(c.balance), creditLimit: c.creditLimit != null ? Number(c.creditLimit) : null })
    }).catch(() => setCustomerDetail(null))
  }, [customerId, paymentType])

  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0)
  const discountAmount = subtotal * (discount / 100)
  const total = subtotal - discountAmount

  const searchCustomers = useCallback(async (q: string) => {
    if (!q.trim()) { setCustomerOptions([]); return }
    try {
      const res = await api.get('/api/customers', { params: { search: q, pageSize: 10 } })
      setCustomerOptions(res.data.data?.customers ?? [])
    } catch { setCustomerOptions([]) }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => searchCustomers(customerSearch), 300)
    return () => clearTimeout(t)
  }, [customerSearch, searchCustomers])

  useEffect(() => {
    if (!itemSearch.trim()) { setItemOptions([]); setShowItemDropdown(false); return }
    const t = setTimeout(async () => {
      try {
        const res = await api.get('/api/items', { params: { search: itemSearch, pageSize: 10 } })
        setItemOptions(res.data.data?.items ?? [])
        setShowItemDropdown(true)
      } catch { setItemOptions([]) }
    }, 300)
    return () => clearTimeout(t)
  }, [itemSearch])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (itemRef.current && !itemRef.current.contains(e.target as Node)) setShowItemDropdown(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    function onFocusBarcode() { barcodeRef.current?.focus() }
    function onConfirmInvoice() { confirmClickRef.current() }
    document.addEventListener('ims-focus-barcode', onFocusBarcode)
    document.addEventListener('ims-confirm-invoice', onConfirmInvoice)
    return () => {
      document.removeEventListener('ims-focus-barcode', onFocusBarcode)
      document.removeEventListener('ims-confirm-invoice', onConfirmInvoice)
    }
  }, [])

  // Core: add an item to cart (used by barcode, camera, search, quick-add)
  const addItemToCart = useCallback((item: ItemData, overridePriceType?: PriceType) => {
    const pt = overridePriceType ?? priceType
    const prices: AllPrices = {
      retailPrice: Number(item.retailPrice),
      wholesalePrice: Number(item.wholesalePrice),
      specialPrice: Number(item.specialPrice),
      dollarPrice: Number(item.dollarPrice),
      dinarPrice: Number(item.dinarPrice),
    }
    const price = resolvePrice(prices, pt, currency, exchangeRate)

    setLines((prev) => {
      const idx = prev.findIndex((l) => l.itemId === item.id)
      if (idx >= 0) {
        return prev.map((l, i) => {
          if (i !== idx) return l
          const newQty = l.quantity + 1
          return { ...l, quantity: newQty, lineTotal: calcLineTotal(newQty, l.unitPrice, l.discount) }
        })
      }
      return [
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
          linePriceType: pt,
          allPrices: prices,
        },
      ]
    })
  }, [priceType, currency, exchangeRate])

  // Core: process a barcode string (from HID, camera, or manual input)
  const processBarcode = useCallback(async (barcode: string) => {
    setScanStatus('scanning')
    // Visually flash the barcode in the input field so staff see what was scanned
    setBarcodeInput(barcode)
    try {
      const res = await api.get(`/api/items/barcode/${encodeURIComponent(barcode)}`)
      const item = res.data.data
      if (!item) {
        playBuzz()
        setScanStatus('err')
        setLastScannedLabel('')
        setQuickAddBarcode(barcode)
        setTimeout(() => setScanStatus('idle'), 1500)
        return
      }
      addItemToCart(item as ItemData)
      playBeep()
      setScanStatus('ok')
      setLastScannedLabel(item.name_ar || item.name_en || barcode)
      setTimeout(() => setScanStatus('idle'), 800)
    } catch {
      playBuzz()
      setScanStatus('err')
      setLastScannedLabel('')
      setQuickAddBarcode(barcode)
      setTimeout(() => setScanStatus('idle'), 1500)
    }
    setBarcodeInput('')
    setTimeout(() => barcodeRef.current?.focus(), 50)
  }, [addItemToCart, playBeep, playBuzz])

  async function handleBarcodeSubmit(e: React.FormEvent) {
    e.preventDefault()
    const barcode = barcodeInput.trim()
    if (!barcode) return
    await processBarcode(barcode)
  }

  // Global HID scanner listener (fires when focus is NOT on an input)
  useBarcodeScanner({
    onScan: processBarcode,
    enabled: !showCamera && !quickAddBarcode,
    barcodeInputRef: barcodeRef,
  })

  function handleCameraDetect(barcode: string) {
    // In batch mode the scanner stays open; in single mode it closed itself already
    if (!batchMode) setShowCamera(false)
    processBarcode(barcode)
  }

  function handleQuickAdded(item: ScannedItem) {
    setQuickAddBarcode(null)
    addItemToCart(item as ItemData)
    playBeep()
    setScanStatus('ok')
    setTimeout(() => { setScanStatus('idle'); barcodeRef.current?.focus() }, 800)
  }

  function addItemFromSearch(item: ItemData) {
    addItemToCart(item)
    setItemSearch('')
    setShowItemDropdown(false)
  }

  function updateLine(idx: number, field: 'quantity' | 'discount', value: number) {
    setLines((prev) => prev.map((l, i) => {
      if (i !== idx) return l
      const qty = field === 'quantity' ? value : l.quantity
      const disc = field === 'discount' ? value : l.discount
      return { ...l, [field]: value, lineTotal: calcLineTotal(qty, l.unitPrice, disc) }
    }))
  }

  function updateLinePriceType(idx: number, pt: PriceType) {
    setLines((prev) => prev.map((l, i) => {
      if (i !== idx) return l
      const newPrice = resolvePrice(l.allPrices, pt, currency, exchangeRate)
      return { ...l, linePriceType: pt, unitPrice: newPrice, lineTotal: calcLineTotal(l.quantity, newPrice, l.discount) }
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
    setLoading(true); setSubmitError('')
    try {
      await salesService.create(buildPayload())
      router.push('/sales')
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'فشل في حفظ المسودة')
    } finally { setLoading(false) }
  }

  function handleConfirmClick() {
    if (lines.length === 0) { setSubmitError('أضف صنفاً واحداً على الأقل'); return }
    if (paymentType === 'CREDIT' && !customerId) { setSubmitError('الفاتورة الآجلة تتطلب تحديد عميل'); return }
    setSubmitError('')
    if (paymentType === 'CASH') { setPaidAmount(Math.ceil(total)); setShowPayModal(true) }
    else doConfirm(undefined)
  }

  async function doConfirm(amountPaid: number | undefined) {
    setShowPayModal(false); setLoading(true); setSubmitError('')
    try {
      const created = await salesService.create(buildPayload())
      const invoiceId = created.data?.id
      if (!invoiceId) throw new Error('فشل في إنشاء الفاتورة')
      await salesService.confirm(invoiceId, amountPaid != null ? { amountPaid } : undefined)
      router.push(`/sales/${invoiceId}`)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      const msg = axiosErr.response?.data?.error ?? (err instanceof Error ? err.message : 'فشل في تأكيد الفاتورة')
      setSubmitError(msg)
    } finally { setLoading(false) }
  }

  confirmClickRef.current = handleConfirmClick
  const change = paidAmount - total

  const scanBorderClass =
    scanStatus === 'ok' ? 'border-green-400 ring-1 ring-green-300' :
    scanStatus === 'err' ? 'border-red-400 ring-1 ring-red-300' :
    scanStatus === 'scanning' ? 'border-blue-400 ring-1 ring-blue-300' :
    'border-gray-300 dark:border-gray-600'

  return (
    <div dir="rtl" className="max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700 text-sm">← رجوع</button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">فاتورة مبيعات جديدة</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings column */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">نوع السعر</h2>
            <div className="space-y-2">
              {(Object.keys(PRICE_TYPE_LABELS) as PriceType[]).map((pt) => (
                <label key={pt} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="priceType" value={pt} checked={priceType === pt}
                    onChange={() => setPriceType(pt)} className="accent-blue-600" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{PRICE_TYPE_LABELS[pt]}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">العملة</h2>
            <div className="flex gap-3 mb-3">
              {(['IQD', 'USD'] as Currency[]).map((c) => (
                <label key={c} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="currency" value={c} checked={currency === c}
                    onChange={() => setCurrency(c)} className="accent-blue-600" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{c === 'IQD' ? 'دينار عراقي' : 'دولار أمريكي'}</span>
                </label>
              ))}
            </div>
            <label className="block text-xs text-gray-500 mb-1">سعر الصرف (IQD)</label>
            <input type="number" min="1" value={exchangeRate}
              onChange={(e) => setExchangeRate(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">طريقة الدفع</h2>
            <div className="flex gap-4">
              {(['CASH', 'CREDIT'] as PaymentType[]).map((pt) => (
                <label key={pt} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="paymentType" value={pt} checked={paymentType === pt}
                    onChange={() => setPaymentType(pt)} className="accent-blue-600" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{pt === 'CASH' ? 'نقدي' : 'آجل'}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 relative">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              العميل {paymentType === 'CREDIT' && <span className="text-red-500">*</span>}
            </h2>
            {selectedCustomerName ? (
              <div>
                <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/30 rounded-lg px-3 py-2">
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{selectedCustomerName}</span>
                  <button type="button"
                    onClick={() => { setCustomerId(''); setSelectedCustomerName(''); setCustomerSearch(''); setCustomerDetail(null) }}
                    className="text-red-500 hover:text-red-700 text-xs mr-2">حذف</button>
                </div>
                {customerDetail && paymentType === 'CREDIT' && (
                  <div className="mt-2 text-xs space-y-1 px-1">
                    <div className="flex justify-between text-gray-500">
                      <span>الرصيد الحالي</span>
                      <span className={customerDetail.balance > 0 ? 'text-red-500 font-medium' : 'text-green-600 font-medium'}>
                        {customerDetail.balance.toLocaleString('ar-IQ')} {currency}
                      </span>
                    </div>
                    {customerDetail.creditLimit != null && (
                      <div className="flex justify-between text-gray-500">
                        <span>حد الائتمان</span>
                        <span className="font-medium">{customerDetail.creditLimit.toLocaleString('ar-IQ')} {currency}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <>
                <input type="text" placeholder="بحث باسم العميل..." value={customerSearch}
                  onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true) }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                {showCustomerDropdown && customerOptions.length > 0 && (
                  <div className="absolute z-10 right-4 left-4 top-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {customerOptions.map((c) => (
                      <button key={c.id} type="button"
                        onMouseDown={() => { setCustomerId(c.id); setSelectedCustomerName(c.name); setCustomerSearch(''); setShowCustomerDropdown(false) }}
                        className="w-full text-right px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600">
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">خصم الفاتورة %</h2>
            <input type="number" min="0" max="100" value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">ملاحظات</h2>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
          </div>
        </div>

        {/* Items column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">إضافة صنف</h2>

            {/* Barcode input row */}
            <form onSubmit={handleBarcodeSubmit} className="flex gap-2 mb-1">
              <div className="relative flex-1">
                <input
                  ref={barcodeRef}
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="امسح الباركود أو أدخله يدوياً..."
                  autoComplete="off"
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm transition-colors ${scanBorderClass}`}
                />
                {scanStatus === 'ok' && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500 text-lg">✓</span>
                )}
                {scanStatus === 'err' && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500 text-lg">✗</span>
                )}
                {scanStatus === 'scanning' && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2">
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                  </span>
                )}
              </div>
              <button type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium whitespace-nowrap">
                إضافة
              </button>
              <button type="button" onClick={() => setShowCamera(true)}
                title="مسح بالكاميرا"
                className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="hidden sm:inline text-xs">كاميرا</span>
              </button>
            </form>

            <p className="text-xs text-gray-400 dark:text-gray-500 mb-3 pr-1">
              يمكنك استخدام ماسح USB مباشرةً — سيُضاف الصنف تلقائياً
            </p>

            <div className="flex items-center gap-2 my-2">
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-600" />
              <span className="text-xs text-gray-400">أو بحث بالاسم</span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-600" />
            </div>

            <div ref={itemRef} className="relative">
              <input type="text" value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                onFocus={() => { if (itemOptions.length > 0) setShowItemDropdown(true) }}
                placeholder="ابحث باسم الصنف..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              {showItemDropdown && (
                <div className="absolute z-10 right-0 left-0 top-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {itemOptions.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-400 text-center">لا توجد نتائج</div>
                  ) : itemOptions.map((item) => {
                    const price = resolvePrice(item as AllPrices, priceType, currency, exchangeRate)
                    const stock = Number(item.stockQty)
                    return (
                      <button key={item.id} type="button" onMouseDown={() => addItemFromSearch(item)}
                        className="w-full text-right px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 border-b border-gray-100 dark:border-gray-600 last:border-0">
                        <div className="font-medium text-gray-900 dark:text-white">{item.name_ar}</div>
                        <div className="flex items-center justify-between mt-0.5">
                          <div className="flex items-center gap-3">
                            {item.barcode && <span className="text-xs text-gray-400 font-mono">{item.barcode}</span>}
                            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                              {price.toLocaleString('ar-IQ', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} {currency}
                            </span>
                          </div>
                          <span className={`text-xs font-medium ${stock <= 0 ? 'text-red-500' : stock <= 5 ? 'text-amber-500' : 'text-green-600'}`}>
                            مخزون: {stock.toLocaleString('ar-IQ')}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Invoice lines table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            {lines.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                لم يتم إضافة أي أصناف — امسح الباركود أو ابحث بالاسم للبدء
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  <tr>
                    <th className="px-3 py-3 text-right font-medium">الصنف</th>
                    <th className="px-3 py-3 text-center font-medium w-24">الكمية</th>
                    <th className="px-3 py-3 text-center font-medium w-36">سعر الوحدة</th>
                    <th className="px-3 py-3 text-center font-medium w-20">خصم%</th>
                    <th className="px-3 py-3 text-center font-medium w-28">الإجمالي</th>
                    <th className="px-3 py-3 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {lines.map((line, idx) => (
                    <tr key={line.itemId} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-900 dark:text-white">{line.nameAr}</div>
                        <div className="text-xs text-gray-400 font-mono">{line.barcode}</div>
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" min="0.001" step="0.001" value={line.quantity}
                          onChange={(e) => updateLine(idx, 'quantity', Number(e.target.value))}
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm text-center" />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="font-medium text-gray-700 dark:text-gray-300">
                          {line.unitPrice.toLocaleString('ar-IQ', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                        </div>
                        {/* Per-line price type toggle */}
                        <div className="flex gap-0.5 justify-center mt-1 flex-wrap">
                          {(Object.keys(PRICE_TYPE_LABELS) as PriceType[]).map((pt) => (
                            <button key={pt} type="button"
                              onClick={() => updateLinePriceType(idx, pt)}
                              className={`px-1 py-0 text-[10px] rounded leading-4 transition-colors ${
                                line.linePriceType === pt
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-500'
                              }`}>
                              {PRICE_TYPE_LABELS[pt]}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" min="0" max="100" value={line.discount}
                          onChange={(e) => updateLine(idx, 'discount', Number(e.target.value))}
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm text-center" />
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-900 dark:text-white text-center">
                        {line.lineTotal.toLocaleString('ar-IQ', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button type="button" onClick={() => removeLine(idx)}
                          className="text-red-400 hover:text-red-600 text-xl leading-none" title="حذف">×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

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

          {submitError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 rounded-lg px-4 py-3 text-sm">
              {submitError}
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={handleDraft} disabled={loading || lines.length === 0}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 dark:text-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 font-medium text-sm">
              {loading ? 'جار الحفظ...' : 'حفظ مسودة'}
            </button>
            <button type="button" onClick={handleConfirmClick} disabled={loading || lines.length === 0}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium text-sm">
              {loading ? 'جار التأكيد...' : 'تأكيد الفاتورة'}
            </button>
          </div>
        </div>
      </div>

      {/* Camera scanner dialog */}
      <CameraScanner
        open={showCamera}
        onDetect={handleCameraDetect}
        onClose={() => { setShowCamera(false); setTimeout(() => barcodeRef.current?.focus(), 100) }}
        batchMode={batchMode}
        onBatchModeChange={setBatchMode}
        lastScannedLabel={lastScannedLabel}
      />

      {/* Quick add item modal */}
      {quickAddBarcode && (
        <QuickAddItemModal
          barcode={quickAddBarcode}
          onAdded={handleQuickAdded}
          onClose={() => { setQuickAddBarcode(null); setScanStatus('idle'); barcodeRef.current?.focus() }}
        />
      )}

      {/* Cash payment modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div dir="rtl" className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">تسوية الدفع النقدي</h2>
            <div className="space-y-3 mb-5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">المبلغ المستحق</span>
                <span className="font-bold text-gray-900 dark:text-white text-base">
                  {total.toLocaleString('ar-IQ', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} {currency}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المبلغ المستلم</label>
                <input type="number" min={total} step="250" value={paidAmount}
                  onChange={(e) => setPaidAmount(Number(e.target.value))} autoFocus
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg font-bold text-center" />
              </div>
              <div className="flex justify-between text-sm bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2">
                <span className="text-gray-500">الباقي للعميل</span>
                <span className={`font-bold text-lg ${change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {Math.max(0, change).toLocaleString('ar-IQ', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} {currency}
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowPayModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium">
                إلغاء
              </button>
              <button type="button" onClick={() => doConfirm(paidAmount)} disabled={paidAmount < total}
                className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-bold">
                تأكيد الدفع
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
