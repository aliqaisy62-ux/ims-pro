'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { vouchersService } from '@/services/vouchers.service'

type VoucherType = 'RECEIPT' | 'DISBURSEMENT'
type EntityType = 'CUSTOMER' | 'SUPPLIER' | 'OTHER'
type Currency = 'USD' | 'IQD'

interface Voucher {
  id: string
  voucherNumber: string
  type: VoucherType
  entityType: EntityType
  entityId: string | null
  entityName: string | null
  amount: string | number
  currency: Currency
  exchangeRate: string | number
  description: string
  createdAt: string
  createdBy: { id: string; name: string }
}

const TYPE_LABELS: Record<VoucherType, string> = {
  RECEIPT: 'سند قبض',
  DISBURSEMENT: 'سند صرف',
}

const TYPE_CLASSES: Record<VoucherType, string> = {
  RECEIPT: 'bg-green-100 text-green-700',
  DISBURSEMENT: 'bg-red-100 text-red-700',
}

const ENTITY_LABELS: Record<EntityType, string> = {
  CUSTOMER: 'عميل',
  SUPPLIER: 'مورد',
  OTHER: 'أخرى',
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('ar-IQ')
}

export default function VoucherDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [voucher, setVoucher] = useState<Voucher | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await vouchersService.getById(id)
      setVoucher(res.data)
    } catch {
      setError('فشل في تحميل السند')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div dir="rtl" className="flex items-center justify-center min-h-64">
        <div className="text-gray-500">جار التحميل...</div>
      </div>
    )
  }

  if (error || !voucher) {
    return (
      <div dir="rtl">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
          {error || 'السند غير موجود'}
        </div>
        <button
          onClick={() => router.push('/vouchers')}
          className="mt-4 text-blue-600 hover:underline text-sm"
        >
          ← العودة إلى قائمة السندات
        </button>
      </div>
    )
  }

  return (
      <div dir="rtl" className="max-w-2xl mx-auto">
        {/* Header actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/vouchers')}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              ← رجوع
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              تفاصيل السند
            </h1>
          </div>
          <button
            onClick={() => router.push(`/vouchers/${id}/print`)}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium"
          >
            طباعة
          </button>
        </div>

        {/* Voucher card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 space-y-5">
          {/* Title + badge */}
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">رقم السند</p>
              <p className="text-lg font-bold font-mono text-gray-900 dark:text-white">
                {voucher.voucherNumber}
              </p>
            </div>
            <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${TYPE_CLASSES[voucher.type]}`}>
              {TYPE_LABELS[voucher.type]}
            </span>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Entity */}
            <div className="col-span-2">
              <p className="text-xs text-gray-500 mb-0.5">الجهة</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                <span className="text-gray-500 font-normal ml-1">{ENTITY_LABELS[voucher.entityType]}:</span>
                {voucher.entityName ?? '—'}
              </p>
            </div>

            {/* Amount */}
            <div>
              <p className="text-xs text-gray-500 mb-0.5">المبلغ</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {Number(voucher.amount).toLocaleString('ar-IQ', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 3,
                })}
              </p>
            </div>

            {/* Currency */}
            <div>
              <p className="text-xs text-gray-500 mb-0.5">العملة</p>
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  voucher.currency === 'USD'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {voucher.currency === 'USD' ? 'دولار أمريكي (USD)' : 'دينار عراقي (IQD)'}
              </span>
            </div>

            {/* Exchange Rate (only for USD) */}
            {voucher.currency === 'USD' && (
              <div className="col-span-2">
                <p className="text-xs text-gray-500 mb-0.5">سعر الصرف</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {Number(voucher.exchangeRate).toLocaleString('ar-IQ', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 3,
                  })}{' '}
                  دينار لكل دولار
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  ما يعادل:{' '}
                  {(Number(voucher.amount) * Number(voucher.exchangeRate)).toLocaleString('ar-IQ', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}{' '}
                  دينار
                </p>
              </div>
            )}

            {/* Description */}
            <div className="col-span-2">
              <p className="text-xs text-gray-500 mb-0.5">الوصف</p>
              <p className="text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                {voucher.description}
              </p>
            </div>

            {/* Created By */}
            <div>
              <p className="text-xs text-gray-500 mb-0.5">أنشأ بواسطة</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {voucher.createdBy.name}
              </p>
            </div>

            {/* Created At */}
            <div>
              <p className="text-xs text-gray-500 mb-0.5">تاريخ الإنشاء</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {formatDate(voucher.createdAt)}
              </p>
            </div>
          </div>
        </div>
      </div>
  )
}
