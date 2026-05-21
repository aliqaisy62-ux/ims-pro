'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { settingsService } from '@/services/settings.service'

type Role = 'ADMIN' | 'ACCOUNTANT' | 'STAFF'

const ROLES: Role[] = ['ADMIN', 'ACCOUNTANT', 'STAFF']

const ROLE_LABELS: Record<Role, string> = {
  ADMIN:      'مدير النظام',
  ACCOUNTANT: 'محاسب',
  STAFF:      'موظف',
}

const ROLE_DESC: Record<Role, string> = {
  ADMIN:      'صلاحية كاملة — إدارة النظام والموظفين والإعدادات',
  ACCOUNTANT: 'السندات، المصروفات، كشف الصندوق، التقارير المالية',
  STAFF:      'المبيعات، العملاء، المنتجات',
}

const ROLE_COLORS: Record<Role, { bg: string; text: string; border: string }> = {
  ADMIN:      { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' },
  ACCOUNTANT: { bg: '#ede9fe', text: '#7c3aed', border: '#c4b5fd' },
  STAFF:      { bg: '#d1fae5', text: '#059669', border: '#6ee7b7' },
}

interface StaffUser {
  id: string
  name: string
  username: string
  role: string
  language: string
  isActive: boolean
  createdAt: string
}

const emptyForm = { name: '', username: '', password: '', role: 'STAFF' as Role, language: 'ar' as 'ar' | 'en' }

export default function StaffPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [staff, setStaff]           = useState<StaffUser[]>([])
  const [loading, setLoading]       = useState(true)
  const [globalError, setGlobalError] = useState('')
  const [filter, setFilter]         = useState<Role | 'ALL'>('ALL')

  // Add form
  const [showForm, setShowForm]     = useState(false)
  const [form, setForm]             = useState({ ...emptyForm })
  const [formError, setFormError]   = useState('')
  const [saving, setSaving]         = useState(false)
  const [savedOk, setSavedOk]       = useState(false)

  // Edit Role modal
  const [editTarget, setEditTarget] = useState<StaffUser | null>(null)
  const [editRole, setEditRole]     = useState<Role>('STAFF')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError]   = useState('')

  // Reset Password modal
  const [resetTarget, setResetTarget] = useState<StaffUser | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [resetError, setResetError]   = useState('')
  const [resetting, setResetting]     = useState(false)

  useEffect(() => {
    if (user && user.role !== 'ADMIN') router.replace('/dashboard')
  }, [user, router])

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const r = await settingsService.getUsers()
      setStaff(r.data || [])
    } catch {
      setGlobalError('فشل تحميل بيانات الموظفين')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!form.name.trim() || !form.username.trim() || !form.password) {
      setFormError('جميع الحقول مطلوبة')
      return
    }
    if (form.password.length < 6) {
      setFormError('كلمة المرور 6 أحرف على الأقل')
      return
    }
    setSaving(true)
    try {
      await settingsService.createUser(form)
      setForm({ ...emptyForm })
      setShowForm(false)
      setSavedOk(true)
      setTimeout(() => setSavedOk(false), 3000)
      await load()
    } catch (err: any) {
      setFormError(err?.response?.status === 409 ? 'اسم المستخدم مستخدم بالفعل' : 'فشل إنشاء الموظف')
    } finally {
      setSaving(false)
    }
  }

  function openEditRole(s: StaffUser) {
    setEditTarget(s)
    setEditRole((ROLES.includes(s.role as Role) ? s.role : 'STAFF') as Role)
    setEditError('')
  }

  async function handleEditRole(e: React.FormEvent) {
    e.preventDefault()
    if (!editTarget) return
    setEditSaving(true)
    setEditError('')
    try {
      await settingsService.updateUser(editTarget.id, { role: editRole })
      setStaff((prev) => prev.map((u) => u.id === editTarget.id ? { ...u, role: editRole } : u))
      setEditTarget(null)
    } catch {
      setEditError('فشل تحديث الصلاحية')
    } finally {
      setEditSaving(false)
    }
  }

  async function toggleActive(s: StaffUser) {
    try {
      await settingsService.updateUser(s.id, { isActive: !s.isActive })
      setStaff((prev) => prev.map((u) => u.id === s.id ? { ...u, isActive: !s.isActive } : u))
    } catch {
      setGlobalError('فشل تحديث الحالة')
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword.length < 6) { setResetError('كلمة المرور 6 أحرف على الأقل'); return }
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
  const activeCount = staff.filter((s) => s.isActive).length

  return (
    <div dir="rtl" style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>

      {/* Security Banner */}
      <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '10px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
        <span style={{ fontSize: 16 }}>🔒</span>
        <span style={{ color: '#15803d', fontWeight: 600 }}>التسجيل مقيّد — </span>
        <span style={{ color: '#166534' }}>إنشاء الحسابات متاح للمدير فقط. لا يوجد تسجيل عام.</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>إدارة الموظفين</h1>
          <p style={{ color: '#64748b', marginTop: 4, fontSize: 13 }}>
            {activeCount} نشط / {staff.length} إجمالي
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setFormError('') }}
          style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', cursor: 'pointer', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          {showForm ? '✕ إلغاء' : '+ إضافة موظف'}
        </button>
      </div>

      {globalError && (
        <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          {globalError}
        </div>
      )}

      {savedOk && (
        <div style={{ background: '#dcfce7', color: '#16a34a', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 600 }}>
          ✅ تم إنشاء الموظف بنجاح
        </div>
      )}

      {/* ── Add Employee Form ───────────────────────────────────── */}
      {showForm && (
        <div style={{ background: '#fff', border: '2px solid #2563eb', borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: '0 4px 16px rgba(37,99,235,0.08)' }}>
          <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#1e40af' }}>إضافة موظف جديد</h3>
          <p style={{ margin: '0 0 18px', fontSize: 12, color: '#64748b' }}>
            الصلاحيات المتاحة: مدير النظام / محاسب / موظف
          </p>

          {formError && (
            <div style={{ background: '#fee2e2', color: '#dc2626', padding: '8px 12px', borderRadius: 6, marginBottom: 14, fontSize: 13 }}>{formError}</div>
          )}

          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
              <div>
                <label style={labelStyle}>الاسم الكامل *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="اسم الموظف" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>اسم المستخدم *</label>
                <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="حروف وأرقام فقط" dir="ltr" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>كلمة المرور *</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="6 أحرف على الأقل" style={inputStyle} />
              </div>

              {/* Role Selector — ADMIN, ACCOUNTANT, STAFF only */}
              <div>
                <label style={labelStyle}>الصلاحية *</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                  {ROLES.map((r) => (
                    <button key={r} type="button" onClick={() => setForm({ ...form, role: r })}
                      style={{
                        flex: 1, minWidth: 80, padding: '8px 4px', border: `2px solid ${form.role === r ? ROLE_COLORS[r].border : '#e2e8f0'}`,
                        borderRadius: 8, background: form.role === r ? ROLE_COLORS[r].bg : '#f8fafc',
                        color: form.role === r ? ROLE_COLORS[r].text : '#64748b',
                        cursor: 'pointer', fontSize: 12, fontWeight: form.role === r ? 700 : 400,
                        transition: 'all 0.15s',
                      }}>
                      {ROLE_LABELS[r]}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: '6px 0 0' }}>{ROLE_DESC[form.role]}</p>
              </div>

              <div>
                <label style={labelStyle}>اللغة</label>
                <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value as 'ar' | 'en' })} style={inputStyle}>
                  <option value="ar">العربية</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <button type="submit" disabled={saving}
                style={{ background: saving ? '#93c5fd' : '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14 }}>
                {saving ? 'جاري الحفظ...' : '💾 حفظ الموظف'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Role Filter Tabs ────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <FilterChip label={`الكل (${staff.length})`} active={filter === 'ALL'} color="#1e293b" onClick={() => setFilter('ALL')} />
        {ROLES.map((r) => (
          <FilterChip key={r} label={`${ROLE_LABELS[r]} (${staff.filter((s) => s.role === r).length})`}
            active={filter === r} color={ROLE_COLORS[r].text} onClick={() => setFilter(r)} />
        ))}
      </div>

      {/* ── Staff Table ─────────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8', background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
          لا يوجد موظفون في هذه الفئة
        </div>
      ) : (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                {['الموظف', 'اسم المستخدم', 'الصلاحية', 'اللغة', 'الحالة', 'الإجراءات'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const roleColor = ROLE_COLORS[s.role as Role] ?? { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' }
                const isSelf = s.id === user?.id
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#fafafa' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#fff' }}>

                    {/* Name + date */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                        منذ {new Date(s.createdAt).toLocaleDateString('ar-IQ')}
                      </div>
                    </td>

                    {/* Username */}
                    <td style={{ padding: '14px 16px', fontSize: 13, color: '#64748b', direction: 'ltr', textAlign: 'right' }}>
                      {s.username}
                    </td>

                    {/* Role Badge (read-only) */}
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        display: 'inline-block', padding: '4px 12px', borderRadius: 20,
                        background: roleColor.bg, color: roleColor.text,
                        border: `1px solid ${roleColor.border}`,
                        fontSize: 12, fontWeight: 700,
                      }}>
                        {ROLE_LABELS[s.role as Role] ?? s.role}
                      </span>
                    </td>

                    {/* Language */}
                    <td style={{ padding: '14px 16px', fontSize: 13, color: '#64748b' }}>
                      {s.language === 'ar' ? 'العربية' : 'English'}
                    </td>

                    {/* Status toggle */}
                    <td style={{ padding: '14px 16px' }}>
                      <button onClick={() => !isSelf && toggleActive(s)} disabled={isSelf}
                        title={isSelf ? 'لا يمكنك تعطيل حسابك الخاص' : undefined}
                        style={{
                          padding: '4px 14px', borderRadius: 20, border: 'none',
                          cursor: isSelf ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600,
                          background: s.isActive ? '#dcfce7' : '#fee2e2',
                          color: s.isActive ? '#16a34a' : '#dc2626',
                          opacity: isSelf ? 0.5 : 1,
                        }}>
                        {s.isActive ? '● نشط' : '○ معطّل'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <ActionButton
                          label="✏️ تعديل الصلاحية"
                          disabled={isSelf}
                          title={isSelf ? 'لا يمكنك تعديل صلاحيتك الخاصة' : undefined}
                          onClick={() => openEditRole(s)}
                          color="#eff6ff" textColor="#1d4ed8"
                        />
                        <ActionButton
                          label="🔑 كلمة المرور"
                          onClick={() => { setResetTarget(s); setNewPassword(''); setResetError('') }}
                          color="#f8fafc" textColor="#475569"
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Edit Role Modal ─────────────────────────────────────── */}
      {editTarget && (
        <Modal onClose={() => setEditTarget(null)}>
          <form onSubmit={handleEditRole}>
            <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700 }}>تعديل صلاحية الموظف</h3>
            <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 20px' }}>
              {editTarget.name} — <span style={{ direction: 'ltr', display: 'inline-block' }}>{editTarget.username}</span>
            </p>

            {editError && (
              <div style={{ background: '#fee2e2', color: '#dc2626', padding: '8px 12px', borderRadius: 6, marginBottom: 14, fontSize: 13 }}>{editError}</div>
            )}

            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>اختر الصلاحية الجديدة:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {ROLES.map((r) => (
                <label key={r} onClick={() => setEditRole(r)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px',
                    border: `2px solid ${editRole === r ? ROLE_COLORS[r].border : '#e2e8f0'}`,
                    borderRadius: 10, cursor: 'pointer',
                    background: editRole === r ? ROLE_COLORS[r].bg : '#fff',
                    transition: 'all 0.15s',
                  }}>
                  <input type="radio" name="role" value={r} checked={editRole === r} onChange={() => setEditRole(r)}
                    style={{ marginTop: 3, accentColor: ROLE_COLORS[r].text }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: editRole === r ? ROLE_COLORS[r].text : '#1e293b' }}>
                      {ROLE_LABELS[r]}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{ROLE_DESC[r]}</div>
                  </div>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setEditTarget(null)}
                style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 13 }}>
                إلغاء
              </button>
              <button type="submit" disabled={editSaving}
                style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', cursor: editSaving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, opacity: editSaving ? 0.7 : 1 }}>
                {editSaving ? 'جاري الحفظ...' : '💾 حفظ التغييرات'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Reset Password Modal ────────────────────────────────── */}
      {resetTarget && (
        <Modal onClose={() => setResetTarget(null)}>
          <form onSubmit={handleReset}>
            <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700 }}>إعادة تعيين كلمة المرور</h3>
            <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 18px' }}>
              {resetTarget.name} — <span style={{ direction: 'ltr', display: 'inline-block' }}>{resetTarget.username}</span>
            </p>
            {resetError && (
              <div style={{ background: '#fee2e2', color: '#dc2626', padding: '8px 12px', borderRadius: 6, marginBottom: 12, fontSize: 13 }}>{resetError}</div>
            )}
            <label style={labelStyle}>كلمة المرور الجديدة</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              placeholder="6 أحرف على الأقل" style={{ ...inputStyle, marginBottom: 18 }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setResetTarget(null)}
                style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 13 }}>
                إلغاء
              </button>
              <button type="submit" disabled={resetting}
                style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', cursor: resetting ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, opacity: resetting ? 0.7 : 1 }}>
                {resetting ? 'جاري الحفظ...' : '🔑 حفظ'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

// ── Shared style constants ───────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, color: '#475569', fontWeight: 600, marginBottom: 5,
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1',
  borderRadius: 7, fontSize: 14, boxSizing: 'border-box', outline: 'none',
}

// ── Small reusable components ────────────────────────────────────────────────

function FilterChip({ label, active, color, onClick }: { label: string; active: boolean; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{
        padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
        background: active ? color : '#f1f5f9',
        color: active ? '#fff' : '#64748b',
        transition: 'all 0.15s',
      }}>
      {label}
    </button>
  )
}

function ActionButton({ label, onClick, color, textColor, disabled, title }: {
  label: string; onClick: () => void; color: string; textColor: string; disabled?: boolean; title?: string
}) {
  return (
    <button onClick={() => !disabled && onClick()} title={title} disabled={disabled}
      style={{
        padding: '5px 10px', borderRadius: 6, border: `1px solid ${color === '#fff' ? '#e2e8f0' : 'transparent'}`,
        background: color, color: textColor, cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 12, fontWeight: 500, opacity: disabled ? 0.4 : 1, whiteSpace: 'nowrap',
      }}>
      {label}
    </button>
  )
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}>
      <div dir="rtl" style={{ background: '#fff', borderRadius: 14, padding: 28, width: '100%', maxWidth: 440, boxShadow: '0 25px 60px rgba(0,0,0,0.25)', maxHeight: '90vh', overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  )
}
