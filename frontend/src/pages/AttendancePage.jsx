/**
 * AttendancePage — Employee Attendance View
 * Shows real attendance data from DB. Empty state if no records exist.
 */

import { useEffect, useState } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { fetchMyAttendance, fetchAttendanceSummary } from '@services/attendanceService'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

const STATUS_COLORS = {
  present:  { bg: 'hsl(142,71%,50%,0.15)', text: 'hsl(142,71%,40%)', label: 'Present' },
  absent:   { bg: 'hsl(0,72%,60%,0.15)',   text: 'hsl(0,72%,50%)',   label: 'Absent'  },
  leave:    { bg: 'hsl(38,92%,55%,0.15)',  text: 'hsl(38,92%,45%)',  label: 'Leave'   },
  half_day: { bg: 'hsl(195,80%,55%,0.15)', text: 'hsl(195,80%,45%)', label: 'Half Day'},
  holiday:  { bg: 'hsl(262,83%,68%,0.15)', text: 'hsl(262,83%,55%)', label: 'Holiday' },
}

const DONUT_COLORS = ['hsl(142,71%,50%)', 'hsl(0,72%,60%)', 'hsl(38,92%,55%)']

function StatusBadge({ status }) {
  const cfg = STATUS_COLORS[status] || STATUS_COLORS.absent
  return (
    <span style={{
      padding: '2px 12px', borderRadius: 20,
      background: cfg.bg, color: cfg.text,
      fontSize: '0.75rem', fontWeight: 700,
      textTransform: 'capitalize',
    }}>
      {cfg.label}
    </span>
  )
}

function EmptyState() {
  return (
    <div style={{
      textAlign: 'center', padding: '4rem 2rem',
      color: 'var(--clr-text-3)',
    }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--clr-text-2)', marginBottom: 8 }}>
        No Attendance Records Yet
      </div>
      <div style={{ fontSize: '0.875rem' }}>
        Your attendance will appear here once records are logged by HR or the attendance system.
      </div>
    </div>
  )
}

export default function AttendancePage() {
  const now = new Date()
  const [year,  setYear]    = useState(now.getFullYear())
  const [month, setMonth]   = useState(now.getMonth() + 1)
  const [data,  setData]    = useState(null)
  const [trend, setTrend]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,  setError]  = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      fetchMyAttendance(year, month),
      fetchAttendanceSummary(),
    ])
      .then(([att, sum]) => { setData(att); setTrend(sum) })
      .catch(err => setError(err.response?.data?.detail || err.message))
      .finally(() => setLoading(false))
  }, [year, month])

  const summary = data?.summary || {}
  const records = data?.records || []
  const hasRecords = data?.has_records || false
  const pct = summary.attendance_pct || 0

  const donutData = [
    { name: 'Present', value: summary.present || 0 },
    { name: 'Absent',  value: summary.absent  || 0 },
    { name: 'Leave',   value: summary.leave   || 0 },
  ]

  const trendData = (trend?.trend || [])

  return (
    <div className="dash-page">

      {/* ── Header ── */}
      <div className="dash-page__header">
        <div>
          <h1 className="dash-page__title">My Attendance</h1>
          <p className="dash-page__subtitle">Monthly attendance records and summary</p>
        </div>

        {/* Month / Year picker */}
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            className="form-input form-input--no-icon"
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            style={{ width: 130 }}
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            className="form-input form-input--no-icon"
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            style={{ width: 90 }}
          >
            {[2024, 2025, 2026].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
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
          {/* ── Stat Cards ── */}
          <div className="stat-grid stat-grid--3">
            {[
              { label: 'Days Present', value: summary.present || 0,  icon: '✅', accent: 'success' },
              { label: 'Days Absent',  value: summary.absent  || 0,  icon: '❌', accent: 'danger'  },
              { label: 'Days on Leave',value: summary.leave   || 0,  icon: '🏖️', accent: 'warning' },
            ].map(c => (
              <div key={c.label} className={`stat-card stat-card--${c.accent}`}>
                <div className="stat-card__icon-wrap"><span className="stat-card__icon">{c.icon}</span></div>
                <div className="stat-card__body">
                  <div className="stat-card__value">{c.value}</div>
                  <div className="stat-card__label">{c.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Donut + Trend ── */}
          <div className="dash-grid-2">

            <div className="chart-panel">
              <div className="chart-panel__header">
                <div>
                  <h3 className="chart-panel__title">Attendance Breakdown</h3>
                  <p className="chart-panel__subtitle">{data?.month_label}</p>
                </div>
              </div>
              <div className="chart-panel__body" style={{ position: 'relative' }}>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%" cy="50%"
                      innerRadius={60} outerRadius={90}
                      paddingAngle={3}
                    >
                      {donutData.map((_, i) => (
                        <Cell key={i} fill={DONUT_COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val, name) => [`${val} days`, name]}
                      contentStyle={{
                        background: 'var(--clr-surface-2)',
                        border: '1px solid var(--clr-border)',
                        borderRadius: 8, fontSize: '0.8rem',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Centre label */}
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -58%)',
                  textAlign: 'center', pointerEvents: 'none',
                }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'hsl(142,71%,50%)' }}>
                    {pct}%
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--clr-text-3)' }}>Present</div>
                </div>
              </div>
            </div>

            <div className="chart-panel">
              <div className="chart-panel__header">
                <div>
                  <h3 className="chart-panel__title">6-Month Trend</h3>
                  <p className="chart-panel__subtitle">Monthly attendance percentage</p>
                </div>
              </div>
              <div className="chart-panel__body">
                {trendData.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--clr-text-3)', paddingTop: '2rem', fontSize: '0.875rem' }}>
                    No historical data yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={trendData} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--clr-border)" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--clr-text-3)' }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--clr-text-3)' }} unit="%" />
                      <Tooltip
                        formatter={val => [`${val}%`, 'Attendance']}
                        contentStyle={{
                          background: 'var(--clr-surface-2)',
                          border: '1px solid var(--clr-border)',
                          borderRadius: 8, fontSize: '0.8rem',
                        }}
                      />
                      <Bar dataKey="pct" name="Attendance" radius={[4,4,0,0]} fill="hsl(239,84%,67%)" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

          </div>

          {/* ── Records Table ── */}
          <div className="dash-table-wrap">
            <div className="dash-table-wrap__header">
              <span className="dash-table-wrap__title">Daily Records — {data?.month_label}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--clr-text-3)' }}>
                {records.length} entries
              </span>
            </div>
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Status</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => {
                  const d = new Date(r.date)
                  return (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{r.date}</td>
                      <td style={{ color: 'var(--clr-text-3)', fontSize: '0.82rem' }}>
                        {d.toLocaleDateString('en-US', { weekday: 'short' })}
                      </td>
                      <td><StatusBadge status={r.status} /></td>
                      <td style={{ color: 'var(--clr-text-2)', fontSize: '0.85rem' }}>
                        {r.check_in || '—'}
                      </td>
                      <td style={{ color: 'var(--clr-text-2)', fontSize: '0.85rem' }}>
                        {r.check_out || '—'}
                      </td>
                      <td style={{ color: 'var(--clr-text-3)', fontSize: '0.8rem', maxWidth: 180 }}>
                        {r.notes || '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

    </div>
  )
}
