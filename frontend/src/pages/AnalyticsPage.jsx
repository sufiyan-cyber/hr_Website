/**
 * AnalyticsPage — Admin Analytics Dashboard
 * Uses real data from the admin dashboard API endpoint.
 * Shows 0s and empty charts when DB has no data.
 */

import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { fetchAdminDashboard } from '@services/dashboardService'
import StatCard   from '@components/dashboard/StatCard'
import ChartPanel from '@components/dashboard/ChartPanel'

const PIE_COLORS = [
  'hsl(239,84%,67%)', 'hsl(262,83%,68%)', 'hsl(195,80%,55%)',
  'hsl(38,92%,55%)',  'hsl(142,71%,50%)',
]

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--clr-surface-2)', border: '1px solid var(--clr-border)',
      borderRadius: 8, padding: '8px 12px', fontSize: '0.8rem',
    }}>
      <p style={{ color: 'var(--clr-text-2)', marginBottom: 4, fontWeight: 600 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || 'var(--clr-text-1)', fontWeight: 700 }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

function timeAgo(iso) {
  if (!iso) return 'just now'
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return `${Math.round(diff)}s ago`
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`
  return `${Math.round(diff / 86400)}d ago`
}

function EmptyChart({ message = 'No data yet' }) {
  return (
    <div style={{
      height: 200, display: 'flex', alignItems: 'center',
      justifyContent: 'center', color: 'var(--clr-text-3)', fontSize: '0.875rem',
    }}>
      {message}
    </div>
  )
}

export default function AnalyticsPage() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    fetchAdminDashboard()
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
          <h1 className="dash-page__title">Analytics & Reports</h1>
          <p className="dash-page__subtitle">{today}</p>
        </div>
      </div>

      {error && <div className="dash-error">⚠️ {error}</div>}

      {/* ── KPI Cards ── */}
      <div className="stat-grid">
        <StatCard
          label="Total Employees"
          value={loading ? '—' : (data?.total_employees ?? 0)}
          icon="👥" accent="primary"
          trend="Active headcount from DB"
          loading={loading}
        />
        <StatCard
          label="Total Applicants"
          value={loading ? '—' : (data?.total_applicants ?? 0)}
          icon="📋" accent="purple"
          trend="All-time candidates"
          loading={loading}
        />
        <StatCard
          label="Open Positions"
          value={loading ? '—' : (data?.open_positions ?? 0)}
          icon="💼" accent="warning"
          trend="Active job postings"
          loading={loading}
        />
        <StatCard
          label="Hired This Month"
          value={loading ? '—' : (data?.hired_this_month ?? 0)}
          icon="🎯" accent="success"
          trend="New hires this month"
          loading={loading}
        />
      </div>

      {/* ── Charts Row 1 ── */}
      <div className="dash-grid-2">

        <ChartPanel
          title="Employees by Department"
          subtitle="Current headcount distribution"
          loading={loading}
          minHeight="260px"
        >
          {(data?.department_chart || []).length === 0 ? (
            <EmptyChart message="No employees in the DB yet" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.department_chart} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--clr-border)" />
                <XAxis dataKey="department" tick={{ fontSize: 11, fill: 'var(--clr-text-3)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--clr-text-3)' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Employees" radius={[4,4,0,0]} fill="url(#barGrad)" />
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="hsl(239,84%,67%)" />
                    <stop offset="100%" stopColor="hsl(262,83%,68%)" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartPanel>

        <ChartPanel
          title="Hiring Trend"
          subtitle="Candidates over last 6 months"
          loading={loading}
          minHeight="260px"
        >
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data?.monthly_trend || []} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--clr-border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--clr-text-3)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--clr-text-3)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone" dataKey="candidates" name="Candidates"
                stroke="hsl(239,84%,67%)" strokeWidth={2.5}
                dot={{ fill: 'hsl(239,84%,67%)', r: 4 }}
                activeDot={{ r: 6, fill: 'hsl(262,83%,68%)' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>

      </div>

      {/* ── Charts Row 2 ── */}
      <div className="dash-grid-3">

        <ChartPanel
          title="Top Skills in Demand"
          subtitle="Extracted from job descriptions"
          loading={loading}
          minHeight="280px"
        >
          {(data?.skills_chart || []).length === 0 ? (
            <EmptyChart message="No job descriptions posted yet" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={data.skills_chart}
                  dataKey="count" nameKey="skill"
                  cx="50%" cy="50%"
                  innerRadius={60} outerRadius={100}
                  paddingAngle={3}
                >
                  {data.skills_chart.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val, name) => [val, name]}
                  contentStyle={{
                    background: 'var(--clr-surface-2)',
                    border: '1px solid var(--clr-border)',
                    borderRadius: 8, fontSize: '0.8rem',
                  }}
                />
                <Legend
                  iconType="circle" iconSize={8}
                  formatter={v => <span style={{ color: 'var(--clr-text-2)', fontSize: '0.78rem' }}>{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartPanel>

        {/* Activity feed */}
        <div className="activity-feed">
          <div className="activity-feed__header">Recent Activity</div>
          {loading ? (
            <div style={{ padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1,2,3,4,5].map(i => (
                <div key={i} className="skeleton-pulse" style={{ height: '0.85rem', borderRadius: 6 }} />
              ))}
            </div>
          ) : (data?.activity_feed || []).length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--clr-text-3)', fontSize: '0.875rem' }}>
              No activity yet
            </div>
          ) : (
            <ul className="activity-feed__list">
              {data.activity_feed.map((item, i) => (
                <li key={i} className="activity-item">
                  <span className={`activity-item__dot activity-item__dot--${item.type}`} />
                  <span className="activity-item__text">{item.event}</span>
                  <span className="activity-item__time">{timeAgo(item.time)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>

    </div>
  )
}
