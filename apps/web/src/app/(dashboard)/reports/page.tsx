'use client'

import { useRouter } from 'next/navigation'

interface ReportCard {
  title: string
  description: string
  icon: string
  href: string
  color: string
}

const REPORT_CARDS: ReportCard[] = [
  {
    title: 'تقرير المبيعات',
    description: 'عرض وتحليل فواتير المبيعات حسب الفترة الزمنية والعميل',
    icon: '📊',
    href: '/reports/sales',
    color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
  },
  {
    title: 'تقرير المشتريات',
    description: 'عرض وتحليل فواتير المشتريات حسب الفترة الزمنية والمورد',
    icon: '🛒',
    href: '/reports/purchases',
    color: 'bg-green-50 border-green-200 hover:bg-green-100',
  },
  {
    title: 'تقرير الأرباح',
    description: 'حساب الإيرادات والتكاليف وصافي الربح خلال فترة زمنية',
    icon: '💰',
    href: '/reports/profit',
    color: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
  },
  {
    title: 'تقرير الجرد',
    description: 'عرض المخزون الحالي مع قيم التكلفة والبيع لكل صنف',
    icon: '📦',
    href: '/reports/inventory',
    color: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
  },
  {
    title: 'كشف حساب عميل',
    description: 'عرض حركات الفواتير والمدفوعات لعميل محدد',
    icon: '👤',
    href: '/reports/customer-statement',
    color: 'bg-teal-50 border-teal-200 hover:bg-teal-100',
  },
  {
    title: 'كشف حساب مورد',
    description: 'عرض حركات المشتريات والمدفوعات لمورد محدد',
    icon: '🏭',
    href: '/reports/supplier-statement',
    color: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
  },
]

export default function ReportsPage() {
  const router = useRouter()

  return (
    <div dir="rtl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">التقارير</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
          اختر التقرير المطلوب لعرض البيانات والتحليلات
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {REPORT_CARDS.map((card) => (
          <button
            key={card.href}
            onClick={() => router.push(card.href)}
            className={`text-right border rounded-xl p-6 transition-colors cursor-pointer ${card.color} dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-750 w-full`}
          >
            <div className="text-3xl mb-3">{card.icon}</div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
              {card.title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {card.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
