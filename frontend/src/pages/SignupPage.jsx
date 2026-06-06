/**
 * SignupPage — Phase 1
 *
 * Full name, email, password + role selector.
 * Creates Supabase auth user + public.users row.
 * Redirects to /login on success.
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '@context/AuthContext'

// ── Inline SVG icons ──────────────────────────────────────────────────────────

const IconUser = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)

const IconMail = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
)

const IconLock = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)

const IconEye = ({ off }) => off ? (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
) : (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)

const IconAlert = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{flexShrink:0}}>
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
)

// ── Role definitions ──────────────────────────────────────────────────────────

const ROLES = [
  { value: 'management_admin', label: 'Admin',    icon: '👑', desc: 'Full access' },
  { value: 'hr_recruiter',     label: 'HR',        icon: '🎯', desc: 'Recruitment' },
  { value: 'senior_manager',   label: 'Manager',   icon: '📊', desc: 'Team lead' },
  { value: 'employee',         label: 'Employee',  icon: '👤', desc: 'Self-service' },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function SignupPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const [fullName,   setFullName]   = useState('')
  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [showPw,     setShowPw]     = useState(false)
  const [role,       setRole]       = useState('employee')
  const [error,      setError]      = useState('')
  const [loading,    setLoading]    = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!fullName.trim()) { setError('Full name is required.');           return }
    if (!email.trim())    { setError('Email address is required.');        return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }

    setLoading(true)
    const { error: signUpError } = await signUp({
      email: email.trim(),
      password,
      fullName: fullName.trim(),
      role,
    })
    setLoading(false)

    if (signUpError) {
      const msg = signUpError.message?.includes('already registered')
        ? 'An account with this email already exists.'
        : signUpError.message ?? 'Sign up failed. Please try again.'
      setError(msg)
      toast.error('Sign up failed')
      return
    }

    toast.success('Account created! Please check your email to confirm, then sign in.')
    navigate('/login', { replace: true })
  }

  return (
    <main className="auth-page" aria-label="Sign up">
      {/* ── Brand Panel ── */}
      <div className="auth-page__brand" aria-hidden="true">
        <div className="auth-brand__orb auth-brand__orb--1" />
        <div className="auth-brand__orb auth-brand__orb--2" />

        <div className="auth-brand__logo">
          <div className="auth-brand__logo-icon">🧠</div>
          <span className="auth-brand__logo-text">HRMS</span>
        </div>

        <div className="auth-brand__hero">
          <h1 className="auth-brand__tagline">
            One platform.<br/>
            <span>Every HR need.</span>
          </h1>
          <p className="auth-brand__sub">
            From AI-powered resume screening to payroll automation —
            HRMS handles it all so your team can focus on what matters.
          </p>
        </div>

        {/* Feature bullets */}
        <div style={{ position:'relative', display:'flex', flexDirection:'column', gap:'0.75rem' }}>
          {[
            { icon:'🤖', text:'AI resume screening & scoring' },
            { icon:'📅', text:'Smart attendance & leave management' },
            { icon:'💰', text:'Automated payroll processing' },
            { icon:'📈', text:'Performance analytics & reviews' },
          ].map((f) => (
            <div key={f.text} style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
              <span style={{ fontSize:'1.1rem' }}>{f.icon}</span>
              <span style={{ fontSize:'0.875rem', color:'var(--clr-text-2)' }}>{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Form Panel ── */}
      <div className="auth-page__form-panel">
        <div className="auth-card">
          <div className="auth-card__header">
            <p className="auth-card__eyebrow">Get started</p>
            <h2 className="auth-card__title">Create your account</h2>
            <p className="auth-card__subtitle">
              Already have an account?{' '}
              <Link to="/login" style={{color:'var(--clr-primary-light)', fontWeight:600}}>
                Sign in
              </Link>
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="auth-error" role="alert">
              <IconAlert />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Full Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="signup-name">Full name</label>
              <div className="form-input-wrap">
                <span className="form-input-icon"><IconUser /></span>
                <input
                  id="signup-name"
                  type="text"
                  className="form-input"
                  placeholder="Jane Smith"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  autoFocus
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="form-label" htmlFor="signup-email">Email address</label>
              <div className="form-input-wrap">
                <span className="form-input-icon"><IconMail /></span>
                <input
                  id="signup-email"
                  type="email"
                  className="form-input"
                  placeholder="jane@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label" htmlFor="signup-password">Password</label>
              <div className="form-input-wrap">
                <span className="form-input-icon"><IconLock /></span>
                <input
                  id="signup-password"
                  type={showPw ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="form-input-toggle"
                  onClick={() => setShowPw((p) => !p)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  <IconEye off={showPw} />
                </button>
              </div>
            </div>

            {/* Role selector */}
            <div className="form-group">
              <span className="form-label" id="role-group-label">Select your role</span>
              <div className="role-grid" role="group" aria-labelledby="role-group-label">
                {ROLES.map((r) => (
                  <label key={r.value} className="role-option">
                    <input
                      type="radio"
                      name="role"
                      value={r.value}
                      checked={role === r.value}
                      onChange={() => setRole(r.value)}
                    />
                    <div className="role-option__label">
                      <span className="role-option__icon">{r.icon}</span>
                      <span className="role-option__name">{r.label}</span>
                      <span style={{ fontSize:'0.65rem', color:'var(--clr-text-3)' }}>{r.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Submit */}
            <div style={{ marginTop: '1.75rem' }}>
              <button
                id="signup-submit-btn"
                type="submit"
                className="btn-primary"
                disabled={loading}
              >
                {loading
                  ? <><span className="spinner-inline" /> Creating account…</>
                  : 'Create account →'
                }
              </button>
            </div>
          </form>

          <p style={{
            textAlign:'center', marginTop:'1rem',
            fontSize:'0.75rem', color:'var(--clr-text-3)', lineHeight:1.5
          }}>
            By creating an account, you agree to the platform's{' '}
            <span style={{color:'var(--clr-primary-light)'}}>Terms of Service</span>{' '}
            and{' '}
            <span style={{color:'var(--clr-primary-light)'}}>Privacy Policy</span>.
          </p>
        </div>
      </div>
    </main>
  )
}
