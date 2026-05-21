'use client'

import { useState, useEffect } from 'react'
import { reportsService } from '@/services/reports.service'

interface InventoryItem {
  id: string
  nameAr: string
  nameEn: string
  barcode: string | null
  stockQty: number
  minimumStock: number
  costPrice: number
  retailPrice: number
  costValue: number
  retailValue: number
  category: string
}

interface InventorySummary {
  totalItems: number
  totalCostValue: number
  totalRetailValue: number
  lowStockCount: number
}

function fmt(n: number): string {
  return n.toLocaleString('ar-IQ', { maximumFractionDigits: 0 })
}

function exportCsv(items: InventoryItem[]) {
  const headers = [
    'الباركود',
    'المنتج (عربي)',
    'المنتج (إنجليزي)',
    'الكمية',
    'التكلفة',
    'البيع',
    'قيمة التكلفة',
    'قيمة البيع',
    'الفئة',
  ]
  const rows = items.map((item) => [
    item.barcode ?? '',
    item.nameAr,
    item.nameEn,
    String(item.stockQty),
    String(item.costPrice),
    String(item.retailPrice),
    String(Math.round(item.costValue)),
    String(Math.round(item.retailValue)),
    item.category,
  ])
  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(','))
    .join('\n')
  const bom = '﻿'
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `inventory-report-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export default function InventoryReportPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [summary, setSummary] = useState<InventorySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const res = await reportsService.getInventory()
        setItems(res.data.items ?? [])
        setSummary(res.data.summary ?? null)
      } catch {
        setError('حدث خطأ أثناء تحميل البيانات')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function isLowStock(item: InventoryItem): boolean {
    const threshold = item.minimumStock > 0 ? item.minimumStock : 5
    return item.stockQty <= threshold
  }

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">تقرير الجرد</h1>
        {items.length > 0 && (
          <button
            onClick={() => exportCsv(items)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
          >
            تصدير Excel
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border-r-4 border-blue-500">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">إجمالي الأصناف</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.totalItems}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border-r-4 border-gray-400">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">إجمالي قيمة التكلفة</p>
            <p className="text-lg font-bold text-gray-700 dark:text-gray-300">
              {fmt(summary.totalCostValue)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border-r-4 border-green-500">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">إجمالي قيمة البيع</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">
              {fmt(summary.totalRetailValue)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border-r-4 border-amber-500">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">مخزون منخفض</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {summary.lowStockCount}
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">جار التحميل...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-gray-500">لا توجد أصناف</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="px-4 py-3 text-right font-medium">الباركود</th>
                  <th className="px-4 py-3 text-right font-medium">المنتج</th>
                  <th className="px-4 py-3 text-right font-medium">الكمية</th>
                  <th className="px-4 py-3 text-right font-medium">التكلفة</th>
                  <th className="px-4 py-3 text-right font-medium">البيع</th>
                  <th className="px-4 py-3 text-right font-medium">قيمة التكلفة</th>
                  <th className="px-4 py-3 text-right font-medium">قيمة البيع</th>
                  <th className="px-4 py-3 text-right font-medium">الفئة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className={
                      isLowStock(item)
                        ? 'bg-amber-50 dark:bg-amber-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-750'
                    }
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {item.barcode ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">
                      <div className="font-medium">{item.nameAr}</div>
                      <div className="text-xs text-gray-500">{item.nameEn}</div>
                    </td>
                    <td
                      className={`px-4 py-3 font-bold text-center ${
                        isLowStock(item) ? 'text-amber-600 dark:text-amber-400' : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {Number(item.stockQty).toLocaleString('ar-IQ')}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {fmt(item.costPrice)}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      {fmt(item.retailPrice)}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {fmt(item.costValue)}
                    </td>
                    <td className="px-4 py-3 font-medium text-green-600 dark:text-green-400">
                      {fmt(item.retailValue)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {item.category || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
