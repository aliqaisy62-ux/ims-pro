'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { suppliersService } from '@/services/suppliers.service'

export default function EditSupplierPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [form, setForm] = useState({ name: '', phone: '', address: '', currency: 'IQD', notes: '' })

  useEffect(() => {
    suppliersService.getById(id)
      .then((s) => setForm({
        name: s.name,
        phone: s.phone || '',
        address: s.address || '',
        currency: s.currency,
        notes: s.notes || '',
      }))
      .catch(() => router.push('/suppliers'))
      .finally(() => setFetching(false))
  }, [id, router])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await suppliersService.update(id, { ...form, phone: form.phone || null, address: form.address || null, notes: form.notes || null })
      router.push('/suppliers')
    } catch {
      alert('فشل في تحديث المورد')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) return <div className="p-8 text-center text-gray-500">جار التحميل...</div>

  return (
    <div dir="rtl" className="max-w-lg">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">← رجوع</button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">تعديل المورد</h1>
      </div>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم *</label>
          <input name="name" value={form.name} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الهاتف</label>
            <input name="phone" value={form.phone} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">العملة</label>
            <select name="currency" value={form.currency} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="IQD">دينار عراقي</option>
              <option value="USD">دولار أمريكي</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">العنوان</label>
          <input name="address" value={form.address} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ملاحظات</label>
          <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
            {loading ? 'جار الحفظ...' : 'حفظ التغييرات'}
          </button>
          <button type="button" onClick={() => router.push(`/suppliers/${id}/statement`)} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">كشف الحساب</button>
          <button type="button" onClick={() => router.back()} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">إلغاء</button>
        </div>
      </form>
    </div>
  )
}
