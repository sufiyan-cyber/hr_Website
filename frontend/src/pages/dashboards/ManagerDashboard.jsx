/**
 * ManagerDashboard — Phase 3
 *
 * Layout:
 *  • Header + date greeting
 *  • 3 KPI stat cards (team size, pending approvals, avg performance)
 *  • Bar chart (team performance) + Pending approvals list
 *  • Team members table with performance scores
 */

import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'

import StatCard   from '@components/dashboard/StatCard'
import ChartPanel from '@components/dashboard/ChartPanel'
import { fetchManagerDashboard } from '@services/dashboardService'

// ── Performance bar colours ───────────────────────────────────────────────────
const PERF_COLORS = [
  'hsl(239,84%,67%)',
  'hsl(262,83%,68%)',
  'hsl(195,80%,55%)',
  'hsl(38,92%,55%)',
  'hsl(142,71%,50%)',
  'hsl(340,82%,62%)',
]

// ── Approval type icons ───────────────────────────────────────────────────────
const APPROVAL_ICONS = {
  'Leave Request':   '🏖️',
  'Overtime Claim':  '⏱️',
  'Equipment Order': '💻',
}

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
          Score: {p.value}
        </p>
      ))}
    </div>
  )
}

// ── Performance score display ─────────────────────────────────────────────────
function ScoreBar({ score }) {
  const pct = Math.min(100, Math.max(0, (Number(score) / 5) * 100))
  const color =
    pct >= 80 ? 'hsl(142,71%,50%)' :
    pct >= 60 ? 'hsl(239,84%,67%)' :
    'hsl(38,92%,55%)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color, fontWeight: 700, minWidth: 28, fontSize: '0.85rem' }}>
        {Number(score).toFixed(1)}
      </span>
      <div style={{
        flex: 1,
        height: 6,
        borderRadius: 3,
        background: 'var(--clr-surface-3)',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: color,
          borderRadius: 3,
          transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  )
}

// ── Approval badge ────────────────────────────────────────────────────────────
function ApprovalCard({ approval }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '0.75rem 1rem',
      borderRadius: 10,
      background: 'var(--clr-surface-2)',
      border: '1px solid var(--clr-border)',
      transition: 'background 0.2s',
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--clr-surface-3)'}
      onMouseLeave={e => e.currentTarget.style.background = 'var(--clr-surface-2)'}
    >
      <span style={{ fontSize: '1.4rem' }}>
        {APPROVAL_ICONS[approval.type] || '📋'}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--clr-text-1)' }}>
          {approval.type}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-3)', marginTop: 2 }}>
          {approval.from} · {approval.detail}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--clr-text-3)' }}>{approval.date}</div>
        <div style={{ marginTop: 4, display: 'flex', gap: 6 }}>
          <button style={{
            padding: '2px 10px',
            borderRadius: 5,
            border: 'none',
            background: 'hsl(142,71%,50%)',
            color: '#fff',
            fontSize: '0.7rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}>✓</button>
          <button style={{
            padding: '2px 10px',
            borderRadius: 5,
            border: 'none',
            background: 'hsl(0,72%,60%)',
            color: '#fff',
            fontSize: '0.7rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}>✗</button>
        </div>
      </div>
    </div>
  )
}

export default function ManagerDashboard() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    fetchManagerDashboard()
      .then(setData)
      .catch(err => setError(err.response?.data?.detail || err.message))
      .finally(() => setLoading(false))
  }, [])

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="dash-page">

      {/* ── Header ── */}
      <div className="dash-page__header">
        <div>
          <h1 className="dash-page__title">Manager Dashboard</h1>
          <p className="dash-page__subtitle">{today}</p>
        </div>
      </div>

      {error && <div className="dash-error">⚠️ {error}</div>}

      {/* ── KPI Cards ── */}
      <div className="stat-grid stat-grid--3">
        <StatCard
          label="Team Size"
          value={loading ? '—' : data?.team_size}
          icon="👥"
          accent="primary"
          trend="Direct reports"
          loading={loading}
        />
        <StatCard
          label="Pending Approvals"
          value={loading ? '—' : data?.pending_approvals}
          icon="⏳"
          accent="warning"
          trend="Awaiting action"
          loading={loading}
        />
        <StatCard
          label="Avg Performance"
          value={loading ? '—' : `${data?.avg_performance ?? '—'} / 5`}
          icon="🏆"
          accent="success"
          trend="Team average score"
          loading={loading}
        />
      </div>

      {/* ── Chart + Approvals ── */}
      <div className="dash-grid-2">

        {/* Team Performance Bar Chart */}
        <ChartPanel
          title="Team Performance Comparison"
          subtitle="Individual scores out of 5.0"
          loading={loading}
          minHeight="280px"
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={data?.team_members || []}
              margin={{ top: 4, right: 16, left: -10, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--clr-border)" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: 'var(--clr-text-3)' }}
                angle={-30}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                domain={[0, 5]}
                tick={{ fontSize: 11, fill: 'var(--clr-text-3)' }}
                ticks={[0, 1, 2, 3, 4, 5]}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={data?.avg_performance || 4}
                stroke="hsl(38,92%,55%)"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: 'Avg',
                  position: 'right',
                  fill: 'hsl(38,92%,55%)',
                  fontSize: 10,
                }}
              />
              <Bar dataKey="score" name="Score" radius={[4, 4, 0, 0]}>
                {(data?.team_members || []).map((_, i) => (
                  <Cell key={i} fill={PERF_COLORS[i % PERF_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        {/* Pending Approvals List */}
        <div className="chart-panel">
          <div className="chart-panel__header">
            <div>
              <h3 className="chart-panel__title">Pending Approvals</h3>
              <p className="chart-panel__subtitle">Requests awaiting your action</p>
            </div>
          </div>
          <div className="chart-panel__body" style={{ minHeight: '280px' }}>
            {loading ? (
              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1, 2, 3].map(i => (
                  <div key={i} className="skeleton-pulse" style={{ height: '4rem', borderRadius: 10 }} />
                ))}
              </div>
            ) : (
              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(data?.approvals_list || []).length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    color: 'var(--clr-text-3)',
                    padding: '2rem 0',
                    fontSize: '0.9rem',
                  }}>
                    🎉 No pending approvals
                  </div>
                ) : (
                  (data?.approvals_list || []).map(a => (
                    <ApprovalCard key={a.id} approval={a} />
                  ))
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── Team Members Table ── */}
      <div className="dash-table-wrap">
        <div className="dash-table-wrap__header">
          <span className="dash-table-wrap__title">Team Members</span>
        </div>
        {loading ? (
          <div style={{ padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="skeleton-pulse" style={{ height: '2.25rem', borderRadius: 6 }} />
            ))}
          </div>
        ) : (
          <table className="dash-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Department</th>
                <th>Performance Score</th>
              </tr>
            </thead>
            <tbody>
              {(data?.team_members || []).map(member => (
                <tr key={member.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: 'linear-gradient(135deg, hsl(239,84%,67%), hsl(262,83%,68%))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.8rem', fontWeight: 700, color: '#fff', flexShrink: 0,
                      }}>
                        {(member.name || 'U')[0].toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 600, color: 'var(--clr-text-1)' }}>
                        {member.name}
                      </span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--clr-text-2)', fontSize: '0.85rem' }}>{member.role}</td>
                  <td>
                    <span style={{
                      padding: '2px 10px',
                      borderRadius: 20,
                      background: 'hsl(239,84%,67%,0.12)',
                      color: 'hsl(239,84%,67%)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}>
                      {member.department}
                    </span>
                  </td>
                  <td style={{ minWidth: 160 }}>
                    <ScoreBar score={member.score} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  )
}
