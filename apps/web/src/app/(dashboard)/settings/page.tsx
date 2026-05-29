'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { settingsService } from '@/services/settings.service'

type Tab = 'business' | 'exchange' | 'print' | 'system'

interface ExchangeHistoryEntry {
  id: string
  rateIQD: string | number
  createdAt: string
  changedBy: { id: string; name: string }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ar-IQ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function SettingsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('business')

  // ── System maintenance state ───────────────────────────────────────────────
  const [dbPushLoading, setDbPushLoading] = useState(false)
  const [dbPushOutput, setDbPushOutput] = useState<string | null>(null)
  const [dbPushError, setDbPushError] = useState(false)
  const [showOutputModal, setShowOutputModal] = useState(false)

  // ── Settings state ─────────────────────────────────────────────────────────
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loadingSettings, setLoadingSettings] = useState(true)

  // ── Business info form ─────────────────────────────────────────────────────
  const [businessNameAr, setBusinessNameAr] = useState('')
  const [businessNameEn, setBusinessNameEn] = useState('')
  const [defaultCurrency, setDefaultCurrency] = useState('IQD')
  const [defaultPriceType, setDefaultPriceType] = useState('RETAIL')
  const [taxRate, setTaxRate] = useState('0')
  const [minimumStockAlert, setMinimumStockAlert] = useState('true')
  const [savingBusiness, setSavingBusiness] = useState(false)
  const [businessMsg, setBusinessMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // ── Exchange rate state ────────────────────────────────────────────────────
  const [currentRate, setCurrentRate] = useState('')
  const [newRate, setNewRate] = useState('')
  const [savingRate, setSavingRate] = useState(false)
  const [rateMsg, setRateMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [rateHistory, setRateHistory] = useState<ExchangeHistoryEntry[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // ── Print settings state ───────────────────────────────────────────────────
  const [paperWidth, setPaperWidth] = useState('80')
  const [savingPrint, setSavingPrint] = useState(false)
  const [printMsg, setPrintMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // ── Load settings on mount ─────────────────────────────────────────────────
  const loadSettings = useCallback(async () => {
    setLoadingSettings(true)
    try {
      const res = await settingsService.getAll()
      const data: Record<string, string> = res.data ?? {}
      setSettings(data)
      setBusinessNameAr(data.business_name_ar ?? '')
      setBusinessNameEn(data.business_name_en ?? '')
      setDefaultCurrency(data.default_currency ?? 'IQD')
      setDefaultPriceType(data.default_price_type ?? 'RETAIL')
      setTaxRate(data.tax_rate ?? '0')
      setMinimumStockAlert(data.minimum_stock_alert ?? 'true')
      setCurrentRate(data.exchange_rate ?? '')
      setPaperWidth(data.paper_width ?? '80')
    } catch {
      // silent
    } finally {
      setLoadingSettings(false)
    }
  }, [])

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true)
    try {
      const res = await settingsService.getExchangeRateHistory()
      setRateHistory(res.data ?? [])
    } catch {
      setRateHistory([])
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  useEffect(() => {
    if (activeTab === 'exchange') {
      loadHistory()
    }
  }, [activeTab, loadHistory])

  // ── Save business info ─────────────────────────────────────────────────────
  async function handleSaveBusiness(e: React.FormEvent) {
    e.preventDefault()
    setBusinessMsg(null)
    setSavingBusiness(true)
    try {
      const payload: Record<string, string> = {}
      if (businessNameAr) payload.business_name_ar = businessNameAr
      if (businessNameEn) payload.business_name_en = businessNameEn
      payload.default_currency = defaultCurrency
      payload.default_price_type = defaultPriceType
      payload.tax_rate = taxRate
      payload.minimum_stock_alert = minimumStockAlert

      await settingsService.update(payload)
      setBusinessMsg({ type: 'success', text: 'تم حفظ الإعدادات بنجاح' })
    } catch {
      setBusinessMsg({ type: 'error', text: 'فشل في حفظ الإعدادات' })
    } finally {
      setSavingBusiness(false)
    }
  }

  // ── Update exchange rate ───────────────────────────────────────────────────
  async function handleUpdateRate(e: React.FormEvent) {
    e.preventDefault()
    setRateMsg(null)
    const rateNum = parseFloat(newRate)
    if (!rateNum || rateNum < 1) {
      setRateMsg({ type: 'error', text: 'يرجى إدخال سعر صرف صحيح (أكبر من صفر)' })
      return
    }
    setSavingRate(true)
    try {
      await settingsService.updateExchangeRate(rateNum)
      setCurrentRate(String(rateNum))
      setNewRate('')
      setRateMsg({ type: 'success', text: 'تم تحديث سعر الصرف بنجاح' })
      loadHistory()
    } catch {
      setRateMsg({ type: 'error', text: 'فشل في تحديث سعر الصرف' })
    } finally {
      setSavingRate(false)
    }
  }

  // ── Save print settings ────────────────────────────────────────────────────
  async function handleSavePrint(e: React.FormEvent) {
    e.preventDefault()
    setPrintMsg(null)
    setSavingPrint(true)
    try {
      await settingsService.update({ paper_width: paperWidth })
      setPrintMsg({ type: 'success', text: 'تم حفظ إعدادات الطباعة' })
    } catch {
      setPrintMsg({ type: 'error', text: 'فشل في حفظ إعدادات الطباعة' })
    } finally {
      setSavingPrint(false)
    }
  }

  // ── DB Push ────────────────────────────────────────────────────────────────
  async function handleDbPush() {
    setDbPushLoading(true)
    setDbPushOutput(null)
    setDbPushError(false)
    try {
      const res = await settingsService.dbPush()
      setDbPushOutput(res.output ?? 'تم التحديث بنجاح')
      setDbPushError(false)
      setShowOutputModal(true)
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { output?: string; error?: string } } })?.response?.data
      setDbPushOutput(data?.output ?? data?.error ?? 'حدث خطأ غير متوقع')
      setDbPushError(true)
      setShowOutputModal(true)
    } finally {
      setDbPushLoading(false)
    }
  }

  const tabClass = (tab: Tab) =>
    `px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
      activeTab === tab
        ? 'bg-white dark:bg-gray-800 text-blue-600 border-t border-r border-l border-gray-200 dark:border-gray-700'
        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
    }`

  if (loadingSettings) {
    return (
      <div dir="rtl" className="flex items-center justify-center h-48">
        <span className="text-gray-500">جار التحميل...</span>
      </div>
    )
  }

  return (
    <div dir="rtl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">الإعدادات</h1>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-0 flex-wrap">
        <button className={tabClass('business')} onClick={() => setActiveTab('business')}>
          معلومات النشاط
        </button>
        <button className={tabClass('exchange')} onClick={() => setActiveTab('exchange')}>
          سعر الصرف
        </button>
        <button className={tabClass('print')} onClick={() => setActiveTab('print')}>
          إعدادات الطباعة
        </button>
        <button className={tabClass('system')} onClick={() => setActiveTab('system')}>
          صيانة النظام
        </button>
        <button
          onClick={() => router.push('/settings/users')}
          className="px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          إدارة المستخدمين
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-b-xl rounded-tl-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">

        {/* ── Tab 1: Business Info ─────────────────────────────────────────── */}
        {activeTab === 'business' && (
          <form onSubmit={handleSaveBusiness} className="space-y-5 max-w-2xl">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">معلومات النشاط التجاري</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Arabic business name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  اسم النشاط بالعربي
                </label>
                <input
                  type="text"
                  value={businessNameAr}
                  onChange={(e) => setBusinessNameAr(e.target.value)}
                  placeholder="متجر الأمانة"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* English business name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  اسم النشاط بالإنجليزي
                </label>
                <input
                  type="text"
                  value={businessNameEn}
                  onChange={(e) => setBusinessNameEn(e.target.value)}
                  placeholder="Al-Amana Store"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Default currency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  العملة الافتراضية
                </label>
                <select
                  value={defaultCurrency}
                  onChange={(e) => setDefaultCurrency(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="IQD">دينار عراقي (IQD)</option>
                  <option value="USD">دولار أمريكي (USD)</option>
                </select>
              </div>

              {/* Default price type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  نوع السعر الافتراضي
                </label>
                <select
                  value={defaultPriceType}
                  onChange={(e) => setDefaultPriceType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="RETAIL">مفرد (RETAIL)</option>
                  <option value="WHOLESALE">جملة (WHOLESALE)</option>
                  <option value="SPECIAL">خاص (SPECIAL)</option>
                  <option value="DOLLAR">دولار (DOLLAR)</option>
                  <option value="DINAR">دينار (DINAR)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tax rate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  نسبة الضريبة (%)
                </label>
                <input
                  type="number"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Minimum stock alert toggle */}
              <div className="flex flex-col justify-end">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  تنبيه الحد الأدنى للمخزون
                </label>
                <button
                  type="button"
                  onClick={() => setMinimumStockAlert((v) => (v === 'true' ? 'false' : 'true'))}
                  className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none ${
                    minimumStockAlert === 'true' ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                  aria-pressed={minimumStockAlert === 'true'}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      minimumStockAlert === 'true' ? 'translate-x-8' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-xs text-gray-500 mt-1">
                  {minimumStockAlert === 'true' ? 'مفعّل' : 'معطّل'}
                </span>
              </div>
            </div>

            {businessMsg && (
              <div
                className={`px-4 py-3 rounded-lg text-sm font-medium ${
                  businessMsg.type === 'success'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {businessMsg.text}
              </div>
            )}

            <button
              type="submit"
              disabled={savingBusiness}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-sm"
            >
              {savingBusiness ? 'جار الحفظ...' : 'حفظ الإعدادات'}
            </button>
          </form>
        )}

        {/* ── Tab 2: Exchange Rate ─────────────────────────────────────────── */}
        {activeTab === 'exchange' && (
          <div className="max-w-2xl">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">سعر صرف الدولار</h2>

            {/* Current rate display */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 mb-6 text-center">
              <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">سعر الصرف الحالي</p>
              <p className="text-4xl font-bold text-blue-700 dark:text-blue-300">
                {currentRate
                  ? Number(currentRate).toLocaleString('ar-IQ', { minimumFractionDigits: 0 })
                  : '—'}
              </p>
              <p className="text-sm text-blue-500 dark:text-blue-400 mt-1">دينار عراقي لكل دولار واحد</p>
            </div>

            {/* Update rate form */}
            <form onSubmit={handleUpdateRate} className="space-y-4 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  سعر الصرف الجديد (IQD / USD)
                </label>
                <div className="flex gap-3">
                  <input
                    type="number"
                    value={newRate}
                    onChange={(e) => setNewRate(e.target.value)}
                    min="1"
                    step="any"
                    placeholder="مثال: 1480"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={savingRate || !newRate}
                    className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-sm whitespace-nowrap"
                  >
                    {savingRate ? 'جار التحديث...' : 'تحديث'}
                  </button>
                </div>
              </div>

              {rateMsg && (
                <div
                  className={`px-4 py-3 rounded-lg text-sm font-medium ${
                    rateMsg.type === 'success'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {rateMsg.text}
                </div>
              )}
            </form>

            {/* Rate history table */}
            <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-3">سجل تغييرات سعر الصرف</h3>
            {loadingHistory ? (
              <div className="text-center text-gray-500 py-6">جار التحميل...</div>
            ) : rateHistory.length === 0 ? (
              <div className="text-center text-gray-500 py-6">لا يوجد سجل تغييرات</div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    <tr>
                      <th className="px-4 py-3 text-right font-medium">التاريخ</th>
                      <th className="px-4 py-3 text-right font-medium">السعر (IQD)</th>
                      <th className="px-4 py-3 text-right font-medium">المستخدم</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {rateHistory.slice(0, 10).map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                          {formatDate(entry.createdAt)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                          {Number(entry.rateIQD).toLocaleString('ar-IQ', { minimumFractionDigits: 0 })}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                          {entry.changedBy?.name ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Tab 3: Print Settings ────────────────────────────────────────── */}
        {activeTab === 'print' && (
          <form onSubmit={handleSavePrint} className="space-y-5 max-w-md">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">إعدادات الطباعة</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                عرض ورق الطباعة الحرارية
              </label>
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                  <input
                    type="radio"
                    name="paper_width"
                    value="58"
                    checked={paperWidth === '58'}
                    onChange={() => setPaperWidth('58')}
                    className="text-blue-600"
                  />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">58 ملم</div>
                    <div className="text-xs text-gray-500">ورق صغير — طابعات الجيب</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                  <input
                    type="radio"
                    name="paper_width"
                    value="80"
                    checked={paperWidth === '80'}
                    onChange={() => setPaperWidth('80')}
                    className="text-blue-600"
                  />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">80 ملم</div>
                    <div className="text-xs text-gray-500">ورق قياسي — الطابعات المكتبية</div>
                  </div>
                </label>
              </div>
            </div>

            {printMsg && (
              <div
                className={`px-4 py-3 rounded-lg text-sm font-medium ${
                  printMsg.type === 'success'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {printMsg.text}
              </div>
            )}

            <button
              type="submit"
              disabled={savingPrint}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-sm"
            >
              {savingPrint ? 'جار الحفظ...' : 'حفظ'}
            </button>
          </form>
        )}
        {/* ── Tab 4: System Maintenance ────────────────────────────────────── */}
        {activeTab === 'system' && (
          <div className="max-w-2xl space-y-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">صيانة النظام</h2>

            {/* DB Push card */}
            <div className="border border-amber-200 dark:border-amber-700 rounded-xl p-5 bg-amber-50 dark:bg-amber-900/20">
              <div className="flex items-start gap-4">
                <div className="text-3xl mt-0.5">🗄️</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    تحديث جداول قاعدة البيانات
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                    يقوم هذا الأمر بمزامنة هيكل قاعدة البيانات مع آخر تغييرات في ملف الـ Schema
                    دون حذف البيانات الموجودة.
                    <br />
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      تحذير: استخدم هذا الخيار في بيئة التطوير فقط.
                    </span>
                  </p>
                  <button
                    onClick={handleDbPush}
                    disabled={dbPushLoading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-semibold text-sm rounded-lg transition-colors min-h-[44px]"
                  >
                    {dbPushLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        جار التحديث...
                      </>
                    ) : (
                      <>
                        <span>⚡</span>
                        تحديث جداول قاعدة البيانات
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Output Modal ──────────────────────────────────────────────────────── */}
      {showOutputModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowOutputModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className={`flex items-center justify-between px-5 py-4 rounded-t-xl border-b border-gray-200 dark:border-gray-700 ${
              dbPushError ? 'bg-red-50 dark:bg-red-900/20' : 'bg-green-50 dark:bg-green-900/20'
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-xl">{dbPushError ? '❌' : '✅'}</span>
                <h3 className="font-semibold text-gray-900 dark:text-white" dir="rtl">
                  {dbPushError ? 'فشل تحديث قاعدة البيانات' : 'تم تحديث قاعدة البيانات بنجاح'}
                </h3>
              </div>
              <button
                onClick={() => setShowOutputModal(false)}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Terminal output */}
            <div className="flex-1 overflow-auto p-4">
              <pre className="text-xs font-mono text-gray-200 bg-gray-900 rounded-lg p-4 whitespace-pre-wrap break-words leading-relaxed min-h-[120px]">
                {dbPushOutput}
              </pre>
            </div>

            <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setShowOutputModal(false)}
                className="px-5 py-2 bg-gray-700 hover:bg-gray-800 text-white text-sm font-medium rounded-lg"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
