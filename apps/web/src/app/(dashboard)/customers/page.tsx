'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { customersService } from '@/services/customers.service'

interface Customer {
  id: string
  name: string
  phone: string | null
  type: string
  balance: number
  currency: string
  creditLimit: number
}

export default function CustomersPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await customersService.getAll({ search, page, pageSize: 20 })
      setCustomers(data.customers)
      setTotal(data.total)
    } finally {
      setLoading(false)
    }
  }, [search, page])

  useEffect(() => { load() }, [load])

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">العملاء</h1>
        <button onClick={() => router.push('/customers/new')} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
          + إضافة عميل
        </button>
      </div>

      <input
        type="text"
        placeholder="بحث بالاسم أو الهاتف..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1) }}
        className="mb-4 w-full max-w-sm px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
      />

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">جار التحميل...</div>
        ) : customers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">لا يوجد عملاء</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              <tr>
                <th className="px-4 py-3 text-right font-medium">الاسم</th>
                <th className="px-4 py-3 text-right font-medium">الهاتف</th>
                <th className="px-4 py-3 text-right font-medium">النوع</th>
                <th className="px-4 py-3 text-right font-medium">الرصيد</th>
                <th className="px-4 py-3 text-right font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{c.name}</td>
                  <td className="px-4 py-3 text-gray-500">{c.phone || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.type === 'WHOLESALE' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {c.type === 'WHOLESALE' ? 'جملة' : 'مفرد'}
                    </span>
                  </td>
                  <td className={`px-4 py-3 font-medium ${Number(c.balance) > 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                    {Number(c.balance).toLocaleString('ar-IQ')} {c.currency}
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => router.push(`/customers/${c.id}`)} className="text-blue-600 hover:underline text-sm">تعديل</button>
                    <button onClick={() => router.push(`/customers/${c.id}/statement`)} className="text-gray-500 hover:underline text-sm">كشف حساب</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {total > 20 && (
        <div className="mt-4 flex gap-2 justify-center">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded disabled:opacity-50">السابق</button>
          <span className="px-3 py-1 text-sm text-gray-600">صفحة {page} من {Math.ceil(total / 20)}</span>
          <button disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded disabled:opacity-50">التالي</button>
        </div>
      )}
    </div>
  )
}
