'use client'

import { useState, useEffect } from 'react'
import { customersService } from '@/services/customers.service'
import { reportsService } from '@/services/reports.service'

interface Customer {
  id: string
  name: string
  phone: string | null
  balance: number
  currency: string
}

interface TxRow {
  date: string
  type: 'INVOICE' | 'RECEIPT'
  reference: string
  amount: number
  currency: string
  balanceEffect: number
}

interface Statement {
  customer: Customer
  transactions: TxRow[]
  summary: {
    totalInvoiced: number
    totalPaid: number
    currentBalance: number
  }
}

function getDefaultFrom(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

function getDefaultTo(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function CustomerStatementReportPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerId, setCustomerId] = useState('')
  const [from, setFrom] = useState(getDefaultFrom())
  const [to, setTo] = useState(getDefaultTo())
  const [statement, setStatement] = useState<Statement | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingCustomers, setLoadingCustomers] = useState(true)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    customersService
      .getAll({ limit: 500 })
      .then((res: { data: Customer[] } | Customer[]) => {
        // customersService.getAll returns r.data.data directly (array)
        const list = Array.isArray(res) ? res : (res as { data: Customer[] }).data ?? []
        setCustomers(list)
      })
      .catch(() => setCustomers([]))
      .finally(() => setLoadingCustomers(false))
  }, [])

  async function handleSearch() {
    if (!customerId) {
      setError('يجب اختيار عميل')
      return
    }
    setLoading(true)
    setError('')
    try {
      const params: Record<string, string | undefined> = {}
      if (from) params.from = from
      if (to) params.to = to
      const res = await reportsService.getCustomerStatement(customerId, params)
      setStatement(res.data ?? null)
      setSearched(true)
    } catch {
      setError('حدث خطأ أثناء تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div dir="rtl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">كشف حساب عميل</h1>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-5 flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1 min-w-[220px]">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">العميل</label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            disabled={loadingCustomers}
          >
            <option value="">-- اختر عميل --</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">من تاريخ</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">إلى تاريخ</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
        >
          {loading ? 'جار البحث...' : 'بحث'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Customer Info + Summary */}
      {statement && (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-5 flex flex-wrap gap-6">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">العميل</p>
              <p className="font-bold text-gray-900 dark:text-white text-lg">{statement.customer.name}</p>
              {statement.customer.phone && (
                <p className="text-sm text-gray-500">{statement.customer.phone}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">إجمالي الفواتير</p>
              <p className="font-bold text-blue-600 dark:text-blue-400">
                {Number(statement.summary.totalInvoiced).toLocaleString('ar-IQ')}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">إجمالي المدفوع</p>
              <p className="font-bold text-green-600 dark:text-green-400">
                {Number(statement.summary.totalPaid).toLocaleString('ar-IQ')}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">الرصيد الحالي</p>
              <p
                className={`font-bold text-lg ${
                  statement.summary.currentBalance > 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {Number(statement.summary.currentBalance).toLocaleString('ar-IQ')}
              </p>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            {statement.transactions.length === 0 ? (
              <div className="p-8 text-center text-gray-500">لا توجد معاملات في هذه الفترة</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    <tr>
                      <th className="px-4 py-3 text-right font-medium">التاريخ</th>
                      <th className="px-4 py-3 text-right font-medium">النوع</th>
                      <th className="px-4 py-3 text-right font-medium">المرجع</th>
                      <th className="px-4 py-3 text-right font-medium">المبلغ</th>
                      <th className="px-4 py-3 text-right font-medium">العملة</th>
                      <th className="px-4 py-3 text-right font-medium">الأثر على الرصيد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {statement.transactions.map((tx, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {new Date(tx.date).toLocaleDateString('ar-IQ')}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              tx.type === 'INVOICE'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {tx.type === 'INVOICE' ? 'فاتورة' : 'سند قبض'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-blue-600 dark:text-blue-400">
                          {tx.reference}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                          {Number(tx.amount).toLocaleString('ar-IQ')}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {tx.currency === 'USD' ? 'دولار' : 'دينار'}
                        </td>
                        <td
                          className={`px-4 py-3 font-bold ${
                            tx.balanceEffect >= 0
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-green-600 dark:text-green-400'
                          }`}
                        >
                          {tx.balanceEffect >= 0 ? '+' : ''}
                          {Number(tx.balanceEffect).toLocaleString('ar-IQ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {searched && !statement && !loading && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center text-gray-500">
          لا توجد بيانات
        </div>
      )}
    </div>
  )
}
