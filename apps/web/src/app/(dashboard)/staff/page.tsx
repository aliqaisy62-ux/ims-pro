'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { settingsService } from '@/services/settings.service'

type Role = 'ADMIN' | 'MANAGER' | 'CASHIER' | 'VIEWER' | 'ACCOUNTANT' | 'STAFF'

const ROLE_LABELS: Record<Role, string> = {
  ADMIN:      'مدير النظام',
  MANAGER:    'مدير',
  CASHIER:    'كاشير',
  VIEWER:     'مشاهد',
  ACCOUNTANT: 'محاسب',
  STAFF:      'موظف',
}

const ROLE_COLORS: Record<Role, string> = {
  ADMIN:      '#ef4444',
  MANAGER:    '#f97316',
  CASHIER:    '#3b82f6',
  VIEWER:     '#6b7280',
  ACCOUNTANT: '#8b5cf6',
  STAFF:      '#10b981',
}

interface StaffUser {
  id: string
  name: string
  username: string
  role: Role
  language: string
  isActive: boolean
  createdAt: string
}

interface CreateForm {
  name: string
  username: string
  password: string
  role: Role
  language: 'ar' | 'en'
}

const emptyForm: CreateForm = { name: '', username: '', password: '', role: 'STAFF', language: 'ar' }

export default function StaffPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [staff, setStaff] = useState<StaffUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<Role | 'ALL'>('ALL')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CreateForm>(emptyForm)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const [resetTarget, setResetTarget] = useState<StaffUser | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [resetError, setResetError] = useState('')
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    if (user && user.role !== 'ADMIN') router.replace('/dashboard')
  }, [user, router])

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const r = await settingsService.getUsers()
      setStaff(r.data || [])
    } catch {
      setError('فشل تحميل بيانات الموظفين')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!form.name || !form.username || !form.password) {
      setFormError('جميع الحقول مطلوبة')
      return
    }
    if (form.password.length < 6) {
      setFormError('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
      return
    }
    setSaving(true)
    try {
      await settingsService.createUser(form)
      setForm(emptyForm)
      setShowForm(false)
      await load()
    } catch (err: any) {
      setFormError(err?.response?.status === 409 ? 'اسم المستخدم مستخدم بالفعل' : 'فشل إنشاء الموظف')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(s: StaffUser) {
    try {
      await settingsService.updateUser(s.id, { isActive: !s.isActive })
      setStaff((prev) => prev.map((u) => u.id === s.id ? { ...u, isActive: !s.isActive } : u))
    } catch {
      setError('فشل تحديث الحالة')
    }
  }

  async function changeRole(s: StaffUser, role: Role) {
    try {
      await settingsService.updateUser(s.id, { role })
      setStaff((prev) => prev.map((u) => u.id === s.id ? { ...u, role } : u))
    } catch {
      setError('فشل تحديث الصلاحية')
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (!newPassword || newPassword.length < 6) { setResetError('كلمة المرور قصيرة'); return }
    setResetting(true)
    try {
      await settingsService.resetPassword(resetTarget!.id, newPassword)
      setResetTarget(null)
      setNewPassword('')
    } catch {
      setResetError('فشل إعادة تعيين كلمة المرور')
    } finally {
      setResetting(false)
    }
  }

  const filtered = filter === 'ALL' ? staff : staff.filter((s) => s.role === filter)

  return (
    <div dir="rtl" style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>إدارة الموظفين</h1>
          <p style={{ color: '#64748b', marginTop: 4, fontSize: 14 }}>
            {staff.filter((s) => s.isActive).length} موظف نشط من أصل {staff.length}
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setFormError('') }}
          style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
        >
          {showForm ? '✕ إلغاء' : '+ إضافة موظف'}
        </button>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#dc2626', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleCreate} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>إضافة موظف جديد</h3>
          {formError && (
            <div style={{ background: '#fee2e2', color: '#dc2626', padding: '8px 12px', borderRadius: 6, marginBottom: 12, fontSize: 13 }}>
              {formError}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: '#475569', marginBottom: 4 }}>الاسم الكامل *</label>
              <input
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="اسم الموظف"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: '#475569', marginBottom: 4 }}>اسم المستخدم *</label>
              <input
                value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="username"
                dir="ltr"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: '#475569', marginBottom: 4 }}>كلمة المرور *</label>
              <input
                type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="6 أحرف على الأقل"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: '#475569', marginBottom: 4 }}>الصلاحية *</label>
              <select
                value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
              >
                {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: '#475569', marginBottom: 4 }}>اللغة</label>
              <select
                value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value as 'ar' | 'en' })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
              >
                <option value="ar">العربية</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <button
              type="submit" disabled={saving}
              style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, padding: '9px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14, opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'جاري الحفظ...' : 'حفظ الموظف'}
            </button>
          </div>
        </form>
      )}

      {/* Role Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['ALL', ...Object.keys(ROLE_LABELS)] as (Role | 'ALL')[]).map((r) => (
          <button
            key={r}
            onClick={() => setFilter(r)}
            style={{
              padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
              background: filter === r ? (r === 'ALL' ? '#1e293b' : ROLE_COLORS[r as Role]) : '#f1f5f9',
              color: filter === r ? '#fff' : '#475569',
              transition: 'all 0.15s',
            }}
          >
            {r === 'ALL' ? `الكل (${staff.length})` : `${ROLE_LABELS[r as Role]} (${staff.filter((s) => s.role === r).length})`}
          </button>
        ))}
      </div>

      {/* Staff Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>لا يوجد موظفون</div>
      ) : (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['الاسم', 'اسم المستخدم', 'الصلاحية', 'اللغة', 'الحالة', 'تاريخ الإنشاء', 'إجراءات'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, color: '#64748b', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, idx) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 500 }}>{s.name}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b', direction: 'ltr', textAlign: 'right' }}>{s.username}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <select
                      value={s.role}
                      onChange={(e) => changeRole(s, e.target.value as Role)}
                      disabled={s.id === user?.id}
                      style={{
                        background: ROLE_COLORS[s.role] + '20',
                        color: ROLE_COLORS[s.role],
                        border: `1px solid ${ROLE_COLORS[s.role]}40`,
                        borderRadius: 20,
                        padding: '3px 10px',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: s.id === user?.id ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>{s.language === 'ar' ? 'العربية' : 'English'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <button
                      onClick={() => toggleActive(s)}
                      disabled={s.id === user?.id}
                      style={{
                        padding: '4px 12px', borderRadius: 20, border: 'none', cursor: s.id === user?.id ? 'not-allowed' : 'pointer',
                        fontSize: 12, fontWeight: 600,
                        background: s.isActive ? '#dcfce7' : '#fee2e2',
                        color: s.isActive ? '#16a34a' : '#dc2626',
                      }}
                    >
                      {s.isActive ? 'نشط' : 'معطّل'}
                    </button>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#94a3b8' }}>
                    {new Date(s.createdAt).toLocaleDateString('ar-IQ')}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button
                      onClick={() => { setResetTarget(s); setNewPassword(''); setResetError('') }}
                      style={{ background: '#f1f5f9', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12, color: '#475569' }}
                    >
                      🔑 تغيير كلمة المرور
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form onSubmit={handleReset} dir="rtl" style={{ background: '#fff', borderRadius: 12, padding: 28, width: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700 }}>إعادة تعيين كلمة المرور</h3>
            <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 16px' }}>{resetTarget.name} — {resetTarget.username}</p>
            {resetError && (
              <div style={{ background: '#fee2e2', color: '#dc2626', padding: '8px 12px', borderRadius: 6, marginBottom: 12, fontSize: 13 }}>{resetError}</div>
            )}
            <label style={{ display: 'block', fontSize: 13, color: '#475569', marginBottom: 4 }}>كلمة المرور الجديدة</label>
            <input
              type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              placeholder="6 أحرف على الأقل"
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14, marginBottom: 16, boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setResetTarget(null)}
                style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 13 }}>
                إلغاء
              </button>
              <button type="submit" disabled={resetting}
                style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: resetting ? 0.7 : 1 }}>
                {resetting ? 'جاري الحفظ...' : 'حفظ'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
