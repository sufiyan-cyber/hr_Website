/**
 * JobDetailPage — Single Job Description with Linked Candidates
 * Reads :id from URL params. Fetches from /recruitment/jobs/:id
 */

import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchJob } from '@services/recruitmentService'

const STAGE_COLORS = {
  screening:            { bg: 'hsl(239,84%,67%,0.12)', text: 'hsl(239,84%,67%)' },
  shortlisted:          { bg: 'hsl(142,71%,50%,0.12)', text: 'hsl(142,71%,40%)' },
  interview_scheduled:  { bg: 'hsl(195,80%,55%,0.12)', text: 'hsl(195,80%,45%)' },
  interviewed:          { bg: 'hsl(262,83%,68%,0.12)', text: 'hsl(262,83%,55%)' },
  offer_extended:       { bg: 'hsl(38,92%,55%,0.12)',  text: 'hsl(38,92%,45%)'  },
  hired:                { bg: 'hsl(142,71%,50%,0.15)', text: 'hsl(142,71%,38%)' },
  rejected:             { bg: 'hsl(0,72%,60%,0.12)',   text: 'hsl(0,72%,50%)'   },
}

function ScoreBar({ score }) {
  const pct = Math.min(100, Math.max(0, Number(score) || 0))
  const color = pct >= 80 ? 'hsl(142,71%,50%)' : pct >= 60 ? 'hsl(239,84%,67%)' : 'hsl(38,92%,55%)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color, fontWeight: 700, minWidth: 36, fontSize: '0.85rem' }}>{pct}%</span>
      <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'var(--clr-surface-3)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
    </div>
  )
}

export default function JobDetailPage() {
  const { id }  = useParams()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (!id) return
    fetchJob(id)
      .then(setData)
      .catch(err => setError(err.response?.data?.detail || err.message))
      .finally(() => setLoading(false))
  }, [id])

  const job        = data?.job        || {}
  const candidates = data?.candidates || []

  if (error) {
    return (
      <div className="dash-page">
        <div className="dash-error">⚠️ {error}</div>
        <Link to="/recruitment" style={{ color: 'hsl(239,84%,67%)', fontSize: '0.875rem' }}>
          ← Back to Job Postings
        </Link>
      </div>
    )
  }

  return (
    <div className="dash-page">

      {/* ── Breadcrumb ── */}
      <div style={{ marginBottom: '0.75rem' }}>
        <Link to="/recruitment" style={{
          color: 'hsl(239,84%,67%)', fontSize: '0.82rem',
          textDecoration: 'none', fontWeight: 600,
        }}>
          ← Job Postings
        </Link>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton-pulse" style={{ height: 100, borderRadius: 14 }} />
          ))}
        </div>
      ) : (
        <>
          {/* ── Job Header ── */}
          <div style={{
            background: 'linear-gradient(135deg, hsl(239,84%,67%,0.12), hsl(262,83%,68%,0.08))',
            border: '1px solid hsl(239,84%,67%,0.25)',
            borderRadius: 16, padding: '1.75rem 2rem', marginBottom: '1.5rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--clr-text-1)', margin: 0, marginBottom: 8 }}>
                  {job.title}
                </h1>
                <div style={{ fontSize: '0.8rem', color: 'var(--clr-text-3)' }}>
                  Posted {job.created_at ? new Date(job.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '—'}
                </div>
              </div>
              <Link to="/hr/screening" className="quick-action-btn">
                🤖 Screen Resumes
              </Link>
            </div>

            {job.description && (
              <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--clr-text-2)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                {job.description}
              </div>
            )}

            {job.requirements && (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--clr-text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Requirements
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--clr-text-2)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                  {job.requirements}
                </div>
              </div>
            )}
          </div>

          {/* ── Candidates for this Job ── */}
          <div className="dash-table-wrap">
            <div className="dash-table-wrap__header">
              <span className="dash-table-wrap__title">Candidates ({candidates.length})</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--clr-text-3)' }}>
                Sorted by AI score
              </span>
            </div>

            {candidates.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 2rem', color: 'var(--clr-text-3)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📄</div>
                <div style={{ fontWeight: 700, color: 'var(--clr-text-2)', marginBottom: 6 }}>No candidates yet</div>
                <div style={{ fontSize: '0.875rem' }}>
                  Upload resumes and run AI screening for this job to see results here.
                </div>
              </div>
            ) : (
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Candidate</th>
                    <th>AI Score</th>
                    <th>Status</th>
                    <th>Applied</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c, i) => {
                    const stg = STAGE_COLORS[c.status] || STAGE_COLORS.screening
                    return (
                      <tr key={c.id}>
                        <td style={{ color: 'var(--clr-text-3)', fontSize: '0.82rem' }}>#{i + 1}</td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--clr-text-1)' }}>{c.name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--clr-text-3)' }}>{c.email}</div>
                        </td>
                        <td style={{ minWidth: 140 }}>
                          <ScoreBar score={c.score} />
                        </td>
                        <td>
                          <span style={{
                            padding: '3px 12px', borderRadius: 20,
                            background: stg.bg, color: stg.text,
                            fontSize: '0.75rem', fontWeight: 700,
                            textTransform: 'capitalize',
                          }}>
                            {c.status?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={{ color: 'var(--clr-text-3)', fontSize: '0.8rem' }}>
                          {c.applied_at ? new Date(c.applied_at).toLocaleDateString('en-IN') : '—'}
                        </td>
                        <td>
                          <Link
                            to={`/candidates/${c.id}`}
                            style={{
                              color: 'hsl(239,84%,67%)', fontSize: '0.8rem',
                              textDecoration: 'none', fontWeight: 600,
                            }}
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

    </div>
  )
}
