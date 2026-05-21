'use client'

import { useState, useEffect, useCallback } from 'react'
import { settingsService } from '@/services/settings.service'

type UserRole = 'ADMIN' | 'MANAGER' | 'CASHIER' | 'VIEWER' | 'ACCOUNTANT' | 'STAFF'
type CreatableRole = 'ADMIN' | 'ACCOUNTANT' | 'STAFF'

interface User {
  id: string
  name: string
  username: string
  role: UserRole
  language: 'ar' | 'en'
  isActive: boolean
  createdAt: string
}

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'مدير النظام',
  MANAGER: 'مدير',
  CASHIER: 'كاشير',
  VIEWER: 'مشاهد',
  ACCOUNTANT: 'محاسب',
  STAFF: 'موظف',
}

const ROLE_COLORS: Record<UserRole, string> = {
  ADMIN: 'bg-red-100 text-red-700',
  MANAGER: 'bg-purple-100 text-purple-700',
  CASHIER: 'bg-blue-100 text-blue-700',
  VIEWER: 'bg-gray-100 text-gray-600',
  ACCOUNTANT: 'bg-emerald-100 text-emerald-700',
  STAFF: 'bg-orange-100 text-orange-700',
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ar-IQ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [globalMsg, setGlobalMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // ── New user form state ────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formUsername, setFormUsername] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formRole, setFormRole] = useState<CreatableRole>('ACCOUNTANT')
  const [formLanguage, setFormLanguage] = useState<'ar' | 'en'>('ar')
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // ── Reset password state ───────────────────────────────────────────────────
  const [resetUserId, setResetUserId] = useState<string | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetSubmitting, setResetSubmitting] = useState(false)
  const [resetMsg, setResetMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // ── Load users ─────────────────────────────────────────────────────────────
  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await settingsService.getUsers()
      setUsers(res.data ?? [])
    } catch {
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  // ── Toggle active status ───────────────────────────────────────────────────
  async function handleToggleActive(user: User) {
    setGlobalMsg(null)
    try {
      await settingsService.updateUser(user.id, { isActive: !user.isActive })
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isActive: !u.isActive } : u))
      )
    } catch {
      setGlobalMsg({ type: 'error', text: 'فشل في تحديث حالة المستخدم' })
    }
  }

  // ── Create new user ────────────────────────────────────────────────────────
  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    setFormMsg(null)
    if (!formName.trim() || !formUsername.trim() || !formPassword.trim()) {
      setFormMsg({ type: 'error', text: 'يرجى تعبئة جميع الحقول المطلوبة' })
      return
    }
    setFormSubmitting(true)
    try {
      await settingsService.createUser({
        name: formName.trim(),
        username: formUsername.trim(),
        password: formPassword,
        role: formRole,
        language: formLanguage,
      })
      setFormMsg({ type: 'success', text: 'تم إنشاء المستخدم بنجاح' })
      setFormName('')
      setFormUsername('')
      setFormPassword('')
      setFormRole('ACCOUNTANT')
      setFormLanguage('ar')
      setShowForm(false)
      loadUsers()
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { error?: string } } }
      const serverError = axiosErr?.response?.data?.error
      if (axiosErr?.response?.status === 409 || serverError?.includes('مستخدم')) {
        setFormMsg({ type: 'error', text: 'اسم المستخدم مستخدم بالفعل، يرجى اختيار اسم آخر' })
      } else {
        setFormMsg({ type: 'error', text: 'فشل في إنشاء المستخدم' })
      }
    } finally {
      setFormSubmitting(false)
    }
  }

  // ── Reset password ─────────────────────────────────────────────────────────
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    setResetMsg(null)
    if (!resetPassword || resetPassword.length < 6) {
      setResetMsg({ type: 'error', text: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' })
      return
    }
    if (!resetUserId) return
    setResetSubmitting(true)
    try {
      await settingsService.resetPassword(resetUserId, resetPassword)
      setResetMsg({ type: 'success', text: 'تم إعادة تعيين كلمة المرور بنجاح' })
      setResetPassword('')
      setTimeout(() => {
        setResetUserId(null)
        setResetMsg(null)
      }, 1500)
    } catch {
      setResetMsg({ type: 'error', text: 'فشل في إعادة تعيين كلمة المرور' })
    } finally {
      setResetSubmitting(false)
    }
  }

  function cancelForm() {
    setShowForm(false)
    setFormMsg(null)
    setFormName('')
    setFormUsername('')
    setFormPassword('')
    setFormRole('ACCOUNTANT')
    setFormLanguage('ar')
  }

  return (
    <div dir="rtl">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">إدارة المستخدمين</h1>
          <p className="text-sm text-gray-500 mt-0.5">إدارة حسابات المستخدمين والصلاحيات</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            + مستخدم جديد
          </button>
        )}
      </div>

      {/* ── Global message ──────────────────────────────────────────────────── */}
      {globalMsg && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
            globalMsg.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {globalMsg.text}
        </div>
      )}

      {/* ── New user inline form ─────────────────────────────────────────────── */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6 border border-blue-200 dark:border-blue-800">
          <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-4">إضافة مستخدم جديد</h2>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  الاسم <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="الاسم الكامل"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  اسم المستخدم <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  placeholder="مثال: ahmed_ali"
                  dir="ltr"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  كلمة المرور <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="6 أحرف على الأقل"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  الدور <span className="text-red-500">*</span>
                </label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as CreatableRole)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ADMIN">مدير النظام</option>
                  <option value="ACCOUNTANT">محاسب</option>
                  <option value="STAFF">موظف</option>
                </select>
              </div>

              {/* Language */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  اللغة
                </label>
                <select
                  value={formLanguage}
                  onChange={(e) => setFormLanguage(e.target.value as 'ar' | 'en')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ar">العربية</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>

            {formMsg && (
              <div
                className={`px-4 py-3 rounded-lg text-sm font-medium ${
                  formMsg.type === 'success'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {formMsg.text}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={formSubmitting}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-sm"
              >
                {formSubmitting ? 'جار الإنشاء...' : 'إنشاء المستخدم'}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="px-5 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium text-sm"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Reset password modal overlay ─────────────────────────────────────── */}
      {resetUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-sm mx-4" dir="rtl">
            <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-4">
              إعادة تعيين كلمة المرور
            </h3>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  كلمة المرور الجديدة <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="6 أحرف على الأقل"
                  autoFocus
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {resetMsg && (
                <div
                  className={`px-4 py-3 rounded-lg text-sm font-medium ${
                    resetMsg.type === 'success'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {resetMsg.text}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={resetSubmitting}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-sm"
                >
                  {resetSubmitting ? 'جار الحفظ...' : 'تعيين كلمة المرور'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResetUserId(null)
                    setResetPassword('')
                    setResetMsg(null)
                  }}
                  className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium text-sm"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Users table ─────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 dark:text-white">
            قائمة المستخدمين
            {users.length > 0 && (
              <span className="mr-2 text-sm text-gray-400 font-normal">({users.length} مستخدم)</span>
            )}
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">جار التحميل...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">لا يوجد مستخدمون</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="px-4 py-3 text-right font-medium">الاسم</th>
                  <th className="px-4 py-3 text-right font-medium">اسم المستخدم</th>
                  <th className="px-4 py-3 text-right font-medium">الدور</th>
                  <th className="px-4 py-3 text-right font-medium">اللغة</th>
                  <th className="px-4 py-3 text-right font-medium">الحالة</th>
                  <th className="px-4 py-3 text-right font-medium">تاريخ الإنشاء</th>
                  <th className="px-4 py-3 text-right font-medium">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                    {/* Name */}
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {user.name}
                    </td>

                    {/* Username */}
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                      {user.username}
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[user.role] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {ROLE_LABELS[user.role] ?? user.role}
                      </span>
                    </td>

                    {/* Language */}
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {user.language === 'ar' ? 'العربية' : 'English'}
                    </td>

                    {/* Active toggle */}
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(user)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                          user.isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                        title={user.isActive ? 'نشط — انقر للتعطيل' : 'معطّل — انقر للتفعيل'}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                            user.isActive ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <span className={`mr-2 text-xs ${user.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                        {user.isActive ? 'نشط' : 'معطّل'}
                      </span>
                    </td>

                    {/* Created at */}
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {formatDate(user.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          setResetUserId(user.id)
                          setResetPassword('')
                          setResetMsg(null)
                        }}
                        className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 whitespace-nowrap"
                      >
                        إعادة كلمة المرور
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
