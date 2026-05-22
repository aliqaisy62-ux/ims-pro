'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { itemsService } from '@/services/items.service'
import { CameraScanner } from '@/components/barcode/CameraScanner'

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

function ItemsPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [items, setItems] = useState<Item[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [showScanner, setShowScanner] = useState(false)
  const [scanStatus, setScanStatus] = useState<'idle' | 'checking'>('idle')
  const [scanError, setScanError] = useState('')

  // Auto-reopen scanner when returning from new-item form
  useEffect(() => {
    if (searchParams.get('scan') === '1') setShowScanner(true)
  }, [searchParams])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await itemsService.getAll({ search, page, pageSize: 20 })
      setItems(data.items)
      setTotal(data.total)
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false)
    }
  }, [search, page])

  useEffect(() => { load() }, [load])

  async function handleScan(barcode: string) {
    setScanStatus('checking')
    setScanError('')
    try {
      const item = await itemsService.getByBarcode(barcode)
      // EXISTS → go to edit page
      setShowScanner(false)
      setScanStatus('idle')
      router.push(`/items/${item.id}/edit`)
    } catch (err: unknown) {
      setScanStatus('idle')
      const status = (err as { response?: { status?: number } })?.response?.status
      if (!status || status === 404) {
        // NEW → pre-fill barcode on add page, return to scanner after
        setShowScanner(false)
        router.push(`/items/new?barcode=${encodeURIComponent(barcode)}&returnToScan=1`)
      } else {
        setScanError('حدث خطأ أثناء البحث — حاول مجدداً')
        setTimeout(() => setScanError(''), 3000)
      }
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
            onClick={() => router.push('/items/new')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            + إضافة صنف
          </button>
        </div>
      </div>

      {/* Scan status / error feedback */}
      {scanStatus === 'checking' && (
        <div className="mb-4 flex items-center gap-2 text-sm text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg px-4 py-2">
          <span className="animate-spin w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full inline-block shrink-0" />
          جار البحث عن الباركود...
        </div>
      )}
      {scanError && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2">
          {scanError}
        </div>
      )}

      <div className="mb-4">
        <input
          type="text"
          placeholder="بحث بالاسم أو الباركود..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="w-full max-w-sm px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">جار التحميل...</div>
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
                      className="text-blue-600 hover:underline text-sm"
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

      {total > 20 && (
        <div className="mt-4 flex gap-2 justify-center">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded disabled:opacity-50">السابق</button>
          <span className="px-3 py-1 text-sm text-gray-600">صفحة {page} من {Math.ceil(total / 20)}</span>
          <button disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded disabled:opacity-50">التالي</button>
        </div>
      )}

      <CameraScanner
        open={showScanner}
        onDetect={handleScan}
        onClose={() => { setShowScanner(false); setScanStatus('idle') }}
      />
    </div>
  )
}

export default function ItemsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">جار التحميل...</div>}>
      <ItemsPageInner />
    </Suspense>
  )
}
