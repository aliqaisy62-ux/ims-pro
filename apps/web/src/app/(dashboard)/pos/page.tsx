'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner'
import { useSoundFeedback } from '@/hooks/useSoundFeedback'
import { itemsService } from '@/services/items.service'
import { customersService } from '@/services/customers.service'
import { posService, PosCheckoutPayload } from '@/services/pos.service'

const IQD_DENOMINATIONS = [250, 500, 1_000, 5_000, 10_000, 25_000, 50_000]

// ─── Types ────────────────────────────────────────────────────────────────────

interface Item {
  id: string
  name_ar: string
  name_en?: string
  barcode?: string
  stockQty: number
  retailPrice: string | number
  wholesalePrice: string | number
  specialPrice: string | number
  dollarPrice: string | number
  dinarPrice: string | number
}

interface CartLine {
  item: Item
  quantity: number
  unitPrice: number
}

interface Customer {
  id: string
  name: string
  balance: string | number
}

type PriceType = 'RETAIL' | 'WHOLESALE' | 'SPECIAL' | 'DOLLAR' | 'DINAR'
type Currency = 'IQD' | 'USD'
type PaymentMethod = 'CASH' | 'CREDIT'

const PRICE_KEY: Record<PriceType, keyof Item> = {
  RETAIL:    'retailPrice',
  WHOLESALE: 'wholesalePrice',
  SPECIAL:   'specialPrice',
  DOLLAR:    'dollarPrice',
  DINAR:     'dinarPrice',
}

const PRICE_LABELS: Record<PriceType, string> = {
  RETAIL:    'تجزئة',
  WHOLESALE: 'جملة',
  SPECIAL:   'خاص',
  DOLLAR:    'دولار',
  DINAR:     'دينار',
}

// ─── Toast ────────────────────────────────────────────────────────────────────

interface Toast { id: number; msg: string; type: 'success' | 'error' | 'info' }

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counter = useRef(0)

  const add = useCallback((msg: string, type: Toast['type'] = 'info') => {
    const id = ++counter.current
    setToasts((prev) => [...prev, { id, msg, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500)
  }, [])

  return { toasts, add }
}

// ─── Debounce ─────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PosPage() {
  const { user } = useAuth()

  // Cart state
  const [cart, setCart] = useState<CartLine[]>([])
  const [priceType, setPriceType] = useState<PriceType>('RETAIL')
  const [currency, setCurrency] = useState<Currency>('IQD')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')
  const [exchangeRate, setExchangeRate] = useState(1480)

  // Customer
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')

  // Product search
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Item[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const debouncedSearch = useDebounce(searchQuery, 300)

  // Payment
  const [amountPaid, setAmountPaid] = useState('')

  // UI
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [lastInvoice, setLastInvoice] = useState<{ number: string; total: number } | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const barcodeInputRef = useRef<HTMLInputElement>(null)
  const [barcodeInput, setBarcodeInput] = useState('')

  const { toasts, add: addToast } = useToasts()
  const { playBeep, playBuzz } = useSoundFeedback()

  // ─── Load customers for CREDIT selector ────────────────────────────────────
  useEffect(() => {
    customersService.getAll({ pageSize: 500 }).then((data) => {
      const list = data?.customers ?? data?.items ?? data ?? []
      setCustomers(Array.isArray(list) ? list : [])
    }).catch(() => {})
  }, [])

  // ─── Product search ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!debouncedSearch.trim()) { setSearchResults([]); return }
    setSearchLoading(true)
    posService.searchItems(debouncedSearch)
      .then((items) => setSearchResults(Array.isArray(items) ? items.slice(0, 15) : []))
      .catch(() => setSearchResults([]))
      .finally(() => setSearchLoading(false))
  }, [debouncedSearch])

  // ─── Price getter ───────────────────────────────────────────────────────────
  const getPrice = useCallback((item: Item, pt: PriceType): number => {
    return Number(item[PRICE_KEY[pt]]) || 0
  }, [])

  // ─── Cart operations ────────────────────────────────────────────────────────
  const addToCart = useCallback((item: Item, pt: PriceType) => {
    const unitPrice = Number(item[PRICE_KEY[pt]]) || 0
    setCart((prev) => {
      const idx = prev.findIndex((l) => l.item.id === item.id)
      if (idx >= 0) {
        const updated = [...prev]
        const line = updated[idx]
        if (line.quantity >= item.stockQty) {
          addToast(`الكمية المتوفرة: ${item.stockQty}`, 'error')
          return prev
        }
        updated[idx] = { ...line, quantity: line.quantity + 1 }
        return updated
      }
      if (item.stockQty < 1) {
        addToast(`${item.name_ar} — غير متوفر في المخزون`, 'error')
        return prev
      }
      return [...prev, { item, quantity: 1, unitPrice }]
    })
  }, [addToast])

  const removeFromCart = useCallback((itemId: string) => {
    setCart((prev) => prev.filter((l) => l.item.id !== itemId))
  }, [])

  const updateQty = useCallback((itemId: string, qty: number) => {
    setCart((prev) => {
      return prev.map((l) => {
        if (l.item.id !== itemId) return l
        if (qty <= 0) return l
        if (qty > l.item.stockQty) {
          addToast(`الكمية المتوفرة: ${l.item.stockQty}`, 'error')
          return l
        }
        return { ...l, quantity: qty }
      })
    })
  }, [addToast])

  const clearCart = useCallback(() => {
    setCart([])
    setAmountPaid('')
    setSelectedCustomerId('')
    setCustomerSearch('')
    setLastInvoice(null)
  }, [])

  // ─── Recalculate prices when priceType changes ──────────────────────────────
  useEffect(() => {
    setCart((prev) => prev.map((l) => ({ ...l, unitPrice: getPrice(l.item, priceType) })))
  }, [priceType, getPrice])

  // ─── Totals ─────────────────────────────────────────────────────────────────
  const { subtotal, totalItems } = useMemo(() => {
    let subtotal = 0
    let totalItems = 0
    for (const l of cart) {
      subtotal += l.unitPrice * l.quantity
      totalItems += l.quantity
    }
    return { subtotal, totalItems }
  }, [cart])

  const paid = Number(amountPaid) || 0
  const change = paymentMethod === 'CASH' && paid > 0 ? paid - subtotal : 0

  // ─── Barcode scan handler ───────────────────────────────────────────────────
  const handleBarcodeScan = useCallback(async (code: string) => {
    if (!code.trim()) return
    try {
      const item = await itemsService.getByBarcode(code.trim())
      addToCart(item, priceType)
      playBeep()
      addToast(`تمت الإضافة: ${item.name_ar}`, 'success')
      setBarcodeInput('')
    } catch {
      playBuzz()
      addToast(`لم يتم العثور على: ${code}`, 'error')
      setBarcodeInput('')
    }
  }, [priceType, addToCart, addToast])

  useBarcodeScanner({ onScan: handleBarcodeScan, barcodeInputRef })

  // ─── Manual barcode input ───────────────────────────────────────────────────
  function handleBarcodeKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleBarcodeScan(barcodeInput)
    }
  }

  // ─── Checkout ────────────────────────────────────────────────────────────────
  async function handleCheckout() {
    if (cart.length === 0) { addToast('السلة فارغة', 'error'); return }
    if (paymentMethod === 'CREDIT' && !selectedCustomerId) {
      addToast('يرجى اختيار عميل للبيع الآجل', 'error')
      return
    }
    if (paymentMethod === 'CASH' && amountPaid && Number(amountPaid) < subtotal) {
      addToast('المبلغ المدفوع أقل من الإجمالي', 'error')
      return
    }

    setCheckoutLoading(true)
    const payload: PosCheckoutPayload = {
      items: cart.map((l) => ({ itemId: l.item.id, quantity: l.quantity })),
      priceType,
      currency,
      exchangeRate,
      paymentMethod,
      customerId: selectedCustomerId || null,
      amountPaid: paymentMethod === 'CASH' ? (Number(amountPaid) || subtotal) : undefined,
      notes: '',
    }

    try {
      const result = await posService.checkout(payload)
      setLastInvoice({ number: result.invoiceNumber, total: subtotal })
      addToast(`✓ تمت عملية البيع — فاتورة: ${result.invoiceNumber}`, 'success')
      clearCart()
      setTimeout(() => barcodeInputRef.current?.focus(), 100)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      addToast(msg || 'فشل في إتمام عملية البيع', 'error')
    } finally {
      setCheckoutLoading(false)
    }
  }

  // ─── Filtered customers ─────────────────────────────────────────────────────
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.slice(0, 50)
    const q = customerSearch.toLowerCase()
    return customers.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 50)
  }, [customers, customerSearch])

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col" dir="rtl">
      {/* Toast Container */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg text-center transition-all
              ${t.type === 'success' ? 'bg-green-600' : t.type === 'error' ? 'bg-red-600' : 'bg-blue-600'}`}
          >
            {t.msg}
          </div>
        ))}
      </div>

      {/* Page Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">نقطة البيع</h1>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span>{user?.name}</span>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <span>{new Date().toLocaleDateString('ar-IQ')}</span>
        </div>
      </div>

      {/* Main Layout: Search+Scan | Cart */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

        {/* ── Left Panel: Scanner + Search + Results ── */}
        <div className="flex flex-col lg:w-[55%] xl:w-[60%] overflow-hidden border-b lg:border-b-0 lg:border-l border-gray-200 dark:border-gray-700">

          {/* Scanner controls */}
          <div className="flex flex-col sm:flex-row gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 shrink-0">
            {/* Barcode input */}
            <div className="flex-1">
              <input
                ref={barcodeInputRef}
                autoFocus
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={handleBarcodeKeyDown}
                placeholder="امسح الباركود أو اكتبه هنا..."
                className="w-full h-11 px-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {/* Search input */}
            <div className="flex-1">
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن منتج..."
                className="w-full h-11 px-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Price type selector */}
          <div className="flex gap-1 px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shrink-0 overflow-x-auto">
            {(Object.keys(PRICE_LABELS) as PriceType[]).map((pt) => (
              <button
                key={pt}
                onClick={() => setPriceType(pt)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors min-h-[36px]
                  ${priceType === pt
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
              >
                {PRICE_LABELS[pt]}
              </button>
            ))}
            <div className="mr-auto flex gap-1">
              {(['IQD', 'USD'] as Currency[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors min-h-[36px]
                    ${currency === c
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Search results */}
          <div className="flex-1 overflow-y-auto p-4">
            {searchLoading && (
              <div className="text-center py-8 text-gray-400 text-sm">جار البحث...</div>
            )}
            {!searchLoading && searchQuery && searchResults.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">لا توجد نتائج</div>
            )}
            {!searchQuery && !searchLoading && (
              <div className="text-center py-12 text-gray-300 dark:text-gray-600">
                <div className="text-5xl mb-3">🏪</div>
                <p className="text-sm">ابحث عن منتج أو امسح الباركود</p>
              </div>
            )}
            {searchResults.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {searchResults.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { addToCart(item, priceType); setSearchQuery(''); setSearchResults([]) }}
                    className="text-right p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors min-h-[80px] flex flex-col justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">{item.name_ar}</p>
                      {item.barcode && <p className="text-xs text-gray-400 mt-0.5">{item.barcode}</p>}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${item.stockQty > 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-red-100 text-red-600'}`}>
                        {item.stockQty > 0 ? `${item.stockQty} متبقي` : 'نفذت الكمية'}
                      </span>
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {getPrice(item, priceType).toLocaleString()} {currency}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right Panel: Cart + Checkout ── */}
        <div className="flex flex-col lg:w-[45%] xl:w-[40%] bg-white dark:bg-gray-800">

          {/* Cart header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              السلة
              {totalItems > 0 && (
                <span className="mr-2 text-sm font-normal text-gray-500">({totalItems} قطعة)</span>
              )}
            </h2>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-red-500 hover:text-red-700 min-h-[36px] px-2"
              >
                مسح الكل
              </button>
            )}
          </div>

          {/* Cart lines */}
          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-gray-300 dark:text-gray-600">
                <div className="text-5xl mb-3">🛒</div>
                <p className="text-sm">السلة فارغة</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {cart.map((line) => (
                  <li key={line.item.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{line.item.name_ar}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {line.unitPrice.toLocaleString()} × {line.quantity} ={' '}
                        <span className="font-semibold text-gray-700 dark:text-gray-300">
                          {(line.unitPrice * line.quantity).toLocaleString()}
                        </span>
                      </p>
                    </div>
                    {/* Qty controls */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => line.quantity > 1 ? updateQty(line.item.id, line.quantity - 1) : removeFromCart(line.item.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-red-100 dark:hover:bg-red-900/30 text-sm font-bold"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={line.quantity}
                        onChange={(e) => updateQty(line.item.id, Math.floor(Number(e.target.value)))}
                        min={1}
                        max={line.item.stockQty}
                        className="w-12 h-8 text-center text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => updateQty(line.item.id, line.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-green-900/30 text-sm font-bold"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromCart(line.item.id)}
                      className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 shrink-0"
                      title="حذف"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Last invoice notice */}
          {lastInvoice && (
            <div className="mx-4 mb-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-400">
              ✓ آخر فاتورة: <strong>{lastInvoice.number}</strong> — {lastInvoice.total.toLocaleString()} {currency}
            </div>
          )}

          {/* Checkout panel */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-3 shrink-0">

            {/* Payment method */}
            <div className="flex gap-2">
              {(['CASH', 'CREDIT'] as PaymentMethod[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setPaymentMethod(m)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors min-h-[40px]
                    ${paymentMethod === m
                      ? m === 'CASH' ? 'bg-blue-600 text-white' : 'bg-amber-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                >
                  {m === 'CASH' ? 'نقداً' : 'آجل'}
                </button>
              ))}
            </div>

            {/* Customer selector (CREDIT only) */}
            {paymentMethod === 'CREDIT' && (
              <div className="space-y-1.5">
                <input
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="ابحث عن عميل..."
                  className="w-full h-9 px-3 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full h-9 px-3 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="">-- اختر العميل --</option>
                  {filteredCustomers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Amount paid (CASH) */}
            {paymentMethod === 'CASH' && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder="المبلغ المدفوع"
                    min={0}
                    className="flex-1 h-9 px-3 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {change > 0 && (
                    <div className="flex items-center gap-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 text-sm text-green-700 dark:text-green-400 whitespace-nowrap min-w-[90px]">
                      الباقي: <strong>{change.toLocaleString()}</strong>
                    </div>
                  )}
                </div>
                {/* IQD denomination quick-buttons */}
                <div className="flex flex-wrap gap-1">
                  {IQD_DENOMINATIONS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setAmountPaid((prev) => String((Number(prev) || 0) + d))}
                      className="flex-1 min-w-[52px] py-1.5 text-xs font-semibold rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors min-h-[36px]"
                    >
                      {d.toLocaleString('ar-IQ')}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAmountPaid('')}
                    className="px-2.5 py-1.5 text-xs font-semibold rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors min-h-[36px]"
                  >
                    مسح
                  </button>
                </div>
              </div>
            )}

            {/* Subtotal */}
            <div className="flex items-center justify-between py-2 border-t border-gray-100 dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">الإجمالي</span>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                {subtotal.toLocaleString()} <span className="text-sm font-normal">{currency}</span>
              </span>
            </div>

            {/* Checkout button */}
            <button
              onClick={handleCheckout}
              disabled={checkoutLoading || cart.length === 0}
              className="w-full py-3.5 rounded-xl text-base font-bold text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors min-h-[52px] shadow-sm"
            >
              {checkoutLoading ? 'جار التنفيذ...' : `إتمام البيع — ${subtotal.toLocaleString()} ${currency}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
