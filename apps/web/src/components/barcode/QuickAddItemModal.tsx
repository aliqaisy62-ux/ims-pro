'use client'

import { useState } from 'react'
import { itemsService } from '@/services/items.service'

export interface ScannedItem {
  id: string
  name_ar: string
  name_en: string
  barcode: string | null
  stockQty: number
  retailPrice: number
  wholesalePrice: number
  specialPrice: number
  dollarPrice: number
  dinarPrice: number
}

interface Props {
  barcode: string
  onAdded: (item: ScannedItem) => void
  onClose: () => void
}

export function QuickAddItemModal({ barcode, onAdded, onClose }: Props) {
  const [form, setForm] = useState({
    name_ar: '', name_en: '',
    costPrice: 0, retailPrice: 0, wholesalePrice: 0,
    specialPrice: 0, dollarPrice: 0, dinarPrice: 0,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type } = e.target
    setForm(f => ({ ...f, [name]: type === 'number' ? Number(value) : value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name_ar.trim()) { setError('اسم الصنف بالعربي مطلوب'); return }
    setLoading(true)
    setError('')
    try {
      const item = await itemsService.create({
        ...form,
        barcode,
        unit: 'piece',
        minimumStock: 0,
      })
      onAdded(item as ScannedItem)
    } catch {
      setError('فشل في حفظ الصنف. تحقق من البيانات.')
    } finally {
      setLoading(false)
    }
  }

  const priceFields = [
    { name: 'costPrice', label: 'التكلفة' },
    { name: 'retailPrice', label: 'المفرد' },
    { name: 'wholesalePrice', label: 'الجملة' },
    { name: 'specialPrice', label: 'الخاص' },
    { name: 'dollarPrice', label: 'دولار' },
    { name: 'dinarPrice', label: 'دينار' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" dir="rtl">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-5 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 dark:text-white">صنف غير موجود — إضافة سريعة</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            ×
          </button>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2 mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M4.93 4.93l14.14 14.14M12 2a10 10 0 100 20A10 10 0 0012 2z" />
          </svg>
          <span className="text-xs text-amber-700 dark:text-amber-400">الباركود:</span>
          <span className="font-mono font-bold text-amber-800 dark:text-amber-300 text-sm">{barcode}</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم بالعربي *</label>
              <input
                name="name_ar" value={form.name_ar} onChange={handleChange}
                required autoFocus
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم بالإنجليزي</label>
              <input
                name="name_en" value={form.name_en} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">الأسعار (اختياري)</p>
            <div className="grid grid-cols-3 gap-2">
              {priceFields.map(f => (
                <div key={f.name}>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{f.label}</label>
                  <input
                    name={f.name} type="number" min="0" step="0.001"
                    value={(form as Record<string, unknown>)[f.name] as number}
                    onChange={handleChange}
                    className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-red-500 dark:text-red-400 text-xs">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
            >
              إلغاء
            </button>
            <button
              type="submit" disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
            >
              {loading ? 'جار الحفظ...' : 'حفظ وإضافة للفاتورة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
