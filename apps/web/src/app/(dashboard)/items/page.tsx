'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { itemsService } from '@/services/items.service'
import { CameraScanner, ScanResult } from '@/components/barcode/CameraScanner'
import { TableSkeleton } from '@/components/ui/TableSkeleton'

interface Item {
  id: string
  barcode: string | null
  name_ar: string
  name_en: string
  unit: string
  stockQty: number
  retailPrice: number
  costPrice: number
  minimumStock: number
  isActive: boolean
  category?: { name_ar: string; name_en: string }
}

interface ValidateRow { row: number; name_ar: string; name_en: string; barcode: string | null }
interface ValidateUpdateRow { row: number; name_ar: string; name_en: string; barcode: string; existingId: string }
interface ValidateInvalidRow { row: number; errors: string[] }
interface ValidationPreview {
  toCreate: ValidateRow[]
  toUpdate: ValidateUpdateRow[]
  invalid: ValidateInvalidRow[]
  summary: { total: number; willCreate: number; willUpdate: number; invalid: number }
}

function ItemsPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [items, setItems] = useState<Item[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [showScanner, setShowScanner] = useState(false)
  const [scanStatus, setScanStatus] = useState<'idle' | 'checking'>('idle')
  const [scanError, setScanError] = useState('')
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const importRef = useRef<HTMLInputElement>(null)

  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState<{
    created: number; updated: number; skipped: number; errors: string[]
  } | null>(null)

  const [validateLoading, setValidateLoading] = useState(false)
  const [validationPreview, setValidationPreview] = useState<ValidationPreview | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  const hasMore = items.length < total

  // Auto-reopen scanner when returning from new-item form
  useEffect(() => {
    if (searchParams.get('scan') === '1') setShowScanner(true)
  }, [searchParams])

  // Initial load / search-change: always replaces items
  const load = useCallback(async () => {
    setLoading(true)
    setItems([])
    setPage(1)
    try {
      const data = await itemsService.getAll({ search, page: 1, pageSize: 20 })
      setItems(data.items)
      setTotal(data.total)
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { load() }, [load])

  // Append next page when sentinel scrolls into view
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loading || loadingMore) return
    const el = sentinelRef.current
    const obs = new IntersectionObserver(async ([entry]) => {
      if (!entry.isIntersecting) return
      obs.disconnect()
      setLoadingMore(true)
      try {
        const nextPage = page + 1
        const data = await itemsService.getAll({ search, page: nextPage, pageSize: 20 })
        setItems(prev => [...prev, ...data.items])
        setTotal(data.total)
        setPage(nextPage)
      } catch {
        // handled by interceptor
      } finally {
        setLoadingMore(false)
      }
    }, { threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [hasMore, loading, loadingMore, page, search])

  async function handleScan(barcode: string) {
    setScanStatus('checking')
    setScanError('')
    setScanResult(null)
    try {
      const item = await itemsService.getByBarcode(barcode)
      setScanStatus('idle')
      setScanResult({ type: 'success', text: `تم العثور على: ${item.name_ar}` })
      setTimeout(() => {
        setShowScanner(false)
        setScanResult(null)
        router.push(`/items/${item.id}/edit`)
      }, 1400)
    } catch (err: unknown) {
      setScanStatus('idle')
      const httpStatus = (err as { response?: { status?: number } })?.response?.status
      if (!httpStatus || httpStatus === 404) {
        setScanResult({ type: 'info', text: 'باركود جديد — سيتم إضافة الصنف' })
        setTimeout(() => {
          setShowScanner(false)
          setScanResult(null)
          router.push(`/items/new?barcode=${encodeURIComponent(barcode)}&returnToScan=1`)
        }, 1400)
      } else {
        setScanResult({ type: 'error', text: 'حدث خطأ أثناء البحث — حاول مجدداً' })
        setTimeout(() => setScanResult(null), 2500)
      }
    }
  }

  function downloadTemplate() {
    const header = 'name_ar,name_en,barcode,unit,costPrice,retailPrice,wholesalePrice,specialPrice,dollarPrice,dinarPrice,stockQty,minimumStock'
    const example = 'تفاحة حمراء,Red Apple,1234567890,piece,500,700,600,650,0.5,700,50,5'
    const blob = new Blob(['﻿' + header + '\n' + example], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'items_template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (importRef.current) importRef.current.value = ''
    if (!file) return
    setValidateLoading(true)
    setImportResult(null)
    setValidationPreview(null)
    try {
      const res = await itemsService.validateImport(file)
      setPendingFile(file)
      setValidationPreview(res.data)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'فشل التحقق من الملف'
      setImportResult({ created: 0, updated: 0, skipped: 0, errors: [msg] })
    } finally {
      setValidateLoading(false)
    }
  }

  async function handleConfirmImport() {
    if (!pendingFile) return
    setImportLoading(true)
    setValidationPreview(null)
    setPendingFile(null)
    try {
      const res = await itemsService.importItems(pendingFile)
      setImportResult(res.data)
      if (res.data.created > 0 || res.data.updated > 0) load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'فشل الاستيراد'
      setImportResult({ created: 0, updated: 0, skipped: 0, errors: [msg] })
    } finally {
      setImportLoading(false)
    }
  }

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">الأصناف</h1>
        <div className="flex gap-2">
          <button
            onClick={() => { setScanError(''); setShowScanner(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            مسح لإضافة / تعديل
          </button>
          <button
            onClick={downloadTemplate}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
            title="تحميل قالب الاستيراد"
          >
            📥 قالب
          </button>
          <button
            onClick={() => importRef.current?.click()}
            disabled={importLoading || validateLoading}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors text-sm font-medium"
          >
            {validateLoading ? 'جار التحقق...' : importLoading ? 'جار الاستيراد...' : '📤 استيراد Excel/CSV'}
          </button>
          <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportFile} />
          <button
            onClick={() => router.push('/items/new')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            + إضافة صنف
          </button>
        </div>
      </div>

      {importResult && (
        <div className={`mb-4 rounded-lg px-4 py-3 text-sm border ${
          importResult.errors.length > 0 && importResult.created === 0 && importResult.updated === 0
            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-700 dark:text-red-300'
            : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300'
        }`}>
          <div className="flex items-center justify-between">
            <span className="font-medium">
              نتيجة الاستيراد — جديد: {importResult.created}، محدّث: {importResult.updated}، متجاوز: {importResult.skipped}
            </span>
            <button onClick={() => setImportResult(null)} className="text-gray-400 hover:text-gray-600 mr-4">✕</button>
          </div>
          {importResult.errors.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-xs text-red-600 dark:text-red-400">
              {importResult.errors.slice(0, 10).map((e, i) => <li key={i}>• {e}</li>)}
              {importResult.errors.length > 10 && (
                <li>• ... و{importResult.errors.length - 10} أخطاء أخرى</li>
              )}
            </ul>
          )}
        </div>
      )}

      {scanStatus === 'checking' && (
        <div className="mb-4 flex items-center gap-2 text-sm text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg px-4 py-2">
          <span className="animate-spin w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full inline-block shrink-0" />
          جار البحث عن الباركود...
        </div>
      )}

      <div className="mb-4">
        <input
          type="text"
          placeholder="بحث بالاسم أو الباركود..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <TableSkeleton cols={6} />
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-gray-500">لا توجد أصناف</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              <tr>
                <th className="px-4 py-3 text-right font-medium">الباركود</th>
                <th className="px-4 py-3 text-right font-medium">الاسم</th>
                <th className="px-4 py-3 text-right font-medium">الفئة</th>
                <th className="px-4 py-3 text-right font-medium">المخزون</th>
                <th className="px-4 py-3 text-right font-medium">سعر المفرد</th>
                <th className="px-4 py-3 text-right font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{item.barcode || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-white">{item.name_ar}</div>
                    <div className="text-gray-400 text-xs">{item.name_en}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {item.category?.name_ar || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${Number(item.stockQty) <= Number(item.minimumStock) && Number(item.minimumStock) > 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                      {Number(item.stockQty).toLocaleString('ar-IQ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">
                    {Number(item.retailPrice).toLocaleString('ar-IQ')}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => router.push(`/items/${item.id}/edit`)}
                      className="text-blue-600 hover:underline text-sm px-2 py-1"
                    >
                      تعديل
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Infinite scroll sentinel */}
      {!loading && (
        <div ref={sentinelRef} className="py-4 text-center">
          {loadingMore && (
            <span className="inline-flex items-center gap-2 text-sm text-gray-500">
              <span className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full inline-block" />
              جار تحميل المزيد...
            </span>
          )}
          {!hasMore && items.length > 0 && (
            <span className="text-xs text-gray-400">تم عرض جميع الأصناف ({total})</span>
          )}
        </div>
      )}

      {/* Validation preview modal */}
      {validationPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">معاينة الاستيراد</h2>
              <button onClick={() => { setValidationPreview(null); setPendingFile(null) }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">✕</button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4">
              {/* Summary badges */}
              <div className="flex flex-wrap gap-3 mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300">
                  الإجمالي: {validationPreview.summary.total}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-xs font-medium text-blue-700 dark:text-blue-300">
                  ✚ جديد: {validationPreview.summary.willCreate}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-xs font-medium text-amber-700 dark:text-amber-300">
                  ✎ تحديث: {validationPreview.summary.willUpdate}
                </span>
                {validationPreview.summary.invalid > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-900/40 text-xs font-medium text-red-700 dark:text-red-300">
                    ✕ أخطاء: {validationPreview.summary.invalid}
                  </span>
                )}
              </div>

              {/* Errors */}
              {validationPreview.invalid.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">الصفوف غير الصالحة (ستُتجاهل)</h3>
                  <div className="space-y-1.5">
                    {validationPreview.invalid.slice(0, 8).map((inv) => (
                      <div key={inv.row} className="text-xs bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded px-3 py-2">
                        <span className="font-medium text-red-700 dark:text-red-300">صف {inv.row}:</span>{' '}
                        <span className="text-red-600 dark:text-red-400">{inv.errors.join(' | ')}</span>
                      </div>
                    ))}
                    {validationPreview.invalid.length > 8 && (
                      <p className="text-xs text-red-500">... و{validationPreview.invalid.length - 8} صف آخر بأخطاء</p>
                    )}
                  </div>
                </div>
              )}

              {/* Valid rows preview */}
              {(validationPreview.toCreate.length > 0 || validationPreview.toUpdate.length > 0) && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    الأصناف الصالحة ({validationPreview.summary.willCreate + validationPreview.summary.willUpdate})
                  </h3>
                  <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-600">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                        <tr>
                          <th className="px-3 py-2 text-right font-medium">صف</th>
                          <th className="px-3 py-2 text-right font-medium">الاسم العربي</th>
                          <th className="px-3 py-2 text-right font-medium">الباركود</th>
                          <th className="px-3 py-2 text-right font-medium">الإجراء</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {[
                          ...validationPreview.toCreate.slice(0, 5).map(r => ({ ...r, action: 'create' as const })),
                          ...validationPreview.toUpdate.slice(0, 5).map(r => ({ ...r, action: 'update' as const })),
                        ].map((r, i) => (
                          <tr key={i} className="bg-white dark:bg-gray-800">
                            <td className="px-3 py-2 text-gray-400">{r.row}</td>
                            <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{r.name_ar}</td>
                            <td className="px-3 py-2 font-mono text-gray-500">{r.barcode ?? '—'}</td>
                            <td className="px-3 py-2">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${r.action === 'create' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>
                                {r.action === 'create' ? 'إضافة' : 'تحديث'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {(validationPreview.toCreate.length + validationPreview.toUpdate.length) > 10 && (
                      <p className="text-xs text-gray-400 px-3 py-2 bg-gray-50 dark:bg-gray-750">
                        ... و{validationPreview.toCreate.length + validationPreview.toUpdate.length - 10} صنف آخر
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => { setValidationPreview(null); setPendingFile(null) }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={validationPreview.summary.willCreate + validationPreview.summary.willUpdate === 0}
                className="px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium"
              >
                تأكيد الاستيراد ({validationPreview.summary.willCreate + validationPreview.summary.willUpdate} صنف)
              </button>
            </div>
          </div>
        </div>
      )}

      <CameraScanner
        open={showScanner}
        onDetect={handleScan}
        onClose={() => { setShowScanner(false); setScanStatus('idle'); setScanResult(null) }}
        scanResult={scanResult}
      />
    </div>
  )
}

export default function ItemsPage() {
  return (
    <Suspense fallback={<TableSkeleton cols={6} />}>
      <ItemsPageInner />
    </Suspense>
  )
}
