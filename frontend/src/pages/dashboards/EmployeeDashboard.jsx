/**
 * EmployeeDashboard — Phase 3
 *
 * Layout:
 *  • Header greeting with employee name
 *  • Profile card (name, role, department, joining date)
 *  • Attendance donut chart (Recharts) + Payroll status card + Performance score card
 *  • Onboarding checklist
 */

import { useEffect, useState } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

import StatCard   from '@components/dashboard/StatCard'
import ChartPanel from '@components/dashboard/ChartPanel'
import { fetchEmployeeDashboard } from '@services/dashboardService'

// ── Donut chart colours ───────────────────────────────────────────────────────
const ATTENDANCE_COLORS = [
  'hsl(142,71%,50%)',  // present — green
  'hsl(0,72%,60%)',    // absent  — red
  'hsl(38,92%,55%)',   // leave   — yellow
]

// ── Star rating display ───────────────────────────────────────────────────────
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
            : (i === full + 1 && half)
              ? 'hsl(38,92%,55%)'
              : 'var(--clr-surface-3)',
          opacity: i === full + 1 && half ? 0.6 : 1,
        }}>★</span>
      ))}
      <span style={{ marginLeft: 6, fontWeight: 700, color: 'hsl(38,92%,55%)', fontSize: '0.9rem' }}>
        {Number(score).toFixed(1)}
      </span>
    </div>
  )
}

// ── Payroll status badge ──────────────────────────────────────────────────────
function PayrollStatusBadge({ status }) {
  const isProcessed = status === 'Processed'
  return (
    <span style={{
      padding: '3px 12px',
      borderRadius: 20,
      fontSize: '0.75rem',
      fontWeight: 700,
      background: isProcessed ? 'hsl(142,71%,50%,0.15)' : 'hsl(38,92%,55%,0.15)',
      color: isProcessed ? 'hsl(142,71%,45%)' : 'hsl(38,92%,50%)',
    }}>
      {isProcessed ? '✓ Processed' : '⏳ Pending'}
    </span>
  )
}

// ── Custom Donut Tooltip ──────────────────────────────────────────────────────
function DonutTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--clr-surface-2)',
      border: '1px solid var(--clr-border)',
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: '0.8rem',
    }}>
      <p style={{ color: payload[0].payload.fill, fontWeight: 700 }}>
        {payload[0].name}: {payload[0].value} days
      </p>
    </div>
  )
}

// ── Onboarding task item ──────────────────────────────────────────────────────
function TaskItem({ task }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '0.65rem 0',
      borderBottom: '1px solid var(--clr-border)',
    }}>
      <div style={{
        width: 22,
        height: 22,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: task.done
          ? 'hsl(142,71%,50%)'
          : 'var(--clr-surface-3)',
        border: task.done
          ? 'none'
          : '2px solid var(--clr-border)',
        transition: 'all 0.2s',
      }}>
        {task.done && (
          <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 700 }}>✓</span>
        )}
      </div>
      <span style={{
        fontSize: '0.875rem',
        color: task.done ? 'var(--clr-text-3)' : 'var(--clr-text-1)',
        textDecoration: task.done ? 'line-through' : 'none',
        transition: 'color 0.2s',
      }}>
        {task.task}
      </span>
      {task.done && (
        <span style={{
          marginLeft: 'auto',
          fontSize: '0.7rem',
          color: 'hsl(142,71%,50%)',
          fontWeight: 600,
        }}>Done</span>
      )}
    </div>
  )
}

export default function EmployeeDashboard() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    fetchEmployeeDashboard()
      .then(setData)
      .catch(err => setError(err.response?.data?.detail || err.message))
      .finally(() => setLoading(false))
  }, [])

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const attendance = data?.attendance || { present: 0, absent: 0, leave: 0, working_days: 0, has_records: false }
  const attendanceChart = [
    { name: 'Present', value: attendance.present },
    { name: 'Absent',  value: attendance.absent },
    { name: 'Leave',   value: attendance.leave },
  ]
  const attendancePct = attendance.has_records && attendance.working_days > 0
    ? Math.round((attendance.present / attendance.working_days) * 100)
    : 0
  const hasAttendance = attendance.has_records

  const payrollHasRecords = data?.payroll?.has_records || false
  const perfHasRecords    = data?.performance?.has_records || false

  const completedTasks = (data?.onboarding_tasks || []).filter(t => t.done).length
  const totalTasks = (data?.onboarding_tasks || []).length

  return (
    <div className="dash-page">

      {/* ── Header ── */}
      <div className="dash-page__header">
        <div>
          <h1 className="dash-page__title">
            Welcome back, {loading ? '…' : data?.profile?.name?.split(' ')[0] || 'Employee'} 👋
          </h1>
          <p className="dash-page__subtitle">{today}</p>
        </div>
      </div>

      {error && <div className="dash-error">⚠️ {error}</div>}

      {/* ── Profile Card (full width) ── */}
      {loading ? (
        <div className="skeleton-pulse" style={{ height: '100px', borderRadius: 14, marginBottom: '1.5rem' }} />
      ) : (
        <div style={{
          background: 'linear-gradient(135deg, hsl(239,84%,67%,0.12), hsl(262,83%,68%,0.08))',
          border: '1px solid hsl(239,84%,67%,0.25)',
          borderRadius: 14,
          padding: '1.25rem 1.75rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          flexWrap: 'wrap',
        }}>
          {/* Avatar */}
          <div style={{
            width: 60, height: 60, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, hsl(239,84%,67%), hsl(262,83%,68%))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', fontWeight: 700, color: '#fff',
            boxShadow: '0 0 0 4px hsl(239,84%,67%,0.2)',
          }}>
            {(data?.profile?.name || 'E')[0].toUpperCase()}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--clr-text-1)' }}>
              {data?.profile?.name}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--clr-text-2)', marginTop: 3 }}>
              {data?.profile?.role} · {data?.profile?.department}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--clr-text-3)', marginTop: 2 }}>
              {data?.profile?.email}
            </div>
          </div>

          {/* Meta chips */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div style={{
              padding: '6px 14px', borderRadius: 20,
              background: 'var(--clr-surface-2)',
              border: '1px solid var(--clr-border)',
              fontSize: '0.78rem', color: 'var(--clr-text-2)',
            }}>
              📅 Joined {data?.profile?.joining_date}
            </div>
            <div style={{
              padding: '6px 14px', borderRadius: 20,
              background: 'hsl(142,71%,50%,0.12)',
              border: '1px solid hsl(142,71%,50%,0.25)',
              fontSize: '0.78rem', color: 'hsl(142,71%,45%)',
              fontWeight: 600,
            }}>
              ✓ Active
            </div>
          </div>
        </div>
      )}

      {/* ── Quick Stats Row ── */}
      <div className="stat-grid stat-grid--3">
        <StatCard
          label="Attendance This Month"
          value={loading ? '—' : (hasAttendance ? `${attendancePct}%` : '—')}
          icon="📅"
          accent="primary"
          trend={hasAttendance
            ? `${attendance.present} / ${attendance.working_days} days present`
            : 'No attendance records yet'}
          loading={loading}
        />
        <StatCard
          label="Payroll Status"
          value={loading ? '—' : (payrollHasRecords ? data?.payroll?.status : '—')}
          icon="💰"
          accent="success"
          trend={payrollHasRecords
            ? `${data?.payroll?.month || ''} · ${data?.payroll?.amount || ''}`
            : 'No payroll records yet'}
          loading={loading}
        />
        <StatCard
          label="Performance Score"
          value={loading ? '—' : (perfHasRecords ? `${data?.performance?.score ?? '—'} / 5` : '—')}
          icon="⭐"
          accent="warning"
          trend={perfHasRecords ? (data?.performance?.rating || '') : 'No reviews yet'}
          loading={loading}
        />
      </div>

      {/* ── Attendance Donut + Payroll Detail + Performance Detail ── */}
      <div className="dash-grid-2">

        {/* Attendance Donut Chart */}
        <ChartPanel
          title="Attendance Breakdown"
          subtitle={`${new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}`}
          loading={loading}
          minHeight="280px"
        >
          <div style={{ position: 'relative' }}>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={attendanceChart}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={3}
                  startAngle={90}
                  endAngle={-270}
                >
                  {attendanceChart.map((_, i) => (
                    <Cell key={i} fill={ATTENDANCE_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip content={<DonutTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(v) => (
                    <span style={{ color: 'var(--clr-text-2)', fontSize: '0.78rem' }}>{v}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Centre label */}
            <div style={{
              position: 'absolute',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -56%)',
              textAlign: 'center',
              pointerEvents: 'none',
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'hsl(142,71%,50%)' }}>
                {attendancePct}%
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--clr-text-3)', marginTop: 2 }}>
                Present
              </div>
            </div>
          </div>
        </ChartPanel>

        {/* Right column: Payroll + Performance stacked */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Payroll card */}
          <div className="chart-panel" style={{ flex: 1 }}>
            <div className="chart-panel__header">
              <h3 className="chart-panel__title">Latest Payroll</h3>
            </div>
            <div className="chart-panel__body" style={{ minHeight: 'unset', padding: '0 1.5rem 1.5rem' }}>
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} className="skeleton-pulse" style={{ height: '1.2rem', borderRadius: 5 }} />
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--clr-text-3)', fontSize: '0.82rem' }}>Month</span>
                    <span style={{ fontWeight: 600, color: 'var(--clr-text-1)', fontSize: '0.9rem' }}>
                      {data?.payroll?.month}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--clr-text-3)', fontSize: '0.82rem' }}>Amount</span>
                    <span style={{ fontWeight: 800, color: 'hsl(142,71%,50%)', fontSize: '1.1rem' }}>
                      {data?.payroll?.amount}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--clr-text-3)', fontSize: '0.82rem' }}>Paid On</span>
                    <span style={{ fontWeight: 600, color: 'var(--clr-text-2)', fontSize: '0.85rem' }}>
                      {data?.payroll?.paid_on}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--clr-text-3)', fontSize: '0.82rem' }}>Status</span>
                    <PayrollStatusBadge status={data?.payroll?.status} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Performance card */}
          <div className="chart-panel" style={{ flex: 1 }}>
            <div className="chart-panel__header">
              <h3 className="chart-panel__title">Latest Performance Review</h3>
            </div>
            <div className="chart-panel__body" style={{ minHeight: 'unset', padding: '0 1.5rem 1.5rem' }}>
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[1, 2].map(i => (
                    <div key={i} className="skeleton-pulse" style={{ height: '1.2rem', borderRadius: 5 }} />
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--clr-text-3)', fontSize: '0.82rem' }}>Quarter</span>
                    <span style={{ fontWeight: 600, color: 'var(--clr-text-1)', fontSize: '0.9rem' }}>
                      {data?.performance?.quarter}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--clr-text-3)', fontSize: '0.82rem' }}>Rating</span>
                    <span style={{
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      color: 'hsl(239,84%,67%)',
                      background: 'hsl(239,84%,67%,0.1)',
                      padding: '2px 10px',
                      borderRadius: 20,
                    }}>
                      {data?.performance?.rating}
                    </span>
                  </div>
                  <div>
                    <div style={{ color: 'var(--clr-text-3)', fontSize: '0.82rem', marginBottom: 8 }}>Score</div>
                    <StarRating score={data?.performance?.score || 0} />
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ── Onboarding Checklist ── */}
      <div className="chart-panel">
        <div className="chart-panel__header">
          <div>
            <h3 className="chart-panel__title">Onboarding Checklist</h3>
            <p className="chart-panel__subtitle">
              {loading ? '…' : `${completedTasks} of ${totalTasks} tasks completed`}
            </p>
          </div>
          {!loading && (
            <div style={{
              padding: '4px 14px',
              borderRadius: 20,
              background: completedTasks === totalTasks
                ? 'hsl(142,71%,50%,0.12)'
                : 'hsl(239,84%,67%,0.1)',
              color: completedTasks === totalTasks
                ? 'hsl(142,71%,45%)'
                : 'hsl(239,84%,67%)',
              fontSize: '0.78rem',
              fontWeight: 700,
            }}>
              {Math.round((completedTasks / (totalTasks || 1)) * 100)}% complete
            </div>
          )}
        </div>

        {/* Progress bar */}
        {!loading && (
          <div style={{
            height: 4,
            background: 'var(--clr-surface-3)',
            borderRadius: 2,
            margin: '0 1.5rem',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${Math.round((completedTasks / (totalTasks || 1)) * 100)}%`,
              background: 'linear-gradient(90deg, hsl(239,84%,67%), hsl(142,71%,50%))',
              borderRadius: 2,
              transition: 'width 0.8s ease',
            }} />
          </div>
        )}

        <div className="chart-panel__body" style={{ minHeight: 'unset', padding: '0.5rem 1.5rem 1.5rem' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="skeleton-pulse" style={{ height: '1.5rem', borderRadius: 5 }} />
              ))}
            </div>
          ) : (
            <div>
              {(data?.onboarding_tasks || []).map(task => (
                <TaskItem key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
