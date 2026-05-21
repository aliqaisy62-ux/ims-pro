'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { itemsService } from '@/services/items.service'

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

export default function ItemsPage() {
  const router = useRouter()
  const [items, setItems] = useState<Item[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await itemsService.getAll({ search, page, pageSize: 20 })
      setItems(data.items)
      setTotal(data.total)
    } catch {
      // error handled by interceptor
    } finally {
      setLoading(false)
    }
  }, [search, page])

  useEffect(() => { load() }, [load])

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">الأصناف</h1>
        <button
          onClick={() => router.push('/items/new')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          + إضافة صنف
        </button>
      </div>

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
    </div>
  )
}
