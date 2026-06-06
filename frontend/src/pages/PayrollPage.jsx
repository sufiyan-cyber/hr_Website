/**
 * PayrollPage — Employee Payroll History
 * Shows real payroll data from DB. Empty state if no records exist.
 */

import { useEffect, useState } from 'react'
import { fetchMyPayroll } from '@services/payrollService'

const STATUS_CFG = {
  Paid:      { bg: 'hsl(142,71%,50%,0.12)', text: 'hsl(142,71%,40%)', icon: '✓' },
  Processed: { bg: 'hsl(239,84%,67%,0.12)', text: 'hsl(239,84%,67%)', icon: '⚙' },
  Pending:   { bg: 'hsl(38,92%,55%,0.12)',  text: 'hsl(38,92%,45%)',  icon: '⏳' },
  On_hold:   { bg: 'hsl(0,72%,60%,0.12)',   text: 'hsl(0,72%,50%)',   icon: '⏸' },
}

function StatusBadge({ status }) {
  const key = status || 'Pending'
  const cfg = STATUS_CFG[key] || STATUS_CFG.Pending
  return (
    <span style={{
      padding: '3px 12px', borderRadius: 20,
      background: cfg.bg, color: cfg.text,
      fontSize: '0.75rem', fontWeight: 700,
    }}>
      {cfg.icon} {key}
    </span>
  )
}

function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--clr-text-3)' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💰</div>
      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--clr-text-2)', marginBottom: 8 }}>
        No Payroll Records Yet
      </div>
      <div style={{ fontSize: '0.875rem' }}>
        Your payroll history will appear here once payroll has been processed by Finance.
      </div>
    </div>
  )
}

export default function PayrollPage() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    fetchMyPayroll()
      .then(setData)
      .catch(err => setError(err.response?.data?.detail || err.message))
      .finally(() => setLoading(false))
  }, [])

  const hasRecords = data?.has_records || false
  const latest     = data?.latest || null
  const history    = data?.history || []

  return (
    <div className="dash-page">

      {/* ── Header ── */}
      <div className="dash-page__header">
        <div>
          <h1 className="dash-page__title">My Payroll</h1>
          <p className="dash-page__subtitle">Salary details and payment history</p>
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
          {/* ── Latest Payroll Card ── */}
          {latest && (
            <div style={{
              background: 'linear-gradient(135deg, hsl(239,84%,67%,0.12), hsl(142,71%,50%,0.08))',
              border: '1px solid hsl(239,84%,67%,0.25)',
              borderRadius: 16,
              padding: '1.75rem 2rem',
              marginBottom: '1.5rem',
              display: 'flex',
              gap: '2rem',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--clr-text-3)', marginBottom: 4 }}>
                  Latest Payslip
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'hsl(142,71%,50%)' }}>
                  {latest.net_fmt}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--clr-text-2)', marginTop: 4 }}>
                  {latest.month_label} · <StatusBadge status={latest.status} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                {[
                  { label: 'Gross Pay',   value: latest.gross_fmt },
                  { label: 'Deductions',  value: latest.deductions_fmt },
                  { label: 'Paid On',     value: latest.paid_on },
                ].map(item => (
                  <div key={item.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--clr-text-3)', marginBottom: 4 }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--clr-text-1)' }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Payroll History Table ── */}
          <div className="dash-table-wrap">
            <div className="dash-table-wrap__header">
              <span className="dash-table-wrap__title">Payroll History</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--clr-text-3)' }}>
                Last {history.length} record{history.length !== 1 ? 's' : ''}
              </span>
            </div>
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Gross Pay</th>
                  <th>Deductions</th>
                  <th>Net Pay</th>
                  <th>Status</th>
                  <th>Paid On</th>
                </tr>
              </thead>
              <tbody>
                {history.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.month_label}</td>
                    <td style={{ color: 'var(--clr-text-2)' }}>{r.gross_fmt}</td>
                    <td style={{ color: 'hsl(0,72%,60%)' }}>{r.deductions_fmt}</td>
                    <td>
                      <span style={{ fontWeight: 800, color: 'hsl(142,71%,45%)', fontSize: '1rem' }}>
                        {r.net_fmt}
                      </span>
                    </td>
                    <td><StatusBadge status={r.status} /></td>
                    <td style={{ color: 'var(--clr-text-3)', fontSize: '0.85rem' }}>
                      {r.paid_on}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

    </div>
  )
}
