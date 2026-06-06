/**
 * SettingsPage — Account Settings
 * Profile info edit + Change password via Supabase Auth.
 */

import { useState } from 'react'
import { supabase } from '@services/supabaseClient'
import { useAuth } from '@context/AuthContext'

const DEPARTMENTS = [
  'Engineering', 'Sales', 'Marketing', 'HR', 'Finance',
  'Operations', 'Design', 'Legal', 'Product', 'Support',
]

function Section({ title, subtitle, children }) {
  return (
    <div style={{
      background: 'var(--clr-surface-1)', border: '1px solid var(--clr-border)',
      borderRadius: 16, overflow: 'hidden', marginBottom: '1.5rem',
    }}>
      <div style={{
        padding: '1.1rem 1.5rem', borderBottom: '1px solid var(--clr-border)',
        fontWeight: 700, fontSize: '0.95rem', color: 'var(--clr-text-1)',
      }}>
        {title}
        {subtitle && (
          <span style={{ marginLeft: 10, fontSize: '0.78rem', color: 'var(--clr-text-3)', fontWeight: 400 }}>
            {subtitle}
          </span>
        )}
      </div>
      <div style={{ padding: '1.25rem 1.5rem' }}>{children}</div>
    </div>
  )
}

function Alert({ msg }) {
  if (!msg) return null
  return (
    <div style={{
      padding: '0.75rem 1.1rem', borderRadius: 9, marginBottom: '1rem',
      fontSize: '0.875rem', fontWeight: 600,
      background: msg.type === 'success' ? 'hsl(142,71%,50%,0.12)' : 'hsl(0,72%,60%,0.12)',
      color: msg.type === 'success' ? 'hsl(142,71%,40%)' : 'hsl(0,72%,50%)',
      border: `1px solid ${msg.type === 'success' ? 'hsl(142,71%,50%,0.3)' : 'hsl(0,72%,60%,0.3)'}`,
    }}>
      {msg.type === 'success' ? '✓' : '⚠️'} {msg.text}
    </div>
  )
}

export default function SettingsPage() {
  const { user, profile, displayName, role } = useAuth()

  // ── Profile form ──────────────────────────────────────────────────────────
  const [fullName, setFullName] = useState(profile?.full_name || displayName || '')
  const [dept,     setDept]     = useState(profile?.department || '')
  const [profSaving, setProfSaving] = useState(false)
  const [profMsg,    setProfMsg]    = useState(null)

  const saveProfile = async () => {
    if (!user || !fullName.trim()) return
    setProfSaving(true); setProfMsg(null)
    try {
      const { error } = await supabase.from('users')
        .update({ full_name: fullName.trim(), department: dept || null })
        .eq('auth_user_id', user.id)
      if (error) throw error
      await supabase.auth.updateUser({ data: { full_name: fullName.trim() } })
      setProfMsg({ type: 'success', text: 'Profile updated.' })
    } catch (e) {
      setProfMsg({ type: 'error', text: e.message })
    } finally {
      setProfSaving(false)
    }
  }

  // ── Password form ─────────────────────────────────────────────────────────
  const [curPwd,  setCurPwd]  = useState('')
  const [newPwd,  setNewPwd]  = useState('')
  const [confPwd, setConfPwd] = useState('')
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdMsg,    setPwdMsg]    = useState(null)

  const changePassword = async () => {
    setPwdMsg(null)
    if (!newPwd || newPwd.length < 8) {
      setPwdMsg({ type: 'error', text: 'New password must be at least 8 characters.' }); return
    }
    if (newPwd !== confPwd) {
      setPwdMsg({ type: 'error', text: 'Passwords do not match.' }); return
    }
    setPwdSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPwd })
      if (error) throw error
      setPwdMsg({ type: 'success', text: 'Password changed successfully.' })
      setCurPwd(''); setNewPwd(''); setConfPwd('')
    } catch (e) {
      setPwdMsg({ type: 'error', text: e.message })
    } finally {
      setPwdSaving(false)
    }
  }

  return (
    <div className="dash-page">

      {/* ── Header ── */}
      <div className="dash-page__header">
        <div>
          <h1 className="dash-page__title">Settings</h1>
          <p className="dash-page__subtitle">Manage your account preferences</p>
        </div>
      </div>

      {/* ── Account Info (read-only) ── */}
      <Section title="🔒 Account Information" subtitle="Read-only">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {[
            { label: 'Email Address', value: user?.email },
            { label: 'Account Role',  value: role?.replace(/_/g, ' ') },
            { label: 'User ID',       value: user?.id?.slice(0, 16) + '…' },
            { label: 'Email Verified', value: user?.email_confirmed_at ? '✓ Verified' : 'Not verified' },
          ].map(row => (
            <div key={row.label}>
              <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-3)', marginBottom: 4 }}>{row.label}</div>
              <div style={{
                padding: '0.6rem 0.9rem', borderRadius: 8,
                background: 'var(--clr-surface-2)', border: '1px solid var(--clr-border)',
                fontSize: '0.875rem', color: 'var(--clr-text-2)',
              }}>
                {row.value || '—'}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Profile Settings ── */}
      <Section title="👤 Profile Settings">
        <Alert msg={profMsg} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--clr-text-3)', display: 'block', marginBottom: 6 }}>
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
            <label style={{ fontSize: '0.78rem', color: 'var(--clr-text-3)', display: 'block', marginBottom: 6 }}>
              Department
            </label>
            <select
              className="form-input form-input--no-icon"
              value={dept}
              onChange={e => setDept(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="">Select department…</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <button
          className="btn-primary"
          onClick={saveProfile}
          disabled={profSaving || !fullName.trim()}
        >
          {profSaving ? 'Saving…' : '✓ Save Profile'}
        </button>
      </Section>

      {/* ── Change Password ── */}
      <Section title="🔑 Change Password">
        <Alert msg={pwdMsg} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', maxWidth: 420 }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--clr-text-3)', display: 'block', marginBottom: 6 }}>
              New Password
            </label>
            <input
              type="password"
              className="form-input form-input--no-icon"
              value={newPwd}
              onChange={e => setNewPwd(e.target.value)}
              placeholder="Minimum 8 characters"
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--clr-text-3)', display: 'block', marginBottom: 6 }}>
              Confirm New Password
            </label>
            <input
              type="password"
              className="form-input form-input--no-icon"
              value={confPwd}
              onChange={e => setConfPwd(e.target.value)}
              placeholder="Re-enter new password"
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-3)', marginTop: 2 }}>
            💡 Supabase will send a confirmation email after the password is changed.
          </div>
          <button
            className="btn-primary"
            onClick={changePassword}
            disabled={pwdSaving || !newPwd || !confPwd}
            style={{ alignSelf: 'flex-start' }}
          >
            {pwdSaving ? 'Updating…' : '🔑 Update Password'}
          </button>
        </div>
      </Section>

      {/* ── Danger Zone ── */}
      <Section title="⚠️ Session">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ flex: 1, fontSize: '0.875rem', color: 'var(--clr-text-2)' }}>
            Signed in as <strong>{user?.email}</strong>
          </div>
          <button
            className="btn-secondary"
            onClick={() => supabase.auth.signOut()}
            style={{ borderColor: 'hsl(0,72%,60%,0.4)', color: 'hsl(0,72%,60%)' }}
          >
            Sign Out
          </button>
        </div>
      </Section>

    </div>
  )
}
