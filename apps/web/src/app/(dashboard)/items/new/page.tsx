'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { itemsService } from '@/services/items.service'
import { CameraScanner } from '@/components/barcode/CameraScanner'
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner'

interface Category { id: string; name_ar: string; name_en: string }

function NewItemPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnToScan = searchParams.get('returnToScan') === '1'

  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [barcodeError, setBarcodeError] = useState('')
  const [existingItem, setExistingItem] = useState<{ id: string; name_ar: string; name_en: string } | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  const barcodeInputRef = useRef<HTMLInputElement>(null)
  const stockQtyRef = useRef<HTMLInputElement>(null)
  // stable ref so lookupBarcode callback doesn't re-register the scanner listener on every render
  const isMobileRef = useRef(false)
  const cameraAutoOpened = useRef(false)

  const [form, setForm] = useState({
    barcode: '', name_ar: '', name_en: '', unit: 'piece', categoryId: '',
    stockQty: 0, costPrice: 0, retailPrice: 0, wholesalePrice: 0,
    specialPrice: 0, dollarPrice: 0, dinarPrice: 0, minimumStock: 0,
  })

  // Detect mobile viewport
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const update = (e: MediaQueryList | MediaQueryListEvent) => {
      isMobileRef.current = e.matches
      setIsMobile(e.matches)
    }
    update(mq)
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // Auto-open camera on first mobile load (skip if barcode already in URL)
  useEffect(() => {
    if (isMobile && !cameraAutoOpened.current && !searchParams.get('barcode')) {
      cameraAutoOpened.current = true
      setShowCamera(true)
    }
  }, [isMobile, searchParams])

  // Pre-fill barcode from URL param (returnToScan flow)
  useEffect(() => {
    const b = searchParams.get('barcode')
    if (b) setForm(f => ({ ...f, barcode: b }))
  }, [searchParams])

  useEffect(() => {
    itemsService.getCategories().then(setCategories).catch(() => {})
  }, [])

  const lookupBarcode = useCallback(async (code: string) => {
    if (!code.trim()) return
    setBarcodeError('')
    setExistingItem(null)
    setForm(f => ({ ...f, barcode: code }))
    try {
      const found = await itemsService.getByBarcode(code)
      if (isMobileRef.current) {
        // Mobile: auto-submit → go straight to edit page
        router.push(`/items/${found.id}/edit`)
      } else {
        setExistingItem(found)
      }
    } catch {
      // New item — focus quantity field on mobile so user can type count immediately
      if (isMobileRef.current) {
        setTimeout(() => stockQtyRef.current?.focus(), 80)
      }
    }
  }, [router])

  useBarcodeScanner({ onScan: lookupBarcode, barcodeInputRef, enabled: !showCamera })

  async function handleBarcodeKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    await lookupBarcode(form.barcode.trim())
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = e.target
    if (name === 'barcode') setBarcodeError('')
    setForm(f => ({ ...f, [name]: type === 'number' ? Number(value) : value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBarcodeError('')
    setLoading(true)
    try {
      await itemsService.create({ ...form, categoryId: form.categoryId || null, barcode: form.barcode || null })
      if (returnToScan || isMobileRef.current) {
        router.push('/items/new')
      } else {
        router.push('/items')
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || ''
      if (msg.toLowerCase().includes('barcode') || msg.toLowerCase().includes('unique')) {
        setBarcodeError('هذا الباركود مسجل مسبقاً لصنف آخر')
      } else {
        alert('فشل في إنشاء الصنف')
      }
    } finally {
      setLoading(false)
    }
  }

  const priceFields = [
    { name: 'costPrice', label: 'التكلفة' },
    { name: 'retailPrice', label: 'المفرد' },
    { name: 'wholesalePrice', label: 'الجملة' },
    { name: 'specialPrice', label: 'الخاص' },
    { name: 'dollarPrice', label: 'دولار (USD)' },
    { name: 'dinarPrice', label: 'دينار (IQD)' },
  ]

  return (
    <div dir="rtl" className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          ←
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">إضافة صنف جديد</h1>
        {isMobile && (
          <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full shrink-0">
            وضع الجوال
          </span>
        )}
        {!isMobile && returnToScan && (
          <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-full shrink-0">
            وضع المسح المتعدد
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-6 space-y-4">

        {/* ─── Barcode row ────────────────────────────────────────────── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            الباركود
            <span className="mr-2 text-xs font-normal text-green-600 dark:text-green-400">● جاهز للمسح</span>
          </label>
          <div className="flex gap-2">
            <input
              ref={barcodeInputRef}
              name="barcode"
              value={form.barcode}
              onChange={handleChange}
              onKeyDown={handleBarcodeKeyDown}
              placeholder="امسح بالماسح أو أدخل يدوياً ثم Enter"
              className={`flex-1 px-3 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm ${barcodeError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
            />
            <button
              type="button"
              onClick={() => setShowCamera(true)}
              title="مسح بالكاميرا"
              className="px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
          {barcodeError && <p className="mt-1 text-xs text-red-600">{barcodeError}</p>}
        </div>

        {/* ─── Quantity (mobile priority field — receives focus after scan) ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            الكمية الحالية
            {isMobile && <span className="mr-2 text-xs font-normal text-blue-500">← أدخل العدد بعد المسح</span>}
          </label>
          <input
            ref={stockQtyRef}
            name="stockQty"
            type="number"
            min="0"
            inputMode="numeric"
            value={form.stockQty}
            onChange={handleChange}
            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:max-w-[12rem]"
          />
        </div>

        {/* ─── Names ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم (عربي) *</label>
            <input
              name="name_ar"
              value={form.name_ar}
              onChange={handleChange}
              required
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم (إنجليزي) *</label>
            <input
              name="name_en"
              value={form.name_en}
              onChange={handleChange}
              required
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
        </div>

        {/* ─── Unit / Category / Min Stock ────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الوحدة</label>
            <select
              name="unit"
              value={form.unit}
              onChange={handleChange}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              {['piece','kg','gram','liter','box','carton','pack','dozen','meter'].map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الفئة</label>
            <select
              name="categoryId"
              value={form.categoryId}
              onChange={handleChange}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="">— اختر فئة —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الحد الأدنى</label>
            <input
              name="minimumStock"
              type="number"
              min="0"
              inputMode="numeric"
              value={form.minimumStock}
              onChange={handleChange}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
        </div>

        {/* ─── Prices ─────────────────────────────────────────────────── */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">الأسعار</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {priceFields.map(f => (
              <div key={f.name}>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{f.label}</label>
                <input
                  name={f.name}
                  type="number"
                  min="0"
                  step="0.001"
                  inputMode="decimal"
                  value={(form as Record<string, number | string>)[f.name] as number}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        {/* ─── Existing barcode warning (desktop only — mobile auto-redirects) ── */}
        {existingItem && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <span>
                هذا الباركود موجود:{' '}
                <strong>{existingItem.name_ar}</strong>
                {existingItem.name_en && ` / ${existingItem.name_en}`}
              </span>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => router.push(`/items/${existingItem.id}/edit`)}
                className="px-3 py-2 bg-amber-600 text-white text-xs rounded-lg hover:bg-amber-700 font-medium min-h-[44px]"
              >
                تعديل
              </button>
              <button
                type="button"
                onClick={() => setExistingItem(null)}
                className="px-3 py-2 border border-amber-400 text-amber-700 dark:text-amber-300 text-xs rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 min-h-[44px]"
              >
                تجاهل
              </button>
            </div>
          </div>
        )}

        {/* ─── Actions ─────────────────────────────────────────────────── */}
        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 sm:flex-none px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium min-h-[44px] text-sm"
          >
            {loading ? 'جار الحفظ...' : isMobile ? 'حفظ ومسح التالي' : returnToScan ? 'حفظ والمسح التالي ←' : 'حفظ الصنف'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 min-h-[44px] text-sm"
          >
            إلغاء
          </button>
        </div>
      </form>

      <CameraScanner
        open={showCamera}
        onDetect={(code) => { setShowCamera(false); lookupBarcode(code) }}
        onClose={() => setShowCamera(false)}
      />
    </div>
  )
}

export default function NewItemPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">جار التحميل...</div>}>
      <NewItemPageInner />
    </Suspense>
  )
}
