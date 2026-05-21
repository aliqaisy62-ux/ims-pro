'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { customersService } from '@/services/customers.service'

interface Invoice { id: string; invoiceNumber: string; createdAt: string; total: number; amountPaid: number; balance: number; currency: string; type: string }
interface Voucher { id: string; voucherNumber: string; createdAt: string; amount: number; currency: string; type: string; description: string }

export default function CustomerStatementPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<{ customer: { name: string; balance: number; currency: string } | null; invoices: Invoice[]; vouchers: Voucher[] } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    customersService.getStatement(id)
      .then(setData)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="p-8 text-center text-gray-500">جار التحميل...</div>
  if (!data) return null

  return (
    <div dir="rtl">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">← رجوع</button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">كشف حساب العميل</h1>
          <p className="text-gray-500">{data.customer?.name} — الرصيد: {Number(data.customer?.balance).toLocaleString('ar-IQ')} {data.customer?.currency}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden mb-6">
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 font-semibold text-gray-700 dark:text-gray-300">الفواتير</div>
        {data.invoices.length === 0 ? (
          <div className="p-4 text-center text-gray-500">لا توجد فواتير</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              <tr>
                <th className="px-4 py-2 text-right">رقم الفاتورة</th>
                <th className="px-4 py-2 text-right">التاريخ</th>
                <th className="px-4 py-2 text-right">المجموع</th>
                <th className="px-4 py-2 text-right">المدفوع</th>
                <th className="px-4 py-2 text-right">الرصيد</th>
                <th className="px-4 py-2 text-right">النوع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {data.invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="px-4 py-2 font-mono text-xs">{inv.invoiceNumber}</td>
                  <td className="px-4 py-2 text-gray-500">{new Date(inv.createdAt).toLocaleDateString('ar-IQ')}</td>
                  <td className="px-4 py-2">{Number(inv.total).toLocaleString('ar-IQ')} {inv.currency}</td>
                  <td className="px-4 py-2">{Number(inv.amountPaid).toLocaleString('ar-IQ')}</td>
                  <td className={`px-4 py-2 font-medium ${Number(inv.balance) > 0 ? 'text-red-600' : 'text-green-600'}`}>{Number(inv.balance).toLocaleString('ar-IQ')}</td>
                  <td className="px-4 py-2">{inv.type === 'CASH' ? 'نقداً' : 'آجل'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 font-semibold text-gray-700 dark:text-gray-300">المقبوضات</div>
        {data.vouchers.length === 0 ? (
          <div className="p-4 text-center text-gray-500">لا توجد سندات</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              <tr>
                <th className="px-4 py-2 text-right">رقم السند</th>
                <th className="px-4 py-2 text-right">التاريخ</th>
                <th className="px-4 py-2 text-right">المبلغ</th>
                <th className="px-4 py-2 text-right">البيان</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {data.vouchers.map((v) => (
                <tr key={v.id}>
                  <td className="px-4 py-2 font-mono text-xs">{v.voucherNumber}</td>
                  <td className="px-4 py-2 text-gray-500">{new Date(v.createdAt).toLocaleDateString('ar-IQ')}</td>
                  <td className="px-4 py-2 text-green-600 font-medium">{Number(v.amount).toLocaleString('ar-IQ')} {v.currency}</td>
                  <td className="px-4 py-2 text-gray-500">{v.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
