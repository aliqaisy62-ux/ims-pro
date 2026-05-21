'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { vouchersService } from '@/services/vouchers.service'

type VoucherType = 'RECEIPT' | 'DISBURSEMENT'
type EntityType = 'CUSTOMER' | 'SUPPLIER' | 'OTHER'
type Currency = 'USD' | 'IQD'

interface Voucher {
  id: string
  voucherNumber: string
  type: VoucherType
  entityType: EntityType
  entityId: string | null
  amount: string | number
  currency: Currency
  exchangeRate: string | number
  description: string
  createdAt: string
  createdBy: { id: string; name: string }
}

const TYPE_LABELS: Record<VoucherType, string> = {
  RECEIPT: 'سند قبض',
  DISBURSEMENT: 'سند صرف',
}

const TYPE_CLASSES: Record<VoucherType, string> = {
  RECEIPT: 'bg-green-100 text-green-700',
  DISBURSEMENT: 'bg-red-100 text-red-700',
}

const ENTITY_LABELS: Record<EntityType, string> = {
  CUSTOMER: 'عميل',
  SUPPLIER: 'مورد',
  OTHER: 'أخرى',
}

function formatAmount(amount: string | number, currency: Currency): string {
  return `${Number(amount).toLocaleString('ar-IQ', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  })} ${currency === 'USD' ? 'دولار' : 'دينار'}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ar-IQ')
}

export default function VouchersPage() {
  const router = useRouter()

  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  // Filters
  const [filterType, setFilterType] = useState('')
  const [filterEntityType, setFilterEntityType] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')

  const limit = 20

  const loadVouchers = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, any> = { page, limit }
      if (filterType) params.type = filterType
      if (filterEntityType) params.entityType = filterEntityType
      if (filterFrom) params.from = filterFrom
      if (filterTo) params.to = filterTo

      const res = await vouchersService.getAll(params)
      setVouchers(res.data?.data ?? [])
      setTotal(res.data?.total ?? 0)
    } catch {
      setVouchers([])
    } finally {
      setLoading(false)
    }
  }, [page, filterType, filterEntityType, filterFrom, filterTo])

  useEffect(() => {
    loadVouchers()
  }, [loadVouchers])

  const totalPages = Math.ceil(total / limit)
  const hasFilters = filterType || filterEntityType || filterFrom || filterTo

  function clearFilters() {
    setFilterType('')
    setFilterEntityType('')
    setFilterFrom('')
    setFilterTo('')
    setPage(1)
  }

  return (
    <div dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">سندات القبض والصرف</h1>
        <button
          onClick={() => router.push('/vouchers/new')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          + سند جديد
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">نوع السند</label>
          <select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setPage(1) }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="">جميع الأنواع</option>
            <option value="RECEIPT">سند قبض</option>
            <option value="DISBURSEMENT">سند صرف</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">الجهة</label>
          <select
            value={filterEntityType}
            onChange={(e) => { setFilterEntityType(e.target.value); setPage(1) }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="">جميع الجهات</option>
            <option value="CUSTOMER">عميل</option>
            <option value="SUPPLIER">مورد</option>
            <option value="OTHER">أخرى</option>
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

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg"
          >
            مسح الفلاتر
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">جار التحميل...</div>
        ) : vouchers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">لا توجد سندات</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              <tr>
                <th className="px-4 py-3 text-right font-medium">رقم السند</th>
                <th className="px-4 py-3 text-right font-medium">النوع</th>
                <th className="px-4 py-3 text-right font-medium">الجهة</th>
                <th className="px-4 py-3 text-right font-medium">المبلغ</th>
                <th className="px-4 py-3 text-right font-medium">العملة</th>
                <th className="px-4 py-3 text-right font-medium">التاريخ</th>
                <th className="px-4 py-3 text-right font-medium">الوصف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {vouchers.map((v) => (
                <tr
                  key={v.id}
                  onClick={() => router.push(`/vouchers/${v.id}`)}
                  className="hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer"
                >
                  <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                    {v.voucherNumber}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_CLASSES[v.type]}`}>
                      {TYPE_LABELS[v.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {ENTITY_LABELS[v.entityType]}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    {Number(v.amount).toLocaleString('ar-IQ', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 3,
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        v.currency === 'USD'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {v.currency === 'USD' ? 'دولار' : 'دينار'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(v.createdAt)}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{v.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex gap-2 justify-center">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 border rounded disabled:opacity-50 text-sm"
          >
            السابق
          </button>
          <span className="px-3 py-1 text-sm text-gray-600">
            صفحة {page} من {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 border rounded disabled:opacity-50 text-sm"
          >
            التالي
          </button>
        </div>
      )}
    </div>
  )
}
