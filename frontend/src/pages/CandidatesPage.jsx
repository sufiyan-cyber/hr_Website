/**
 * CandidatesPage — Phase 5
 *
 * Full candidate list view:
 * - Filterable table (by stage, search)
 * - AI score badges, status chips
 * - Click row → navigate to candidate detail
 * - Empty state with illustration
 * - Pagination (page_size = 20)
 */

import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchCandidates } from '@services/candidateService'
import EmptyState from '@components/EmptyState'
import { useAuth } from '@context/AuthContext'
import ScheduleInterviewModal from '@components/ScheduleInterviewModal'

// ── Helpers ───────────────────────────────────────────────────────────────────

const STAGE_CONFIG = {
  applied:             { label: 'Applied',       color: 'hsl(215,20%,55%)' },
  screening:           { label: 'Screening',     color: 'hsl(38,92%,55%)'  },
  shortlisted:         { label: 'Shortlisted',   color: 'hsl(239,84%,67%)' },
  interview_scheduled: { label: 'Interview',     color: 'hsl(262,83%,68%)' },
  interviewed:         { label: 'Interviewed',   color: 'hsl(262,83%,50%)' },
  offer_extended:      { label: 'Offer Out',     color: 'hsl(195,80%,55%)' },
  offer_accepted:      { label: 'Offer Accepted',color: 'hsl(142,71%,50%)' },
  offer_rejected:      { label: 'Offer Rejected',color: 'hsl(0,72%,60%)'   },
  hired:               { label: 'Hired',         color: 'hsl(142,71%,50%)' },
  rejected:            { label: 'Rejected',      color: 'hsl(0,72%,60%)'   },
  onboarding:          { label: 'Onboarding',    color: 'hsl(195,80%,55%)' },
}

function StageBadge({ stage }) {
  const cfg = STAGE_CONFIG[stage] || { label: stage, color: 'hsl(215,20%,55%)' }
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 20,
      fontSize: '0.72rem', fontWeight: 700,
      background: `${cfg.color}18`, color: cfg.color,
      whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  )
}

function ScoreBadge({ score }) {
  const s = Math.round(score || 0)
  const color = s >= 80 ? 'hsl(142,71%,50%)' : s >= 60 ? 'hsl(239,84%,67%)' : 'hsl(38,92%,55%)'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 44, height: 24, borderRadius: 20,
      fontSize: '0.72rem', fontWeight: 800,
      background: `${color}18`, color,
      border: `1px solid ${color}30`,
    }}>
      {s}%
    </span>
  )
}


// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CandidatesPage() {
  const navigate = useNavigate()
  const { role }  = useAuth()

  const [candidates,   setCandidates]   = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [search,       setSearch]       = useState('')
  const [stageFilter,  setStageFilter]  = useState('')
  const [page,         setPage]         = useState(1)
  const [totalPages,   setTotalPages]   = useState(1)

  // ── Schedule Interview modal state (HR Recruiter only) ──────────────────
  const [interviewCandidate, setInterviewCandidate] = useState(null)

  const PAGE_SIZE = 20

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchCandidates({
        stage: stageFilter || undefined,
        page,
        page_size: PAGE_SIZE,
      })
      const list = Array.isArray(res) ? res : (res.candidates || [])
      const total = res.total || list.length
      setCandidates(list)
      setTotalPages(Math.max(1, Math.ceil(total / PAGE_SIZE)))
    } catch (err) {
      setError(err.response?.data?.detail || err.message)
    }
    setLoading(false)
  }, [stageFilter, page])

  useEffect(() => { load() }, [load])

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1) }, [stageFilter, search])

  // Client-side search filter
  const filtered = candidates.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (c.candidate_name || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.job_title || '').toLowerCase().includes(q)
    )
  })

  const fieldStyle = {
    padding: '0.5rem 0.875rem',
    background: 'var(--clr-surface-2)',
    border: '1px solid var(--clr-border)',
    borderRadius: 8,
    color: 'var(--clr-text-1)',
    fontSize: '0.875rem',
    outline: 'none',
    fontFamily: 'inherit',
  }

  const hasFilters = search || stageFilter
  const clearFilters = () => { setSearch(''); setStageFilter('') }

  return (
    <>
    <div className="dash-page">

      {/* Header */}
      <div className="dash-page__header">
        <div>
          <h1 className="dash-page__title">Candidates</h1>
          <p className="dash-page__subtitle">
            {loading
              ? 'Loading…'
              : `${filtered.length} candidate${filtered.length !== 1 ? 's' : ''} found`}
          </p>
        </div>
        <button
          className="quick-action-btn"
          onClick={() => navigate('/resume-screening')}
        >
          🤖 AI Screen Resumes
        </button>
      </div>

      {error && <div className="dash-error">⚠️ {error}</div>}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input
          style={{ ...fieldStyle, minWidth: 240 }}
          placeholder="🔍 Search by name, email, or role…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          style={{ ...fieldStyle, cursor: 'pointer' }}
          value={stageFilter}
          onChange={e => setStageFilter(e.target.value)}
        >
          <option value="">All Stages</option>
          {Object.entries(STAGE_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
        {hasFilters && (
          <button
            onClick={clearFilters}
            style={{
              ...fieldStyle,
              cursor: 'pointer',
              color: 'hsl(0,72%,65%)',
              background: 'hsl(0,72%,60%,0.08)',
              border: '1px solid hsl(0,72%,60%,0.2)',
            }}
          >
            ✕ Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="dash-table-wrap">
        <div className="dash-table-wrap__header">
          <span className="dash-table-wrap__title">
            {loading
              ? 'Loading…'
              : `${filtered.length} candidate${filtered.length !== 1 ? 's' : ''}`}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--clr-text-3)' }}>
            Page {page} of {totalPages}
          </span>
        </div>

        {loading ? (
          <div style={{ padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="skeleton-pulse" style={{ height: '2.75rem', borderRadius: 6 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            illustration={search || stageFilter ? '🔍' : '📋'}
            title={search || stageFilter ? 'No candidates match your filters' : 'No candidates yet'}
            subtitle={
              search || stageFilter
                ? "Try adjusting your search or stage filter to find what you're looking for."
                : 'Candidates will appear here once resumes have been uploaded and screened via the AI Screening tool.'
            }
            actionLabel={search || stageFilter ? '✕ Clear Filters' : null}
            onAction={search || stageFilter ? clearFilters : null}
          />
        ) : (
          <table className="dash-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Applied For</th>
                <th>Stage</th>
                <th>AI Score</th>
                <th>Applied On</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr
                  key={c.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/pipeline`)}
                >
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg, hsl(239,84%,67%), hsl(262,83%,68%))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.8rem', fontWeight: 700, color: '#fff',
                      }}>
                        {(c.candidate_name || 'C')[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--clr-text-1)' }}>
                          {c.candidate_name || 'Unknown'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--clr-text-3)' }}>
                          {c.email || '—'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{
                      padding: '2px 10px', borderRadius: 20,
                      background: 'hsl(239,84%,67%,0.1)',
                      color: 'hsl(239,84%,67%)',
                      fontSize: '0.75rem', fontWeight: 600,
                    }}>
                      {c.job_title || '—'}
                    </span>
                  </td>
                  <td>
                    <StageBadge stage={c.status} />
                  </td>
                  <td>
                    <ScoreBadge score={c.ai_score} />
                  </td>
                  <td style={{ color: 'var(--clr-text-3)', fontSize: '0.82rem' }}>
                    {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td onClick={e => e.stopPropagation()} style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }}>
                      <button
                        onClick={() => navigate('/pipeline')}
                        style={{
                          padding: '4px 10px', borderRadius: 6,
                          border: '1px solid var(--clr-border)',
                          background: 'var(--clr-surface-2)',
                          color: 'var(--clr-text-2)',
                          fontSize: '0.75rem', cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        View in Pipeline
                      </button>

                      {/* ── Schedule Interview: HR Recruiter only ── */}
                      {role === 'hr_recruiter' && (
                        <button
                          id={`schedule-interview-btn-${c.id}`}
                          onClick={() => setInterviewCandidate(c)}
                          title="Schedule Interview"
                          style={{
                            padding: '4px 10px', borderRadius: 6,
                            border: '1px solid hsl(239,84%,67%,0.4)',
                            background: 'hsl(239,84%,67%,0.1)',
                            color: 'hsl(239,84%,67%)',
                            fontSize: '0.75rem', cursor: 'pointer',
                            fontWeight: 600, whiteSpace: 'nowrap',
                          }}
                        >
                          📅 Schedule
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 8, padding: '1rem',
            borderTop: '1px solid var(--clr-border)',
          }}>
            <button
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              style={{
                padding: '6px 14px', borderRadius: 8,
                border: '1px solid var(--clr-border)',
                background: 'var(--clr-surface-2)',
                color: page === 1 ? 'var(--clr-text-3)' : 'var(--clr-text-1)',
                fontSize: '0.85rem', fontWeight: 600,
                cursor: page === 1 ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              ← Prev
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const p = i + Math.max(1, page - 2)
              if (p > totalPages) return null
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    width: 36, height: 36, borderRadius: 8,
                    border: `1px solid ${p === page ? 'hsl(239,84%,67%)' : 'var(--clr-border)'}`,
                    background: p === page ? 'hsl(239,84%,67%,0.15)' : 'var(--clr-surface-2)',
                    color: p === page ? 'hsl(239,84%,67%)' : 'var(--clr-text-2)',
                    fontSize: '0.85rem', fontWeight: p === page ? 700 : 500,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {p}
                </button>
              )
            })}
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              style={{
                padding: '6px 14px', borderRadius: 8,
                border: '1px solid var(--clr-border)',
                background: 'var(--clr-surface-2)',
                color: page === totalPages ? 'var(--clr-text-3)' : 'var(--clr-text-1)',
                fontSize: '0.85rem', fontWeight: 600,
                cursor: page === totalPages ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Next →
            </button>
          </div>
        )}
      </div>

    </div>

    {/* ── Schedule Interview Modal (HR Recruiter only, mounts when a candidate is selected) ── */}
    {interviewCandidate && (
      <ScheduleInterviewModal
        candidate={interviewCandidate}
        onClose={() => setInterviewCandidate(null)}
      />
    )}
    </>
  )
}
