/**
 * LoginPage — Phase 1
 *
 * Modern dark SaaS login with split layout:
 * - Left: brand panel with gradient + stats
 * - Right: email/password form with Supabase auth
 *
 * On success: redirects to role-specific dashboard.
 * On failure: shows inline error + toast.
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth, ROLE_DASHBOARD } from '@context/AuthContext'

// ── Icon components (inline SVG — no extra dep) ───────────────────────────────

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

// ── Component ─────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const { signIn, dashboardPath } = useAuth()
  const navigate = useNavigate()

  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [showPw,    setShowPw]    = useState(false)
  const [error,     setError]     = useState('')
  const [loading,   setLoading]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email.trim())    { setError('Email is required.');    return }
    if (!password.trim()) { setError('Password is required.'); return }

    setLoading(true)
    const { error: authError, role } = await signIn(email.trim(), password)
    setLoading(false)

    if (authError) {
      const msg = authError.message?.includes('Invalid login')
        ? 'Invalid email or password. Please try again.'
        : authError.message ?? 'Login failed. Please try again.'
      setError(msg)
      toast.error('Login failed')
      return
    }

    toast.success('Welcome back! 👋')
    navigate(ROLE_DASHBOARD[role] ?? '/employee/dashboard', { replace: true })
  }

  return (
    <main className="auth-page" aria-label="Login">
      {/* ── Brand Panel ── */}
      <div className="auth-page__brand" aria-hidden="true">
        <div className="auth-brand__orb auth-brand__orb--1" />
        <div className="auth-brand__orb auth-brand__orb--2" />

        {/* Logo */}
        <div className="auth-brand__logo">
          <div className="auth-brand__logo-icon">🧠</div>
          <span className="auth-brand__logo-text">HRMS</span>
        </div>

        {/* Hero copy */}
        <div className="auth-brand__hero">
          <h1 className="auth-brand__tagline">
            HR powered by<br/>
            <span>Artificial Intelligence</span>
          </h1>
          <p className="auth-brand__sub">
            Streamline hiring, payroll, attendance, and performance — all in one
            intelligent platform built for modern teams.
          </p>
        </div>

        {/* Stats */}
        <div className="auth-brand__stats">
          <div>
            <div className="auth-brand__stat-val">98%</div>
            <div className="auth-brand__stat-label">Faster Hiring</div>
          </div>
          <div>
            <div className="auth-brand__stat-val">4 Roles</div>
            <div className="auth-brand__stat-label">Access Control</div>
          </div>
          <div>
            <div className="auth-brand__stat-val">AI</div>
            <div className="auth-brand__stat-label">Powered</div>
          </div>
        </div>
      </div>

      {/* ── Form Panel ── */}
      <div className="auth-page__form-panel">
        <div className="auth-card">
          <div className="auth-card__header">
            <p className="auth-card__eyebrow">Welcome back</p>
            <h2 className="auth-card__title">Sign in to your account</h2>
            <p className="auth-card__subtitle">
              Don't have an account?{' '}
              <Link to="/signup" style={{color:'var(--clr-primary-light)', fontWeight:600}}>
                Create one
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
            {/* Email */}
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">
                Email address
              </label>
              <div className="form-input-wrap">
                <span className="form-input-icon"><IconMail /></span>
                <input
                  id="login-email"
                  type="email"
                  className="form-input"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label" htmlFor="login-password">
                Password
              </label>
              <div className="form-input-wrap">
                <span className="form-input-icon"><IconLock /></span>
                <input
                  id="login-password"
                  type={showPw ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
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

            {/* Submit */}
            <div style={{ marginTop: '1.75rem' }}>
              <button
                id="login-submit-btn"
                type="submit"
                className="btn-primary"
                disabled={loading}
              >
                {loading
                  ? <><span className="spinner-inline" /> Signing in…</>
                  : 'Sign in →'
                }
              </button>
            </div>
          </form>

          <div className="auth-link" style={{ marginTop: '1.25rem' }}>
            <Link to="/signup">
              New here? Create an account
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
