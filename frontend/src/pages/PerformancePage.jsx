/**
 * PerformancePage — Employee Performance Reviews
 * Shows real review data from DB. Empty state if no reviews exist.
 */

import { useEffect, useState } from 'react'
import { fetchMyPerformance } from '@services/performanceService'

const RATING_CFG = {
  'Exceptional':           { color: 'hsl(262,83%,68%)', bg: 'hsl(262,83%,68%,0.12)' },
  'Exceeds Expectations':  { color: 'hsl(142,71%,45%)', bg: 'hsl(142,71%,50%,0.12)' },
  'Meets Expectations':    { color: 'hsl(239,84%,67%)', bg: 'hsl(239,84%,67%,0.12)' },
  'Needs Improvement':     { color: 'hsl(38,92%,45%)',  bg: 'hsl(38,92%,55%,0.12)'  },
  'Unsatisfactory':        { color: 'hsl(0,72%,50%)',   bg: 'hsl(0,72%,60%,0.12)'   },
}

function StarRating({ score }) {
  const full = Math.floor(score)
  const half = score - full >= 0.5
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{
          fontSize: '1.1rem',
          color: i <= full
            ? 'hsl(38,92%,55%)'
            : (i === full + 1 && half) ? 'hsl(38,92%,55%)' : 'var(--clr-surface-3)',
          opacity: i === full + 1 && half ? 0.6 : 1,
        }}>★</span>
      ))}
      <span style={{ marginLeft: 6, fontWeight: 700, color: 'hsl(38,92%,55%)', fontSize: '0.9rem' }}>
        {Number(score).toFixed(1)}
      </span>
    </div>
  )
}

function RatingBadge({ rating }) {
  const cfg = RATING_CFG[rating] || RATING_CFG['Meets Expectations']
  return (
    <span style={{
      padding: '3px 12px', borderRadius: 20,
      background: cfg.bg, color: cfg.color,
      fontSize: '0.75rem', fontWeight: 700,
    }}>
      {rating}
    </span>
  )
}

function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--clr-text-3)' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⭐</div>
      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--clr-text-2)', marginBottom: 8 }}>
        No Performance Reviews Yet
      </div>
      <div style={{ fontSize: '0.875rem' }}>
        Your performance reviews will appear here after your first quarterly review cycle.
      </div>
    </div>
  )
}

export default function PerformancePage() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    fetchMyPerformance()
      .then(setData)
      .catch(err => setError(err.response?.data?.detail || err.message))
      .finally(() => setLoading(false))
  }, [])

  const hasRecords = data?.has_records || false
  const reviews    = data?.reviews     || []
  const avgScore   = data?.avg_score   || 0
  const latest     = data?.latest      || null

  return (
    <div className="dash-page">

      {/* ── Header ── */}
      <div className="dash-page__header">
        <div>
          <h1 className="dash-page__title">My Performance</h1>
          <p className="dash-page__subtitle">Quarterly review scores and feedback</p>
        </div>
      </div>

      {error && <div className="dash-error">⚠️ {error}</div>}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton-pulse" style={{ height: 120, borderRadius: 14 }} />
          ))}
        </div>
      ) : !hasRecords ? (
        <div className="chart-panel">
          <EmptyState />
        </div>
      ) : (
        <>
          {/* ── Summary Cards ── */}
          <div className="stat-grid stat-grid--3">
            <div className="stat-card stat-card--warning">
              <div className="stat-card__icon-wrap"><span className="stat-card__icon">⭐</span></div>
              <div className="stat-card__body">
                <div className="stat-card__value">{Number(avgScore).toFixed(1)}<span style={{fontSize:'1rem',fontWeight:400}}>/5</span></div>
                <div className="stat-card__label">Average Score</div>
              </div>
            </div>
            <div className="stat-card stat-card--primary">
              <div className="stat-card__icon-wrap"><span className="stat-card__icon">📋</span></div>
              <div className="stat-card__body">
                <div className="stat-card__value">{reviews.length}</div>
                <div className="stat-card__label">Total Reviews</div>
              </div>
            </div>
            {latest && (
              <div className="stat-card stat-card--success">
                <div className="stat-card__icon-wrap"><span className="stat-card__icon">🏆</span></div>
                <div className="stat-card__body">
                  <div className="stat-card__value" style={{ fontSize: '1rem' }}>{latest.rating}</div>
                  <div className="stat-card__label">Latest Rating · {latest.quarter}</div>
                </div>
              </div>
            )}
          </div>

          {/* ── Review Cards ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {reviews.map((r, i) => (
              <div key={r.id || i} style={{
                background: 'var(--clr-surface-1)',
                border: '1px solid var(--clr-border)',
                borderRadius: 14,
                padding: '1.25rem 1.5rem',
                display: 'flex',
                gap: '1.5rem',
                flexWrap: 'wrap',
                alignItems: 'flex-start',
              }}>
                {/* Quarter badge */}
                <div style={{ minWidth: 90, flexShrink: 0 }}>
                  <div style={{
                    padding: '8px 14px', borderRadius: 10, textAlign: 'center',
                    background: 'hsl(239,84%,67%,0.1)',
                    color: 'hsl(239,84%,67%)',
                    fontWeight: 800, fontSize: '0.875rem',
                  }}>
                    {r.quarter}
                  </div>
                  <div style={{
                    marginTop: 8, textAlign: 'center',
                    fontSize: '0.72rem', color: 'var(--clr-text-3)',
                  }}>
                    {r.review_date ? new Date(r.review_date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '—'}
                  </div>
                </div>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ marginBottom: 10 }}>
                    <StarRating score={r.score || 0} />
                  </div>
                  <RatingBadge rating={r.rating} />
                  {r.reviewer && (
                    <div style={{ marginTop: 10, fontSize: '0.8rem', color: 'var(--clr-text-3)' }}>
                      Reviewed by: <span style={{ color: 'var(--clr-text-2)', fontWeight: 600 }}>{r.reviewer}</span>
                    </div>
                  )}
                  {r.comments && (
                    <div style={{
                      marginTop: 10, padding: '10px 14px',
                      background: 'var(--clr-surface-2)', borderRadius: 8,
                      fontSize: '0.82rem', color: 'var(--clr-text-2)',
                      borderLeft: '3px solid hsl(239,84%,67%)',
                    }}>
                      {r.comments}
                    </div>
                  )}
                </div>

                {/* Score circle */}
                <div style={{
                  width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
                  background: 'linear-gradient(135deg, hsl(239,84%,67%,0.15), hsl(262,83%,68%,0.1))',
                  border: '2px solid hsl(239,84%,67%,0.3)',
                }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'hsl(239,84%,67%)', lineHeight: 1 }}>
                    {Number(r.score || 0).toFixed(1)}
                  </div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--clr-text-3)', marginTop: 2 }}>out of 5</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

    </div>
  )
}
