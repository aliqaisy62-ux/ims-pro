'use client'

import { useState, useEffect, useCallback } from 'react'
import { stockService } from '@/services/stock.service'
import api from '@/lib/api'

type Tab = 'all' | 'lowStock' | 'expiring'

interface Category {
  id: string
  name_ar: string
  name_en: string
}

interface InventoryItem {
  id: string
  barcode: string | null
  name_ar: string
  name_en: string
  unit: string
  stockQty: number | string
  minimumStock: number | string
  costPrice: number | string
  retailPrice: number | string
  costValue: number
  retailValue: number
  category?: Category | null
  expiryDate?: string | null
}

interface ExpiringItem {
  id: string
  barcode: string | null
  name_ar: string
  name_en: string
  unit: string
  stockQty: number | string
  expiryDate: string
  category?: Category | null
}

function daysUntil(dateStr: string): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const expiry = new Date(dateStr)
  expiry.setHours(0, 0, 0, 0)
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ar-IQ')
}

function formatNum(n: number | string, decimals = 0): string {
  return Number(n).toLocaleString('ar-IQ', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<Tab>('all')

  // ── All Inventory state ────────────────────────────────────────────────────
  const [allItems, setAllItems] = useState<InventoryItem[]>([])
  const [allLoading, setAllLoading] = useState(false)
  const [allLoaded, setAllLoaded] = useState(false)
  const [search, setSearch] = useState('')
  const [filterCategoryId, setFilterCategoryId] = useState('')
  const [categories, setCategories] = useState<Category[]>([])

  // ── Low stock state ────────────────────────────────────────────────────────
  const [lowItems, setLowItems] = useState<InventoryItem[]>([])
  const [lowLoading, setLowLoading] = useState(false)
  const [lowLoaded, setLowLoaded] = useState(false)

  // ── Expiring state ─────────────────────────────────────────────────────────
  const [expiringItems, setExpiringItems] = useState<ExpiringItem[]>([])
  const [expiringLoading, setExpiringLoading] = useState(false)
  const [expiringLoaded, setExpiringLoaded] = useState(false)
  const [expiringDays, setExpiringDays] = useState(30)

  // ── Load categories once ───────────────────────────────────────────────────
  useEffect(() => {
    api
      .get('/api/items/categories')
      .then((r) => setCategories(r.data?.data ?? []))
      .catch(() => setCategories([]))
  }, [])

  // ── Load All Inventory ─────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setAllLoading(true)
    try {
      const params: Record<string, any> = {}
      if (search) params.search = search
      if (filterCategoryId) params.categoryId = filterCategoryId
      const res = await stockService.getInventory(params)
      setAllItems(res.data ?? [])
      setAllLoaded(true)
    } catch {
      setAllItems([])
    } finally {
      setAllLoading(false)
    }
  }, [search, filterCategoryId])

  // ── Load Low Stock ─────────────────────────────────────────────────────────
  const loadLowStock = useCallback(async () => {
    if (lowLoaded) return
    setLowLoading(true)
    try {
      const res = await stockService.getLowStock()
      setLowItems(res.data ?? [])
      setLowLoaded(true)
    } catch {
      setLowItems([])
    } finally {
      setLowLoading(false)
    }
  }, [lowLoaded])

  // ── Load Expiring ──────────────────────────────────────────────────────────
  const loadExpiring = useCallback(async () => {
    setExpiringLoading(true)
    try {
      const res = await stockService.getExpiring(expiringDays)
      setExpiringItems(res.data ?? [])
      setExpiringLoaded(true)
    } catch {
      setExpiringItems([])
    } finally {
      setExpiringLoading(false)
    }
  }, [expiringDays])

  // ── Tab switch triggers ───────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'all') loadAll()
  }, [activeTab, loadAll])

  useEffect(() => {
    if (activeTab === 'lowStock' && !lowLoaded) loadLowStock()
  }, [activeTab, lowLoaded, loadLowStock])

  useEffect(() => {
    if (activeTab === 'expiring') loadExpiring()
  }, [activeTab, loadExpiring])

  // Initial load for "all" tab
  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Computed totals ────────────────────────────────────────────────────────
  const totalCostValue = allItems.reduce((s, i) => s + (i.costValue ?? 0), 0)
  const totalRetailValue = allItems.reduce((s, i) => s + (i.retailValue ?? 0), 0)

  return (
    <div dir="rtl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">إدارة المخزون</h1>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        {([
          { key: 'all', label: 'الجرد العام' },
          { key: 'lowStock', label: 'مخزون منخفض' },
          { key: 'expiring', label: 'قريبة الانتهاء' },
        ] as { key: Tab; label: string }[]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: الجرد العام                                                  */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'all' && (
        <>
          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-4 flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                بحث
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="الاسم أو الباركود..."
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm w-52"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                الفئة
              </label>
              <select
                value={filterCategoryId}
                onChange={(e) => setFilterCategoryId(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="">جميع الفئات</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name_ar}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={loadAll}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              بحث
            </button>
            {(search || filterCategoryId) && (
              <button
                onClick={() => { setSearch(''); setFilterCategoryId('') }}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg"
              >
                مسح
              </button>
            )}
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            {allLoading ? (
              <div className="p-8 text-center text-gray-500">جار التحميل...</div>
            ) : allItems.length === 0 ? (
              <div className="p-8 text-center text-gray-500">لا توجد أصناف</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    <tr>
                      <th className="px-4 py-3 text-right font-medium">الباركود</th>
                      <th className="px-4 py-3 text-right font-medium">المنتج</th>
                      <th className="px-4 py-3 text-right font-medium">الفئة</th>
                      <th className="px-4 py-3 text-right font-medium">الوحدة</th>
                      <th className="px-4 py-3 text-right font-medium">الكمية</th>
                      <th className="px-4 py-3 text-right font-medium">الحد الأدنى</th>
                      <th className="px-4 py-3 text-right font-medium">تكلفة الوحدة</th>
                      <th className="px-4 py-3 text-right font-medium">إجمالي التكلفة</th>
                      <th className="px-4 py-3 text-right font-medium">إجمالي سعر البيع</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {allItems.map((item) => {
                      const qty = Number(item.stockQty)
                      const minStock = Number(item.minimumStock)
                      const isLow = minStock > 0 && qty <= minStock
                      return (
                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                          <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                            {item.barcode || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {item.name_ar}
                            </div>
                            <div className="text-gray-400 text-xs">{item.name_en}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {item.category?.name_ar || '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-500">{item.unit}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`font-semibold ${isLow ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}
                            >
                              {formatNum(item.stockQty, 3)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500">{formatNum(item.minimumStock, 3)}</td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                            {formatNum(item.costPrice)}
                          </td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                            {formatNum(item.costValue)}
                          </td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                            {formatNum(item.retailValue)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  {allLoaded && allItems.length > 0 && (
                    <tfoot className="bg-gray-50 dark:bg-gray-700 font-bold">
                      <tr>
                        <td colSpan={7} className="px-4 py-3 text-gray-900 dark:text-white">
                          الإجمالي ({allItems.length} صنف)
                        </td>
                        <td className="px-4 py-3 text-gray-900 dark:text-white">
                          {formatNum(totalCostValue)} د.ع
                        </td>
                        <td className="px-4 py-3 text-gray-900 dark:text-white">
                          {formatNum(totalRetailValue)} د.ع
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: مخزون منخفض                                                  */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'lowStock' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          {lowLoading ? (
            <div className="p-8 text-center text-gray-500">جار التحميل...</div>
          ) : lowItems.length === 0 ? (
            <div className="p-8 text-center text-green-600 font-medium">
              لا توجد أصناف ذات مخزون منخفض
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
                <span className="font-semibold text-gray-800 dark:text-white">
                  أصناف منخفضة المخزون ({lowItems.length})
                </span>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-red-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  <tr>
                    <th className="px-4 py-3 text-right font-medium">الباركود</th>
                    <th className="px-4 py-3 text-right font-medium">المنتج</th>
                    <th className="px-4 py-3 text-right font-medium">الفئة</th>
                    <th className="px-4 py-3 text-right font-medium">الوحدة</th>
                    <th className="px-4 py-3 text-right font-medium">الكمية الحالية</th>
                    <th className="px-4 py-3 text-right font-medium">الحد الأدنى</th>
                    <th className="px-4 py-3 text-right font-medium">العجز</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {lowItems.map((item) => {
                    const qty = Number(item.stockQty)
                    const min = Number(item.minimumStock)
                    const deficit = min - qty
                    return (
                      <tr key={item.id} className="bg-red-50 dark:bg-red-900/10">
                        <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                          {item.barcode || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 dark:text-white">{item.name_ar}</div>
                          <div className="text-gray-400 text-xs">{item.name_en}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {item.category?.name_ar || '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{item.unit}</td>
                        <td className="px-4 py-3 font-bold text-red-600">
                          {formatNum(item.stockQty, 3)}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          {formatNum(item.minimumStock, 3)}
                        </td>
                        <td className="px-4 py-3 text-red-700 font-medium">
                          {formatNum(deficit, 3)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: قريبة الانتهاء                                               */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'expiring' && (
        <>
          {/* Days filter */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-4 flex items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                عرض المنتجات التي ستنتهي خلال (أيام)
              </label>
              <input
                type="number"
                value={expiringDays}
                onChange={(e) => setExpiringDays(Math.max(1, Number(e.target.value)))}
                min="1"
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm w-28"
              />
            </div>
            <button
              onClick={() => { setExpiringLoaded(false); loadExpiring() }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              بحث
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            {expiringLoading ? (
              <div className="p-8 text-center text-gray-500">جار التحميل...</div>
            ) : expiringItems.length === 0 ? (
              <div className="p-8 text-center text-green-600 font-medium">
                لا توجد منتجات قريبة الانتهاء خلال {expiringDays} يوم
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                  <span className="font-semibold text-gray-800 dark:text-white">
                    منتجات تنتهي خلال {expiringDays} يوم ({expiringItems.length} صنف)
                  </span>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    <tr>
                      <th className="px-4 py-3 text-right font-medium">المنتج</th>
                      <th className="px-4 py-3 text-right font-medium">الفئة</th>
                      <th className="px-4 py-3 text-right font-medium">الكمية</th>
                      <th className="px-4 py-3 text-right font-medium">تاريخ الانتهاء</th>
                      <th className="px-4 py-3 text-right font-medium">الأيام المتبقية</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {expiringItems.map((item) => {
                      const days = daysUntil(item.expiryDate)
                      let daysClass = 'text-green-600'
                      let daysBg = 'bg-green-100'
                      if (days < 7) {
                        daysClass = 'text-red-600'
                        daysBg = 'bg-red-100'
                      } else if (days <= 30) {
                        daysClass = 'text-amber-600'
                        daysBg = 'bg-amber-100'
                      }
                      return (
                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {item.name_ar}
                            </div>
                            <div className="text-gray-400 text-xs">
                              {item.name_en}
                              {item.barcode && (
                                <span className="font-mono mr-1"> — {item.barcode}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {item.category?.name_ar || '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                            {formatNum(item.stockQty, 3)} {item.unit}
                          </td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                            {formatDate(item.expiryDate)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-bold ${daysBg} ${daysClass}`}
                            >
                              {days <= 0 ? 'منتهية الصلاحية' : `${days} يوم`}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
