'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { stockService } from '@/services/stock.service'
import api from '@/lib/api'
import { TableSkeleton } from '@/components/ui/TableSkeleton'

interface ItemOption {
  id: string
  name_ar: string
  name_en: string
  barcode: string | null
  unit: string
  stockQty: number
}

interface TransferItem {
  id: string
  name_ar: string
  name_en: string
  barcode: string | null
  unit: string
}

interface Transfer {
  id: string
  type: 'IN' | 'OUT'
  reason: 'DAMAGE' | 'ADJUSTMENT' | 'TRANSFER' | 'RETURN' | 'EXPIRED'
  quantity: string | number
  notes: string | null
  createdAt: string
  item: TransferItem
  createdBy: { id: string; name: string }
}

const REASON_LABELS: Record<string, string> = {
  DAMAGE: 'تالف',
  ADJUSTMENT: 'تسوية',
  TRANSFER: 'نقل',
  RETURN: 'مرتجع',
  EXPIRED: 'منتهي الصلاحية',
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ar-IQ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function StockPage() {
  // ── Form state ─────────────────────────────────────────────────────────────
  const [itemSearch, setItemSearch] = useState('')
  const [itemOptions, setItemOptions] = useState<ItemOption[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ItemOption | null>(null)
  const [transferType, setTransferType] = useState<'IN' | 'OUT'>('IN')
  const [reason, setReason] = useState<string>('ADJUSTMENT')
  const [quantity, setQuantity] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // ── Transfers list state ───────────────────────────────────────────────────
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [listLoading, setListLoading] = useState(true)
  const [filterType, setFilterType] = useState('')
  const [filterReason, setFilterReason] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')

  const limit = 20
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Item search with debounce ──────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!itemSearch.trim()) {
      setItemOptions([])
      setShowDropdown(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get('/api/items', { params: { search: itemSearch, pageSize: 10 } })
        const items: ItemOption[] = res.data?.items ?? []
        setItemOptions(items)
        setShowDropdown(items.length > 0)
      } catch {
        setItemOptions([])
        setShowDropdown(false)
      }
    }, 350)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [itemSearch])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ── Load transfers ─────────────────────────────────────────────────────────
  const loadTransfers = useCallback(async () => {
    setListLoading(true)
    try {
      const params: Record<string, any> = { page, limit }
      if (filterType) params.type = filterType
      if (filterReason) params.reason = filterReason
      if (filterFrom) params.from = filterFrom
      if (filterTo) params.to = filterTo
      const res = await stockService.getTransfers(params)
      setTransfers(res.data?.data ?? [])
      setTotal(res.data?.total ?? 0)
    } catch {
      setTransfers([])
    } finally {
      setListLoading(false)
    }
  }, [page, filterType, filterReason, filterFrom, filterTo])

  useEffect(() => { loadTransfers() }, [loadTransfers])

  // ── Form submit ────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormMsg(null)

    if (!selectedItem) {
      setFormMsg({ type: 'error', text: 'يرجى اختيار صنف' })
      return
    }
    const qty = parseFloat(quantity)
    if (!qty || qty <= 0) {
      setFormMsg({ type: 'error', text: 'يرجى إدخال كمية صحيحة' })
      return
    }

    setSubmitting(true)
    try {
      await stockService.createTransfer({
        itemId: selectedItem.id,
        type: transferType,
        reason,
        quantity: qty,
        notes: notes.trim() || undefined,
      })
      setFormMsg({ type: 'success', text: 'تم تسجيل حركة المخزون بنجاح' })
      setSelectedItem(null)
      setItemSearch('')
      setQuantity('')
      setNotes('')
      setTransferType('IN')
      setReason('ADJUSTMENT')
      loadTransfers()
    } catch (err: unknown) {
      const serverMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      if (serverMsg === 'INSUFFICIENT_STOCK') {
        setFormMsg({ type: 'error', text: 'الكمية المطلوبة أكبر من المخزون الحالي' })
      } else {
        setFormMsg({ type: 'error', text: 'فشل في تسجيل الحركة، يرجى المحاولة مرة أخرى' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div dir="rtl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">حركة المخزون</h1>

      {/* ── Form ───────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">تسجيل حركة مخزون</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Item search */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              الصنف <span className="text-red-500">*</span>
            </label>
            {selectedItem ? (
              <div className="flex items-center gap-3 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
                <div className="flex-1">
                  <span className="font-medium text-gray-900 dark:text-white">{selectedItem.name_ar}</span>
                  <span className="text-gray-400 text-xs mr-2">{selectedItem.name_en}</span>
                  {selectedItem.barcode && (
                    <span className="text-gray-400 text-xs mr-2 font-mono">{selectedItem.barcode}</span>
                  )}
                  <span className="text-blue-500 text-xs mr-2">
                    مخزون: {Number(selectedItem.stockQty).toLocaleString('ar-IQ')} {selectedItem.unit}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedItem(null); setItemSearch('') }}
                  className="text-gray-400 hover:text-red-500 text-sm"
                >
                  تغيير
                </button>
              </div>
            ) : (
              <input
                type="text"
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder="ابحث باسم الصنف أو الباركود..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}

            {showDropdown && !selectedItem && (
              <div className="absolute top-full right-0 left-0 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
                {itemOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setSelectedItem(opt)
                      setItemSearch(opt.name_ar)
                      setShowDropdown(false)
                    }}
                    className="w-full text-right px-4 py-2 hover:bg-blue-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0"
                  >
                    <div className="font-medium text-gray-900 dark:text-white">{opt.name_ar}</div>
                    <div className="text-xs text-gray-400">
                      {opt.name_en}
                      {opt.barcode && <span className="font-mono mr-2">{opt.barcode}</span>}
                      <span className="mr-2 text-blue-500">
                        مخزون: {Number(opt.stockQty).toLocaleString('ar-IQ')} {opt.unit}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Transfer type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              نوع الحركة <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="IN"
                  checked={transferType === 'IN'}
                  onChange={() => setTransferType('IN')}
                  className="text-green-600"
                />
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                  إدخال
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="OUT"
                  checked={transferType === 'OUT'}
                  onChange={() => setTransferType('OUT')}
                  className="text-red-600"
                />
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
                  إخراج
                </span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                السبب <span className="text-red-500">*</span>
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ADJUSTMENT">تسوية</option>
                <option value="DAMAGE">تالف</option>
                <option value="TRANSFER">نقل</option>
                <option value="RETURN">مرتجع</option>
                <option value="EXPIRED">منتهي الصلاحية</option>
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                الكمية <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                step="0.001"
                min="0.001"
                placeholder="0.000"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              ملاحظات (اختياري)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="أي ملاحظات إضافية..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Message */}
          {formMsg && (
            <div
              className={`px-4 py-3 rounded-lg text-sm font-medium ${
                formMsg.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {formMsg.text}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-sm"
          >
            {submitting ? 'جار التسجيل...' : 'تسجيل الحركة'}
          </button>
        </form>
      </div>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">النوع</label>
          <select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setPage(1) }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="">الكل</option>
            <option value="IN">إدخال</option>
            <option value="OUT">إخراج</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">السبب</label>
          <select
            value={filterReason}
            onChange={(e) => { setFilterReason(e.target.value); setPage(1) }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="">الكل</option>
            <option value="DAMAGE">تالف</option>
            <option value="ADJUSTMENT">تسوية</option>
            <option value="TRANSFER">نقل</option>
            <option value="RETURN">مرتجع</option>
            <option value="EXPIRED">منتهي الصلاحية</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">من تاريخ</label>
          <input
            type="date"
            value={filterFrom}
            onChange={(e) => { setFilterFrom(e.target.value); setPage(1) }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">إلى تاريخ</label>
          <input
            type="date"
            value={filterTo}
            onChange={(e) => { setFilterTo(e.target.value); setPage(1) }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
        </div>

        {(filterType || filterReason || filterFrom || filterTo) && (
          <button
            onClick={() => {
              setFilterType('')
              setFilterReason('')
              setFilterFrom('')
              setFilterTo('')
              setPage(1)
            }}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg"
          >
            مسح الفلاتر
          </button>
        )}
      </div>

      {/* ── Transfers table ─────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-semibold text-gray-800 dark:text-white">
            سجل الحركات
            {total > 0 && (
              <span className="mr-2 text-sm text-gray-400 font-normal">({total} حركة)</span>
            )}
          </h2>
        </div>

        {listLoading ? (
          <TableSkeleton cols={7} />
        ) : transfers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">لا توجد حركات مخزون</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="px-4 py-3 text-right font-medium">التاريخ</th>
                  <th className="px-4 py-3 text-right font-medium">المنتج</th>
                  <th className="px-4 py-3 text-right font-medium">النوع</th>
                  <th className="px-4 py-3 text-right font-medium">السبب</th>
                  <th className="px-4 py-3 text-right font-medium">الكمية</th>
                  <th className="px-4 py-3 text-right font-medium">الملاحظات</th>
                  <th className="px-4 py-3 text-right font-medium">المسجل بواسطة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {transfers.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {formatDate(t.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">{t.item.name_ar}</div>
                      <div className="text-gray-400 text-xs">
                        {t.item.name_en}
                        {t.item.barcode && (
                          <span className="font-mono mr-1"> — {t.item.barcode}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          t.type === 'IN'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {t.type === 'IN' ? 'إدخال' : 'إخراج'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      {REASON_LABELS[t.reason] ?? t.reason}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {Number(t.quantity).toLocaleString('ar-IQ', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 3,
                      })}{' '}
                      {t.item.unit}
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                      {t.notes || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {t.createdBy.name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Pagination ──────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="mt-4 flex gap-2 justify-center">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            السابق
          </button>
          <span className="px-3 py-1 text-sm text-gray-600">
            صفحة {page} من {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            التالي
          </button>
        </div>
      )}
    </div>
  )
}
