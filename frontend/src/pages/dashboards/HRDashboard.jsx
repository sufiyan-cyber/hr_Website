/**
 * HRDashboard — Phase 3
 *
 * Layout:
 *  • 4 KPI stat cards (resumes, screened, shortlisted, interviews)
 *  • Pipeline funnel bar chart (Recharts) + Recent candidates table
 *  • Quick action → Resume Screening
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'

import StatCard   from '@components/dashboard/StatCard'
import ChartPanel from '@components/dashboard/ChartPanel'
import { fetchHRDashboard } from '@services/dashboardService'

// ── Pipeline colours ──────────────────────────────────────────────────────────
const PIPELINE_COLORS = [
  'hsl(215,20%,55%)',
  'hsl(239,84%,67%)',
  'hsl(262,83%,68%)',
  'hsl(195,80%,55%)',
  'hsl(38,92%,55%)',
  'hsl(142,71%,50%)',
]

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--clr-surface-2)',
      border: '1px solid var(--clr-border)',
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: '0.8rem',
    }}>
      <p style={{ color: 'var(--clr-text-2)', marginBottom: 4, fontWeight: 600 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || 'var(--clr-text-1)', fontWeight: 700 }}>
          {p.value} candidates
        </p>
      ))}
    </div>
  )
}

// ── Status badge helper ───────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const label = status?.replace(/_/g, ' ') || 'screening'
  return <span className={`status-badge status-badge--${status}`}>{label}</span>
}

// ── Score display ─────────────────────────────────────────────────────────────
function ScoreDisplay({ score }) {
  const pct = Math.min(100, Math.max(0, Number(score) || 0))
  const color = pct >= 80 ? 'hsl(142,71%,50%)' : pct >= 60 ? 'hsl(239,84%,67%)' : 'hsl(38,92%,55%)'
  return (
    <div className="score-badge">
      <span style={{ color }}>{pct}%</span>
      <div className="score-badge__bar">
        <div className="score-badge__fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

export default function HRDashboard() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    fetchHRDashboard()
      .then(setData)
      .catch(err => setError(err.response?.data?.detail || err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="dash-page">

      {/* ── Header ── */}
      <div className="dash-page__header">
        <div>
          <h1 className="dash-page__title">HR Recruiter Dashboard</h1>
          <p className="dash-page__subtitle">Recruitment pipeline overview</p>
        </div>
        <Link to="/hr/screening" className="quick-action-btn">
          🤖 AI Resume Screening
        </Link>
      </div>

      {error && <div className="dash-error">⚠️ {error}</div>}

      {/* ── KPI Cards ── */}
      <div className="stat-grid">
        <StatCard
          label="Resumes This Week"
          value={loading ? '—' : data?.resumes_this_week}
          icon="📄"
          accent="primary"
          loading={loading}
        />
        <StatCard
          label="Candidates Screened"
          value={loading ? '—' : data?.screened_count}
          icon="🔍"
          accent="purple"
          loading={loading}
        />
        <StatCard
          label="Shortlisted"
          value={loading ? '—' : data?.shortlisted_count}
          icon="⭐"
          accent="warning"
          loading={loading}
        />
        <StatCard
          label="Interviews Scheduled"
          value={loading ? '—' : data?.interviews_count}
          icon="📅"
          accent="success"
          loading={loading}
        />
      </div>

      {/* ── Pipeline + Candidates ── */}
      <div className="dash-grid-2">

        {/* Pipeline Funnel Chart */}
        <ChartPanel
          title="Recruitment Pipeline"
          subtitle="Candidates by current stage"
          loading={loading}
          minHeight="280px"
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={data?.pipeline_stages || []}
              layout="vertical"
              margin={{ top: 4, right: 24, left: 10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--clr-border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--clr-text-3)' }} />
              <YAxis
                type="category"
                dataKey="stage"
                width={80}
                tick={{ fontSize: 11, fill: 'var(--clr-text-2)' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {(data?.pipeline_stages || []).map((_, i) => (
                  <Cell key={i} fill={PIPELINE_COLORS[i % PIPELINE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        {/* Recent Candidates Table */}
        <div className="dash-table-wrap">
          <div className="dash-table-wrap__header">
            <span className="dash-table-wrap__title">Recent Candidates</span>
          </div>
          {loading ? (
            <div style={{ padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1,2,3,4,5].map(i => (
                <div key={i} className="skeleton-pulse" style={{ height: '2rem', borderRadius: 6 }} />
              ))}
            </div>
          ) : (
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>AI Score</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(data?.recent_candidates || []).map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--clr-text-1)' }}>{c.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--clr-text-3)' }}>{c.email}</div>
                    </td>
                    <td><ScoreDisplay score={c.score} /></td>
                    <td><StatusBadge status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>

    </div>
  )
}
