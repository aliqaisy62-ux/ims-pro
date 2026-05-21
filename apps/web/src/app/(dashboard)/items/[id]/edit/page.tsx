'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { itemsService } from '@/services/items.service'

interface Category { id: string; name_ar: string; name_en: string }

export default function EditItemPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [form, setForm] = useState({
    barcode: '', name_ar: '', name_en: '', unit: 'piece', categoryId: '',
    costPrice: 0, retailPrice: 0, wholesalePrice: 0, specialPrice: 0,
    dollarPrice: 0, dinarPrice: 0, minimumStock: 0,
  })

  useEffect(() => {
    Promise.all([
      itemsService.getById(id),
      itemsService.getCategories(),
    ]).then(([item, cats]) => {
      setCategories(cats)
      setForm({
        barcode: item.barcode || '',
        name_ar: item.name_ar,
        name_en: item.name_en,
        unit: item.unit,
        categoryId: item.categoryId || '',
        costPrice: Number(item.costPrice),
        retailPrice: Number(item.retailPrice),
        wholesalePrice: Number(item.wholesalePrice),
        specialPrice: Number(item.specialPrice),
        dollarPrice: Number(item.dollarPrice),
        dinarPrice: Number(item.dinarPrice),
        minimumStock: Number(item.minimumStock),
      })
    }).catch(() => router.push('/items')).finally(() => setFetching(false))
  }, [id, router])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = e.target
    setForm(f => ({ ...f, [name]: type === 'number' ? Number(value) : value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await itemsService.update(id, { ...form, categoryId: form.categoryId || null })
      router.push('/items')
    } catch {
      alert('فشل في تحديث الصنف')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) return <div className="p-8 text-center text-gray-500">جار التحميل...</div>

  const priceFields = [
    { name: 'costPrice', label: 'سعر التكلفة' },
    { name: 'retailPrice', label: 'سعر المفرد' },
    { name: 'wholesalePrice', label: 'سعر الجملة' },
    { name: 'specialPrice', label: 'السعر الخاص' },
    { name: 'dollarPrice', label: 'سعر الدولار (USD)' },
    { name: 'dinarPrice', label: 'سعر الدينار (IQD)' },
  ]

  return (
    <div dir="rtl" className="max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">← رجوع</button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">تعديل الصنف</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم (عربي) *</label>
            <input name="name_ar" value={form.name_ar} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم (إنجليزي) *</label>
            <input name="name_en" value={form.name_en} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الباركود</label>
            <input name="barcode" value={form.barcode} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الوحدة</label>
            <select name="unit" value={form.unit} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              {['piece','kg','gram','liter','box','carton','pack','dozen','meter'].map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الفئة</label>
            <select name="categoryId" value={form.categoryId} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="">— اختر فئة —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الحد الأدنى للمخزون</label>
            <input name="minimumStock" type="number" min="0" value={form.minimumStock} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">الأسعار</h3>
          <div className="grid grid-cols-3 gap-3">
            {priceFields.map(f => (
              <div key={f.name}>
                <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                <input name={f.name} type="number" min="0" step="0.001" value={(form as Record<string, number | string>)[f.name] as number} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
            {loading ? 'جار الحفظ...' : 'حفظ التغييرات'}
          </button>
          <button type="button" onClick={() => router.back()} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">إلغاء</button>
        </div>
      </form>
    </div>
  )
}
