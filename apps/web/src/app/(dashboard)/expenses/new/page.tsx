'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { expensesService } from '@/services/expenses.service'

interface ExpenseCategory {
  id: string
  name_ar: string
  name_en: string
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function NewExpensePage() {
  const router = useRouter()
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    categoryId: '',
    amount: '',
    currency: 'IQD',
    exchangeRate: '1480',
    description: '',
    date: todayISO(),
  })

  useEffect(() => {
    expensesService
      .getCategories()
      .then((res) => setCategories(res.data ?? []))
      .catch(() => setCategories([]))
  }, [])

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.categoryId) {
      alert('يرجى اختيار الفئة')
      return
    }
    setLoading(true)
    try {
      await expensesService.create({
        categoryId: form.categoryId,
        amount: Number(form.amount),
        currency: form.currency,
        exchangeRate: Number(form.exchangeRate),
        description: form.description || undefined,
        date: form.date,
      })
      router.push('/expenses')
    } catch {
      alert('فشل في حفظ المصروف')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div dir="rtl" className="max-w-lg">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">
          ← رجوع
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">إضافة مصروف جديد</h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 space-y-4"
      >
        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            الفئة *
          </label>
          <select
            name="categoryId"
            value={form.categoryId}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">— اختر الفئة —</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name_ar}
              </option>
            ))}
          </select>
        </div>

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
              min="0"
              value={form.amount}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              العملة *
            </label>
            <select
              name="currency"
              value={form.currency}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
            min="0"
            value={form.exchangeRate}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            الوصف
          </label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            التاريخ *
          </label>
          <input
            name="date"
            type="date"
            value={form.date}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {loading ? 'جار الحفظ...' : 'حفظ المصروف'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            إلغاء
          </button>
        </div>
      </form>
    </div>
  )
}
