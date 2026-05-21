'use client'

import { useAuth } from '@/hooks/useAuth'

export default function DashboardPage() {
  const { user } = useAuth()

  return (
    <div dir="rtl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">لوحة التحكم</h1>
      <p className="text-gray-600 dark:text-gray-400">
        مرحباً، {user?.name}
      </p>
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {['مبيعات اليوم', 'مشتريات اليوم', 'رصيد الصندوق', 'تنبيهات المخزون'].map((label) => (
          <div key={label} className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">—</p>
          </div>
        ))}
      </div>
    </div>
  )
}
