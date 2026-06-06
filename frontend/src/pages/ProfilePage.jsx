/**
 * ProfilePage — Employee My Profile
 * Fetches real profile data from the employee dashboard endpoint.
 * Allows editing display name and department.
 */

import { useEffect, useState } from 'react'
import { supabase } from '@services/supabaseClient'
import { useAuth } from '@context/AuthContext'

const DEPARTMENTS = [
  'Engineering', 'Sales', 'Marketing', 'HR', 'Finance',
  'Operations', 'Design', 'Legal', 'Product', 'Support',
]

function InfoRow({ label, value, muted }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0.7rem 0',
      borderBottom: '1px solid var(--clr-border)',
    }}>
      <span style={{ fontSize: '0.82rem', color: 'var(--clr-text-3)' }}>{label}</span>
      <span style={{
        fontSize: '0.88rem',
        color: muted ? 'var(--clr-text-3)' : 'var(--clr-text-1)',
        fontWeight: muted ? 400 : 600,
      }}>{value || '—'}</span>
    </div>
  )
}

export default function ProfilePage() {
  const { user, profile, displayName, role } = useAuth()

  const [editing, setEditing]   = useState(false)
  const [fullName, setFullName] = useState('')
  const [dept, setDept]         = useState('')
  const [saving, setSaving]     = useState(false)
  const [saveMsg, setSaveMsg]   = useState(null)

  // Pre-fill form from profile
  useEffect(() => {
    setFullName(profile?.full_name || displayName || '')
    setDept(profile?.department || '')
  }, [profile, displayName])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    setSaveMsg(null)
    try {
      // Update public.users row
      const { error } = await supabase
        .from('users')
        .update({ full_name: fullName.trim(), department: dept })
        .eq('auth_user_id', user.id)

      if (error) throw error

      // Also update auth user_metadata so displayName refreshes
      await supabase.auth.updateUser({
        data: { full_name: fullName.trim() },
      })

      setSaveMsg({ type: 'success', text: 'Profile updated successfully!' })
      setEditing(false)
    } catch (err) {
      setSaveMsg({ type: 'error', text: err.message || 'Failed to save changes.' })
    } finally {
      setSaving(false)
    }
  }

  const initials = (fullName || displayName || 'U')
    .split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')

  const joinDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : '—'

  return (
    <div className="dash-page">

      {/* ── Header ── */}
      <div className="dash-page__header">
        <div>
          <h1 className="dash-page__title">My Profile</h1>
          <p className="dash-page__subtitle">Manage your personal information</p>
        </div>
        {!editing && (
          <button
            className="quick-action-btn"
            onClick={() => setEditing(true)}
          >
            ✏️ Edit Profile
          </button>
        )}
      </div>

      {saveMsg && (
        <div style={{
          padding: '0.75rem 1.25rem',
          borderRadius: 10,
          marginBottom: '1.5rem',
          fontSize: '0.875rem',
          fontWeight: 600,
          background: saveMsg.type === 'success'
            ? 'hsl(142,71%,50%,0.12)' : 'hsl(0,72%,60%,0.12)',
          color: saveMsg.type === 'success'
            ? 'hsl(142,71%,40%)' : 'hsl(0,72%,50%)',
          border: `1px solid ${saveMsg.type === 'success'
            ? 'hsl(142,71%,50%,0.3)' : 'hsl(0,72%,60%,0.3)'}`,
        }}>
          {saveMsg.type === 'success' ? '✓' : '⚠️'} {saveMsg.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '1.5rem', alignItems: 'start' }}>

        {/* ── Avatar Card ── */}
        <div style={{
          background: 'linear-gradient(135deg, hsl(239,84%,67%,0.12), hsl(262,83%,68%,0.08))',
          border: '1px solid hsl(239,84%,67%,0.25)',
          borderRadius: 16,
          padding: '2.5rem 1.5rem',
          textAlign: 'center',
        }}>
          <div style={{
            width: 100, height: 100, borderRadius: '50%', margin: '0 auto 1.25rem',
            background: 'linear-gradient(135deg, hsl(239,84%,67%), hsl(262,83%,68%))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2.25rem', fontWeight: 800, color: '#fff',
            boxShadow: '0 0 0 6px hsl(239,84%,67%,0.2)',
          }}>
            {initials}
          </div>

          <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--clr-text-1)', marginBottom: 4 }}>
            {editing ? fullName || '—' : displayName}
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--clr-text-3)', marginBottom: '1rem' }}>
            {user?.email}
          </div>

          <div style={{
            display: 'inline-block',
            padding: '5px 18px', borderRadius: 20,
            background: 'hsl(239,84%,67%,0.12)',
            color: 'hsl(239,84%,67%)',
            fontSize: '0.78rem', fontWeight: 700,
            textTransform: 'capitalize',
            marginBottom: '0.5rem',
          }}>
            {role?.replace(/_/g, ' ')}
          </div>

          {dept && (
            <div style={{
              display: 'block',
              marginTop: 6,
              fontSize: '0.8rem',
              color: 'var(--clr-text-2)',
            }}>
              📌 {dept}
            </div>
          )}

          <div style={{
            marginTop: '1.5rem',
            padding: '10px 14px',
            borderRadius: 10,
            background: 'var(--clr-surface-2)',
            border: '1px solid var(--clr-border)',
            fontSize: '0.78rem',
            color: 'var(--clr-text-3)',
          }}>
            📅 Joined {joinDate}
          </div>
        </div>

        {/* ── Info / Edit Panel ── */}
        <div style={{
          background: 'var(--clr-surface-1)',
          border: '1px solid var(--clr-border)',
          borderRadius: 16,
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--clr-border)',
            fontWeight: 700,
            fontSize: '0.95rem',
            color: 'var(--clr-text-1)',
          }}>
            {editing ? '✏️ Edit Profile Info' : '👤 Profile Info'}
          </div>

          <div style={{ padding: '1.25rem 1.5rem' }}>
            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--clr-text-3)', display: 'block', marginBottom: 6 }}>
                    Full Name
                  </label>
                  <input
                    className="form-input form-input--no-icon"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Your full name"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--clr-text-3)', display: 'block', marginBottom: 6 }}>
                    Department
                  </label>
                  <select
                    className="form-input form-input--no-icon"
                    value={dept}
                    onChange={e => setDept(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="">Select department…</option>
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button
                    className="btn-primary"
                    onClick={handleSave}
                    disabled={saving || !fullName.trim()}
                    style={{ flex: 1 }}
                  >
                    {saving ? 'Saving…' : '✓ Save Changes'}
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => { setEditing(false); setSaveMsg(null) }}
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <InfoRow label="Full Name"   value={displayName} />
                <InfoRow label="Email"       value={user?.email} />
                <InfoRow label="Department"  value={profile?.department} />
                <InfoRow label="Role"        value={role?.replace(/_/g, ' ')} />
                <InfoRow label="Account ID"  value={user?.id?.slice(0, 8) + '…'} muted />
                <InfoRow label="Member Since" value={joinDate} />
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
