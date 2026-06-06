/**
 * ApprovalsPage — Manager Approvals Queue
 * Shows pending leave/overtime/equipment requests from real DB.
 * Empty state when no pending requests.
 */

import { useEffect, useState } from 'react'
import { fetchManagerDashboard } from '@services/dashboardService'

const TYPE_ICONS = {
  'Leave Request':   '🏖️',
  'Overtime Claim':  '⏱️',
  'Equipment Order': '💻',
}

function ApprovalCard({ approval, onAction }) {
  const [actioning, setActioning] = useState(null)

  const handle = async (action) => {
    setActioning(action)
    await onAction(approval.id, action)
    setActioning(null)
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '1rem 1.25rem', borderRadius: 12,
      background: 'var(--clr-surface-1)', border: '1px solid var(--clr-border)',
      transition: 'border-color 0.2s',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'hsl(239,84%,67%,0.4)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--clr-border)'}
    >
      <span style={{ fontSize: '1.75rem', flexShrink: 0 }}>
        {TYPE_ICONS[approval.type] || '📋'}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--clr-text-1)' }}>
          {approval.type}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--clr-text-2)', marginTop: 2 }}>
          From: <strong>{approval.from}</strong> · {approval.detail}
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--clr-text-3)', marginTop: 3 }}>
          Requested: {approval.date}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          disabled={!!actioning}
          onClick={() => handle('approve')}
          style={{
            padding: '7px 18px', borderRadius: 8, border: 'none',
            background: actioning === 'approve' ? 'hsl(142,71%,40%)' : 'hsl(142,71%,50%)',
            color: '#fff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {actioning === 'approve' ? '…' : '✓ Approve'}
        </button>
        <button
          disabled={!!actioning}
          onClick={() => handle('reject')}
          style={{
            padding: '7px 18px', borderRadius: 8, border: 'none',
            background: actioning === 'reject' ? 'hsl(0,72%,45%)' : 'hsl(0,72%,60%)',
            color: '#fff', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {actioning === 'reject' ? '…' : '✗ Reject'}
        </button>
      </div>
    </div>
  )
}

export default function ApprovalsPage() {
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [dismissed, setDismissed] = useState(new Set())
  const [actionMsg, setActionMsg] = useState(null)

  useEffect(() => {
    fetchManagerDashboard()
      .then(setData)
      .catch(err => setError(err.response?.data?.detail || err.message))
      .finally(() => setLoading(false))
  }, [])

  const handleAction = async (id, action) => {
    // Optimistic UI — remove from list immediately
    setDismissed(prev => new Set([...prev, id]))
    setActionMsg({
      type: action === 'approve' ? 'success' : 'info',
      text: action === 'approve'
        ? '✓ Request approved successfully'
        : '✗ Request rejected',
    })
    setTimeout(() => setActionMsg(null), 3000)
    // TODO: Call a real approve/reject API endpoint when leave_requests table exists
  }

  const approvals = (data?.approvals_list || []).filter(a => !dismissed.has(a.id))
  const teamSize  = data?.team_size || 0
  const avgPerf   = data?.avg_performance || 0

  return (
    <div className="dash-page">

      {/* ── Header ── */}
      <div className="dash-page__header">
        <div>
          <h1 className="dash-page__title">Approvals Queue</h1>
          <p className="dash-page__subtitle">Pending requests from your team</p>
        </div>
      </div>

      {error && <div className="dash-error">⚠️ {error}</div>}

      {actionMsg && (
        <div style={{
          padding: '0.75rem 1.25rem', borderRadius: 10, marginBottom: '1rem',
          fontSize: '0.875rem', fontWeight: 600,
          background: actionMsg.type === 'success'
            ? 'hsl(142,71%,50%,0.12)' : 'hsl(239,84%,67%,0.12)',
          color: actionMsg.type === 'success'
            ? 'hsl(142,71%,40%)' : 'hsl(239,84%,67%)',
          border: `1px solid ${actionMsg.type === 'success'
            ? 'hsl(142,71%,50%,0.3)' : 'hsl(239,84%,67%,0.3)'}`,
        }}>
          {actionMsg.text}
        </div>
      )}

      {/* ── Stats ── */}
      <div className="stat-grid stat-grid--3">
        <div className="stat-card stat-card--warning">
          <div className="stat-card__icon-wrap"><span className="stat-card__icon">⏳</span></div>
          <div className="stat-card__body">
            <div className="stat-card__value">{approvals.length}</div>
            <div className="stat-card__label">Pending Approvals</div>
          </div>
        </div>
        <div className="stat-card stat-card--primary">
          <div className="stat-card__icon-wrap"><span className="stat-card__icon">👥</span></div>
          <div className="stat-card__body">
            <div className="stat-card__value">{teamSize}</div>
            <div className="stat-card__label">Team Members</div>
          </div>
        </div>
        <div className="stat-card stat-card--success">
          <div className="stat-card__icon-wrap"><span className="stat-card__icon">🏆</span></div>
          <div className="stat-card__body">
            <div className="stat-card__value">{avgPerf > 0 ? `${avgPerf}/5` : '—'}</div>
            <div className="stat-card__label">Avg Performance</div>
          </div>
        </div>
      </div>

      {/* ── Approvals List ── */}
      <div className="chart-panel">
        <div className="chart-panel__header">
          <div>
            <h3 className="chart-panel__title">Pending Requests</h3>
            <p className="chart-panel__subtitle">Click approve or reject to action each request</p>
          </div>
          {approvals.length > 0 && (
            <span style={{
              padding: '4px 14px', borderRadius: 20,
              background: 'hsl(38,92%,55%,0.12)', color: 'hsl(38,92%,45%)',
              fontSize: '0.78rem', fontWeight: 700,
            }}>
              {approvals.length} pending
            </span>
          )}
        </div>
        <div className="chart-panel__body" style={{ minHeight: 200 }}>
          {loading ? (
            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton-pulse" style={{ height: 80, borderRadius: 12 }} />
              ))}
            </div>
          ) : approvals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 2rem', color: 'var(--clr-text-3)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🎉</div>
              <div style={{ fontWeight: 700, color: 'var(--clr-text-2)', marginBottom: 6 }}>
                All caught up!
              </div>
              <div style={{ fontSize: '0.875rem' }}>
                No pending approvals at this time. Check back later.
              </div>
            </div>
          ) : (
            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {approvals.map(a => (
                <ApprovalCard key={a.id} approval={a} onAction={handleAction} />
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
