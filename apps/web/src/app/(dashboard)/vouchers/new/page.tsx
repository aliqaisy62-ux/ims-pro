'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { vouchersService } from '@/services/vouchers.service'
import api from '@/lib/api'

type VoucherType = 'RECEIPT' | 'DISBURSEMENT'
type EntityType = 'CUSTOMER' | 'SUPPLIER' | 'OTHER'
type Currency = 'USD' | 'IQD'

interface EntityOption {
  id: string
  name: string
}

export default function NewVoucherPage() {
  const router = useRouter()
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [voucherType, setVoucherType] = useState<VoucherType>('RECEIPT')
  const [entityType, setEntityType] = useState<EntityType>('OTHER')
  const [entityId, setEntityId] = useState<string>('')
  const [entitySearch, setEntitySearch] = useState('')
  const [entityOptions, setEntityOptions] = useState<EntityOption[]>([])
  const [entitySearchLoading, setEntitySearchLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedEntityName, setSelectedEntityName] = useState('')

  const [form, setForm] = useState({
    amount: '',
    currency: 'IQD' as Currency,
    exchangeRate: '1480',
    description: '',
  })

  // Reset entity selection when entityType changes
  useEffect(() => {
    setEntityId('')
    setEntitySearch('')
    setSelectedEntityName('')
    setEntityOptions([])
    setShowDropdown(false)
  }, [entityType])

  // Search customers or suppliers
  useEffect(() => {
    if (entityType === 'OTHER') return
    if (!entitySearch || entitySearch.length < 1) {
      setEntityOptions([])
      setShowDropdown(false)
      return
    }

    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(async () => {
      setEntitySearchLoading(true)
      try {
        const endpoint = entityType === 'CUSTOMER' ? '/api/customers' : '/api/suppliers'
        const res = await api.get(endpoint, { params: { search: entitySearch, pageSize: 10 } })
        const items: EntityOption[] =
          entityType === 'CUSTOMER'
            ? (res.data?.data?.customers ?? []).map((c: any) => ({ id: c.id, name: c.name }))
            : (res.data?.data?.suppliers ?? []).map((s: any) => ({ id: s.id, name: s.name }))
        setEntityOptions(items)
        setShowDropdown(items.length > 0)
      } catch {
        setEntityOptions([])
        setShowDropdown(false)
      } finally {
        setEntitySearchLoading(false)
      }
    }, 300)

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
    }
  }, [entitySearch, entityType])

  function handleFormChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  function selectEntity(option: EntityOption) {
    setEntityId(option.id)
    setSelectedEntityName(option.name)
    setEntitySearch(option.name)
    setShowDropdown(false)
    setEntityOptions([])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.amount || Number(form.amount) <= 0) {
      setError('يرجى إدخال مبلغ صحيح')
      return
    }
    if (!form.description.trim()) {
      setError('يرجى إدخال الوصف')
      return
    }
    if ((entityType === 'CUSTOMER' || entityType === 'SUPPLIER') && !entityId) {
      setError('يرجى اختيار الجهة')
      return
    }

    setLoading(true)
    try {
      await vouchersService.create({
        type: voucherType,
        entityType,
        entityId: entityId || null,
        amount: Number(form.amount),
        currency: form.currency,
        exchangeRate: Number(form.exchangeRate),
        description: form.description,
      })
      router.push('/vouchers')
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      setError(axiosErr.response?.data?.error ?? 'فشل في حفظ السند')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div dir="rtl" className="max-w-lg">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="text-gray-500 hover:text-gray-700"
        >
          ← رجوع
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">سند جديد</h1>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 space-y-5"
      >
        {/* Voucher Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            نوع السند *
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setVoucherType('RECEIPT')}
              className={`py-3 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${
                voucherType === 'RECEIPT'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              سند قبض
            </button>
            <button
              type="button"
              onClick={() => setVoucherType('DISBURSEMENT')}
              className={`py-3 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${
                voucherType === 'DISBURSEMENT'
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              سند صرف
            </button>
          </div>
        </div>

        {/* Entity Type Radio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            الجهة
          </label>
          <div className="flex gap-4">
            {(['CUSTOMER', 'SUPPLIER', 'OTHER'] as EntityType[]).map((et) => (
              <label key={et} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="entityType"
                  value={et}
                  checked={entityType === et}
                  onChange={() => setEntityType(et)}
                  className="text-blue-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {et === 'CUSTOMER' ? 'عميل' : et === 'SUPPLIER' ? 'مورد' : 'أخرى'}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Entity Selector */}
        {entityType !== 'OTHER' && (
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {entityType === 'CUSTOMER' ? 'اختر العميل *' : 'اختر المورد *'}
            </label>
            <input
              type="text"
              value={entitySearch}
              onChange={(e) => {
                setEntitySearch(e.target.value)
                if (e.target.value !== selectedEntityName) {
                  setEntityId('')
                  setSelectedEntityName('')
                }
              }}
              placeholder={entityType === 'CUSTOMER' ? 'ابحث عن عميل...' : 'ابحث عن مورد...'}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              autoComplete="off"
            />
            {entitySearchLoading && (
              <div className="absolute left-3 top-9 text-xs text-gray-400">جار البحث...</div>
            )}
            {showDropdown && entityOptions.length > 0 && (
              <ul className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {entityOptions.map((opt) => (
                  <li
                    key={opt.id}
                    onClick={() => selectEntity(opt)}
                    className="px-3 py-2 text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer"
                  >
                    {opt.name}
                  </li>
                ))}
              </ul>
            )}
            {entityId && (
              <p className="mt-1 text-xs text-green-600">تم الاختيار: {selectedEntityName}</p>
            )}
          </div>
        )}

        {/* Amount + Currency */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              المبلغ *
            </label>
            <input
              name="amount"
              type="number"
              step="0.001"
              min="0.001"
              value={form.amount}
              onChange={handleFormChange}
              required
              placeholder="0.000"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              العملة *
            </label>
            <select
              name="currency"
              value={form.currency}
              onChange={handleFormChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="IQD">دينار عراقي (IQD)</option>
              <option value="USD">دولار أمريكي (USD)</option>
            </select>
          </div>
        </div>

        {/* Exchange Rate */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            سعر الصرف (IQD لكل USD)
          </label>
          <input
            name="exchangeRate"
            type="number"
            step="0.001"
            min="0.001"
            value={form.exchangeRate}
            onChange={handleFormChange}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            الوصف *
          </label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleFormChange}
            rows={3}
            required
            placeholder="أدخل وصف السند..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-sm"
          >
            {loading ? 'جار الحفظ...' : 'حفظ السند'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
          >
            إلغاء
          </button>
        </div>
      </form>
    </div>
  )
}
