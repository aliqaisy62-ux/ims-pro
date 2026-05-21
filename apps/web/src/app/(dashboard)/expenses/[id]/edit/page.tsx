'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { expensesService } from '@/services/expenses.service'
import api from '@/lib/api'

interface ExpenseCategory {
  id: string
  name_ar: string
  name_en: string
}

export default function EditExpensePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    categoryId: '',
    amount: '',
    currency: 'IQD',
    exchangeRate: '1480',
    description: '',
    paidBy: '',
    notes: '',
    date: '',
  })

  useEffect(() => {
    Promise.all([
      expensesService.getCategories(),
      expensesService.getById(id),
      api.get('/api/settings'),
    ])
      .then(([catRes, expRes, settingsRes]) => {
        setCategories(catRes.data ?? [])

        const exp = expRes.data
        if (exp) {
          const rate = Number(exp.exchangeRate ?? 1480)
          setForm({
            categoryId: exp.categoryId ?? exp.category?.id ?? '',
            amount: String(Number(exp.amount)),
            currency: exp.currency ?? 'IQD',
            exchangeRate: String(rate),
            description: exp.description ?? '',
            paidBy: exp.paidBy ?? '',
            notes: exp.notes ?? '',
            date: new Date(exp.date).toISOString().slice(0, 10),
          })
        }

        const settingsRate = Number(settingsRes.data?.data?.exchange_rate)
        if (settingsRate > 0 && !expRes.data?.exchangeRate) {
          setForm((f) => ({ ...f, exchangeRate: String(settingsRate) }))
        }
      })
      .catch(() => setError('فشل في تحميل بيانات المصروف'))
      .finally(() => setPageLoading(false))
  }, [id])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.categoryId) { setError('يرجى اختيار الفئة'); return }
    if (!form.amount || Number(form.amount) <= 0) { setError('يرجى إدخال مبلغ صحيح'); return }
    setError('')
    setLoading(true)
    try {
      await expensesService.update(id, {
        categoryId: form.categoryId,
        amount: Number(form.amount),
        currency: form.currency,
        exchangeRate: Number(form.exchangeRate),
        description: form.description || undefined,
        paidBy: form.paidBy || undefined,
        notes: form.notes || undefined,
        date: form.date,
      })
      router.push('/expenses')
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      setError(axiosErr.response?.data?.error ?? 'فشل في تحديث المصروف')
    } finally {
      setLoading(false)
    }
  }

  const equivalentIQD = form.currency === 'USD' && form.amount
    ? (Number(form.amount) * Number(form.exchangeRate)).toLocaleString('ar-IQ', { maximumFractionDigits: 0 })
    : null

  if (pageLoading) {
    return (
      <div dir="rtl" className="max-w-lg">
        <div className="p-8 text-center text-gray-500">جار التحميل...</div>
      </div>
    )
  }

  return (
    <div dir="rtl" className="max-w-lg">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          ← رجوع
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">تعديل المصروف</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 space-y-4">
        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            الفئة <span className="text-red-500">*</span>
          </label>
          <select
            name="categoryId"
            value={form.categoryId}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="">— اختر الفئة —</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name_ar}</option>
            ))}
          </select>
        </div>

        {/* Amount + Currency */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              المبلغ <span className="text-red-500">*</span>
            </label>
            <input
              name="amount"
              type="number"
              step="0.001"
              min="0.001"
              value={form.amount}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">العملة</label>
            <select
              name="currency"
              value={form.currency}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="IQD">دينار عراقي (IQD)</option>
              <option value="USD">دولار أمريكي (USD)</option>
            </select>
          </div>
        </div>

        {/* Exchange rate (shown when USD) */}
        {form.currency === 'USD' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              سعر الصرف (IQD لكل USD)
            </label>
            <input
              name="exchangeRate"
              type="number"
              step="1"
              min="1"
              value={form.exchangeRate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
            {equivalentIQD && (
              <p className="mt-1 text-xs text-gray-500">
                ما يعادل: <span className="font-medium text-gray-700 dark:text-gray-300">{equivalentIQD} دينار</span>
              </p>
            )}
          </div>
        )}

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            التاريخ <span className="text-red-500">*</span>
          </label>
          <input
            name="date"
            type="date"
            value={form.date}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الوصف</label>
          <input
            name="description"
            type="text"
            value={form.description}
            onChange={handleChange}
            placeholder="وصف مختصر للمصروف..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
        </div>

        {/* Paid by */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">دفع بواسطة</label>
          <input
            name="paidBy"
            type="text"
            value={form.paidBy}
            onChange={handleChange}
            placeholder="اسم الشخص الذي دفع..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ملاحظات</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={2}
            placeholder="ملاحظات إضافية..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-sm"
          >
            {loading ? 'جار الحفظ...' : 'حفظ التعديلات'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
          >
            إلغاء
          </button>
        </div>
      </form>
    </div>
  )
}
