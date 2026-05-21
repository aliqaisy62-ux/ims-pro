'use client'

import { useState, useEffect, useCallback } from 'react'
import { expensesService } from '@/services/expenses.service'

interface ExpenseCategory {
  id: string
  name_ar: string
  name_en: string
}

export default function CategoryManager() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [nameAr, setNameAr] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  const loadCategories = useCallback(async () => {
    setLoading(true)
    try {
      const res = await expensesService.getCategories()
      setCategories(res.data ?? [])
    } catch {
      setCategories([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!nameAr.trim() || !nameEn.trim()) {
      setError('يرجى إدخال الاسم بالعربي والإنجليزي')
      return
    }
    setAdding(true)
    setError('')
    try {
      await expensesService.createCategory({ nameAr: nameAr.trim(), nameEn: nameEn.trim() })
      setNameAr('')
      setNameEn('')
      await loadCategories()
    } catch {
      setError('فشل في إضافة الفئة')
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`هل أنت متأكد من حذف فئة "${name}"؟`)) return
    try {
      await expensesService.deleteCategory(id)
      await loadCategories()
    } catch (err: any) {
      const msg = err?.response?.data?.error
      if (msg) {
        alert(msg)
      } else {
        alert('فشل في حذف الفئة')
      }
    }
  }

  return (
    <div dir="rtl" className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white">فئات المصاريف</h3>

      {/* Add Form */}
      <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            الاسم بالعربي *
          </label>
          <input
            type="text"
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
            placeholder="مثال: إيجار"
            maxLength={100}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm w-40"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            الاسم بالإنجليزي *
          </label>
          <input
            type="text"
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            placeholder="e.g. Rent"
            maxLength={100}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm w-40"
          />
        </div>
        <button
          type="submit"
          disabled={adding}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
        >
          {adding ? 'جار الإضافة...' : '+ إضافة'}
        </button>
      </form>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Categories List */}
      {loading ? (
        <div className="text-center text-gray-500 py-4">جار التحميل...</div>
      ) : categories.length === 0 ? (
        <div className="text-center text-gray-500 py-4">لا توجد فئات مضافة</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              <tr>
                <th className="px-4 py-3 text-right font-medium">الاسم (عربي)</th>
                <th className="px-4 py-3 text-right font-medium">الاسم (إنجليزي)</th>
                <th className="px-4 py-3 text-right font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                  <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">
                    {cat.name_ar}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{cat.name_en}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(cat.id, cat.name_ar)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
