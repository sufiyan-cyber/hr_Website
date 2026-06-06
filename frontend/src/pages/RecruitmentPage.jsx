/**
 * RecruitmentPage — Job Postings List (HR + Admin)
 * Shows all job descriptions with candidate count. Links to JobDetailPage.
 * Empty state when no jobs have been posted yet.
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchJobs } from '@services/recruitmentService'

function timeAgo(iso) {
  if (!iso) return '—'
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`
  if (diff < 30 * 86400) return `${Math.round(diff / 86400)}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function JobCard({ job }) {
  return (
    <Link
      to={`/recruitment/${job.id}`}
      style={{ textDecoration: 'none', display: 'block' }}
    >
      <div style={{
        background: 'var(--clr-surface-1)', border: '1px solid var(--clr-border)',
        borderRadius: 14, padding: '1.25rem 1.5rem',
        transition: 'border-color 0.2s, transform 0.15s, box-shadow 0.2s',
        cursor: 'pointer',
      }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'hsl(239,84%,67%,0.5)'
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = '0 8px 24px hsl(239,84%,67%,0.1)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--clr-border)'
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = 'none'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--clr-text-1)', marginBottom: 4 }}>
              {job.title}
            </div>
            {job.description && (
              <div style={{ fontSize: '0.82rem', color: 'var(--clr-text-3)', lineHeight: 1.5, marginBottom: 10 }}>
                {job.description}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{
                padding: '3px 12px', borderRadius: 20,
                background: 'hsl(239,84%,67%,0.12)', color: 'hsl(239,84%,67%)',
                fontSize: '0.75rem', fontWeight: 700,
              }}>
                {job.candidate_count} candidate{job.candidate_count !== 1 ? 's' : ''}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--clr-text-3)' }}>
                Posted {timeAgo(job.created_at)}
              </span>
            </div>
          </div>
          <div style={{
            flexShrink: 0, width: 40, height: 40, borderRadius: '50%',
            background: 'linear-gradient(135deg, hsl(239,84%,67%), hsl(262,83%,68%))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.1rem',
          }}>
            💼
          </div>
        </div>
      </div>
    </Link>
  )
}

export default function RecruitmentPage() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [search,  setSearch]  = useState('')

  useEffect(() => {
    fetchJobs()
      .then(setData)
      .catch(err => setError(err.response?.data?.detail || err.message))
      .finally(() => setLoading(false))
  }, [])

  const jobs = (data?.jobs || []).filter(j =>
    !search || j.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="dash-page">

      {/* ── Header ── */}
      <div className="dash-page__header">
        <div>
          <h1 className="dash-page__title">Job Postings</h1>
          <p className="dash-page__subtitle">
            {loading ? '…' : `${data?.total ?? 0} active posting${data?.total !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/hr/screening" className="quick-action-btn">
            🤖 AI Resume Screening
          </Link>
        </div>
      </div>

      {error && <div className="dash-error">⚠️ {error}</div>}

      {/* ── Search ── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <input
          className="form-input form-input--no-icon"
          placeholder="🔍 Search job titles…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', maxWidth: 400 }}
        />
      </div>

      {/* ── Stats Row ── */}
      <div className="stat-grid stat-grid--3" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card stat-card--primary">
          <div className="stat-card__icon-wrap"><span className="stat-card__icon">💼</span></div>
          <div className="stat-card__body">
            <div className="stat-card__value">{loading ? '—' : data?.total ?? 0}</div>
            <div className="stat-card__label">Total Positions</div>
          </div>
        </div>
        <div className="stat-card stat-card--purple">
          <div className="stat-card__icon-wrap"><span className="stat-card__icon">👥</span></div>
          <div className="stat-card__body">
            <div className="stat-card__value">
              {loading ? '—' : (data?.jobs || []).reduce((s, j) => s + j.candidate_count, 0)}
            </div>
            <div className="stat-card__label">Total Candidates</div>
          </div>
        </div>
        <div className="stat-card stat-card--success">
          <div className="stat-card__icon-wrap"><span className="stat-card__icon">📋</span></div>
          <div className="stat-card__body">
            <div className="stat-card__value">
              {loading ? '—' : (data?.jobs || []).filter(j => j.candidate_count > 0).length}
            </div>
            <div className="stat-card__label">Positions with Applicants</div>
          </div>
        </div>
      </div>

      {/* ── Job Cards ── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton-pulse" style={{ height: 110, borderRadius: 14 }} />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="chart-panel">
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--clr-text-3)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💼</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--clr-text-2)', marginBottom: 8 }}>
              {search ? 'No matching job postings' : 'No Job Postings Yet'}
            </div>
            <div style={{ fontSize: '0.875rem' }}>
              {search
                ? 'Try a different search term.'
                : 'Use the AI Resume Screening tool to upload job descriptions and resumes.'}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {jobs.map(j => <JobCard key={j.id} job={j} />)}
        </div>
      )}

    </div>
  )
}
