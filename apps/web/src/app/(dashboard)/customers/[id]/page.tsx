'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { customersService } from '@/services/customers.service'

export default function EditCustomerPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [form, setForm] = useState({ name: '', phone: '', address: '', type: 'RETAIL', creditLimit: 0, currency: 'IQD', notes: '' })

  useEffect(() => {
    customersService.getById(id)
      .then((c) => setForm({
        name: c.name,
        phone: c.phone || '',
        address: c.address || '',
        type: c.type,
        creditLimit: Number(c.creditLimit),
        currency: c.currency,
        notes: c.notes || '',
      }))
      .catch(() => router.push('/customers'))
      .finally(() => setFetching(false))
  }, [id, router])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target
    setForm(f => ({ ...f, [name]: type === 'number' ? Number(value) : value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await customersService.update(id, { ...form, phone: form.phone || null, address: form.address || null, notes: form.notes || null })
      router.push('/customers')
    } catch {
      alert('فشل في تحديث العميل')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) return <div className="p-8 text-center text-gray-500">جار التحميل...</div>

  return (
    <div dir="rtl" className="max-w-lg">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">← رجوع</button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">تعديل العميل</h1>
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">النوع</label>
            <select name="type" value={form.type} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="RETAIL">مفرد</option>
              <option value="WHOLESALE">جملة</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">حد الائتمان</label>
            <input name="creditLimit" type="number" min="0" value={form.creditLimit} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
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
          <button type="button" onClick={() => router.push(`/customers/${id}/statement`)} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">كشف الحساب</button>
          <button type="button" onClick={() => router.back()} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">إلغاء</button>
        </div>
      </form>
    </div>
  )
}
