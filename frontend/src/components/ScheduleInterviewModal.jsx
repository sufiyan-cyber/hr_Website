/**
 * ScheduleInterviewModal
 *
 * Self-contained modal for HR Recruiters to generate a video interview link
 * for a specific candidate. Rendered only when the logged-in role is
 * "hr_recruiter" — the parent (CandidatesPage) handles that guard.
 *
 * Props:
 *   candidate  — { id, candidate_name, email } object
 *   onClose    — () => void   called when the modal is dismissed
 */

import { useState, useEffect, useCallback } from 'react'
import api from '@services/api'

export default function ScheduleInterviewModal({ candidate, onClose }) {
  const [step, setStep]         = useState('idle')   // idle | loading | success | error
  const [meetLink, setMeetLink] = useState('')
  const [eventLink, setEventLink] = useState('')
  const [copied, setCopied]     = useState(false)
  const [errMsg, setErrMsg]     = useState('')

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const handleGenerate = useCallback(async () => {
    setStep('loading')
    setErrMsg('')
    try {
      const { data } = await api.post('/api/v1/interviews/generate-meet-link', {
        candidate_name:  candidate.candidate_name || candidate.name || 'Candidate',
        candidate_email: candidate.email || undefined,
      })
      setMeetLink(data.meet_link)
      setEventLink(data.event_link || '')
      setStep('success')
    } catch (err) {
      const detail = err.response?.data?.detail || err.message || 'Unknown error'
      setErrMsg(detail)
      setStep('error')
    }
  }, [candidate])

  const handleCopy = useCallback(() => {
    if (!meetLink) return
    navigator.clipboard.writeText(meetLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }, [meetLink])

  const candidateName = candidate.candidate_name || candidate.name || 'Candidate'
  const initials      = candidateName.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')

  return (
    /* ── Backdrop ── */
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.18s ease',
      }}
    >
      {/* ── Modal panel ── */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          background: 'var(--clr-surface-1)',
          border: '1px solid var(--clr-border)',
          borderRadius: 16,
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          animation: 'slideUp 0.22s cubic-bezier(0.34,1.4,0.64,1)',
        }}
      >
        {/* ── Header ── */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--clr-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'linear-gradient(135deg, hsl(239,84%,67%,0.08), hsl(262,83%,68%,0.06))',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.25rem' }}>📅</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--clr-text-1)' }}>
                Schedule Interview
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--clr-text-3)', marginTop: 1 }}>
                Generate a video interview link
              </div>
            </div>
          </div>
          <button
            id="schedule-interview-modal-close"
            onClick={onClose}
            aria-label="Close modal"
            style={{
              width: 32, height: 32, borderRadius: 8,
              border: '1px solid var(--clr-border)',
              background: 'var(--clr-surface-2)',
              color: 'var(--clr-text-2)',
              fontSize: '1rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--clr-surface-3, hsl(0,0%,18%)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--clr-surface-2)'}
          >
            ✕
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '1.5rem' }}>

          {/* Candidate card */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '0.875rem 1rem',
            background: 'var(--clr-surface-2)',
            borderRadius: 10,
            border: '1px solid var(--clr-border)',
            marginBottom: '1.25rem',
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, hsl(239,84%,67%), hsl(262,83%,68%))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.9rem', fontWeight: 700, color: '#fff',
            }}>
              {initials}
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--clr-text-1)', fontSize: '0.9rem' }}>
                {candidateName}
              </div>
              {candidate.email && (
                <div style={{ fontSize: '0.72rem', color: 'var(--clr-text-3)', marginTop: 2 }}>
                  {candidate.email}
                </div>
              )}
            </div>
          </div>

          {/* ── Idle / Generate state ── */}
          {(step === 'idle' || step === 'loading') && (
            <>
              <p style={{ fontSize: '0.82rem', color: 'var(--clr-text-2)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                Clicking the button below will create a calendar event and generate
                a <strong style={{ color: 'var(--clr-text-1)' }}>video interview link</strong> for
                this candidate's interview. The link can then be shared with the candidate.
              </p>
              <button
                id="generate-meet-link-btn"
                onClick={handleGenerate}
                disabled={step === 'loading'}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: 10,
                  border: 'none',
                  background: step === 'loading'
                    ? 'hsl(239,84%,67%,0.5)'
                    : 'linear-gradient(135deg, hsl(239,84%,67%), hsl(262,83%,68%))',
                  color: '#fff',
                  fontSize: '0.9rem', fontWeight: 700,
                  cursor: step === 'loading' ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'opacity 0.2s',
                  boxShadow: '0 4px 14px hsl(239,84%,67%,0.35)',
                }}
              >
                {step === 'loading' ? (
                  <>
                    <span style={{
                      width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff', borderRadius: '50%',
                      display: 'inline-block',
                      animation: 'spin 0.7s linear infinite',
                    }} />
                    Generating…
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M15 10l4.553-2.069A1 1 0 0121 8.867v6.266a1 1 0 01-1.447.902L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/>
                    </svg>
                    Generate Video Link
                  </>
                )}
              </button>
            </>
          )}

          {/* ── Success state ── */}
          {step === 'success' && (
            <div style={{ animation: 'fadeIn 0.2s ease' }}>
              {/* Success banner */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '0.625rem 0.875rem',
                background: 'hsl(142,71%,50%,0.1)',
                border: '1px solid hsl(142,71%,50%,0.25)',
                borderRadius: 8, marginBottom: '1rem',
              }}>
                <span style={{ fontSize: '1rem' }}>✅</span>
                <span style={{ fontSize: '0.8rem', color: 'hsl(142,71%,50%)', fontWeight: 600 }}>
                  Video link generated successfully!
                </span>
              </div>

              {/* Link display */}
              <div style={{
                background: 'var(--clr-surface-2)',
                border: '1px solid var(--clr-border)',
                borderRadius: 10, padding: '0.875rem 1rem',
                marginBottom: '0.75rem',
              }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--clr-text-3)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Video Interview Link
                </div>
                <a
                  href={meetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '0.8rem', color: 'hsl(239,84%,67%)',
                    wordBreak: 'break-all', fontWeight: 500,
                    textDecoration: 'underline',
                  }}
                >
                  {meetLink}
                </a>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  id="copy-meet-link-btn"
                  onClick={handleCopy}
                  style={{
                    flex: 1,
                    padding: '0.625rem 0.875rem',
                    borderRadius: 8,
                    border: '1px solid var(--clr-border)',
                    background: copied ? 'hsl(142,71%,50%,0.12)' : 'var(--clr-surface-2)',
                    color: copied ? 'hsl(142,71%,50%)' : 'var(--clr-text-1)',
                    fontSize: '0.82rem', fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  {copied ? '✓ Copied!' : '📋 Copy Link'}
                </button>
                {meetLink && (
                  <a
                    href={meetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      flex: 1,
                      padding: '0.625rem 0.875rem',
                      borderRadius: 8,
                      border: '1px solid hsl(239,84%,67%,0.3)',
                      background: 'hsl(239,84%,67%,0.08)',
                      color: 'hsl(239,84%,67%)',
                      fontSize: '0.82rem', fontWeight: 600,
                      cursor: 'pointer', textDecoration: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    🎥 Join Video
                  </a>
                )}
              </div>

              <button
                onClick={() => { setStep('idle'); setMeetLink(''); setEventLink('') }}
                style={{
                  width: '100%', marginTop: 10,
                  padding: '0.5rem',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--clr-text-3)',
                  fontSize: '0.78rem', cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Generate another link
              </button>
            </div>
          )}

          {/* ── Error state ── */}
          {step === 'error' && (
            <div style={{ animation: 'fadeIn 0.2s ease' }}>
              <div style={{
                padding: '0.875rem 1rem',
                background: 'hsl(0,72%,60%,0.08)',
                border: '1px solid hsl(0,72%,60%,0.25)',
                borderRadius: 10, marginBottom: '1rem',
              }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'hsl(0,72%,65%)', marginBottom: 4 }}>
                  ⚠️ Failed to generate link
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-2)', lineHeight: 1.5 }}>
                  {errMsg}
                </div>
              </div>
              <button
                onClick={() => setStep('idle')}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  borderRadius: 8,
                  border: '1px solid var(--clr-border)',
                  background: 'var(--clr-surface-2)',
                  color: 'var(--clr-text-1)',
                  fontSize: '0.82rem', fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ← Try Again
              </button>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '0.875rem 1.5rem',
          borderTop: '1px solid var(--clr-border)',
          background: 'var(--clr-surface-2)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--clr-text-3)' }}>
            🔒 Calendar Integration · HR Recruiter access only
          </span>
        </div>
      </div>

      {/* ── Keyframe styles injected inline (no CSS file needed) ── */}
      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px) scale(0.97) } to { opacity: 1; transform: translateY(0) scale(1) } }
        @keyframes spin    { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
