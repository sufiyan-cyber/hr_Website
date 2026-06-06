/**
 * EmployeeDetailPage — Phase 4
 *
 * Full employee profile view accessible via /employees/:id
 * - Profile card with avatar + meta chips
 * - Attendance summary
 * - Payroll history table
 * - Performance reviews
 * - Edit profile inline (patch request)
 */

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchEmployee, updateEmployee } from '@services/employeeService'

// ── Helpers ───────────────────────────────────────────────────────────────────
function InfoRow({ label, value }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '0.6rem 0', borderBottom: '1px solid var(--clr-border)',
    }}>
      <span style={{ fontSize: '0.8rem', color: 'var(--clr-text-3)', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: '0.875rem', color: 'var(--clr-text-1)', fontWeight: 500 }}>{value || '—'}</span>
    </div>
  )
}

function SectionCard({ title, children, action }) {
  return (
    <div className="chart-panel">
      <div className="chart-panel__header">
        <h3 className="chart-panel__title">{title}</h3>
        {action}
      </div>
      <div className="chart-panel__body" style={{ padding: '0 1.5rem 1.5rem' }}>
        {children}
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    active:   { color: 'hsl(142,71%,50%)', bg: 'hsl(142,71%,50%,0.12)', label: 'Active' },
    inactive: { color: 'hsl(0,72%,60%)',   bg: 'hsl(0,72%,60%,0.1)',    label: 'Inactive' },
    on_leave: { color: 'hsl(38,92%,55%)',  bg: 'hsl(38,92%,55%,0.12)',  label: 'On Leave' },
    Processed:{ color: 'hsl(142,71%,50%)', bg: 'hsl(142,71%,50%,0.12)', label: 'Processed' },
    Pending:  { color: 'hsl(38,92%,55%)',  bg: 'hsl(38,92%,55%,0.12)',  label: 'Pending' },
  }
  const s = map[status] || map.active
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 20,
      fontSize: '0.72rem', fontWeight: 700,
      background: s.bg, color: s.color,
    }}>
      {s.label}
    </span>
  )
}

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({ employee, onClose, onSaved }) {
  const [form, setForm] = useState({
    full_name:    employee.full_name || employee.name || '',
    email:        employee.email || '',
    role:         employee.role || employee.job_title || '',
    department:   employee.department || '',
    joining_date: employee.joining_date || '',
    status:       employee.status || 'active',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updateEmployee(employee.id, form)
      onSaved()
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Update failed.')
    }
    setSaving(false)
  }

  const fieldStyle = {
    width: '100%', padding: '0.625rem 0.875rem',
    background: 'var(--clr-surface-2)', border: '1px solid var(--clr-border)',
    borderRadius: 8, color: 'var(--clr-text-1)', fontSize: '0.875rem',
    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-avatar">✏️</div>
          <div>
            <div className="modal-title">Edit Employee Profile</div>
            <div className="modal-email">{employee.full_name || employee.name}</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {error && <div className="dash-error">⚠️ {error}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { key: 'full_name', label: 'Full Name', placeholder: 'Jane Smith' },
                { key: 'email', label: 'Email', placeholder: 'jane@company.com' },
                { key: 'role', label: 'Role / Title', placeholder: 'Engineer' },
                { key: 'department', label: 'Department', placeholder: 'Engineering' },
                { key: 'joining_date', label: 'Joining Date', type: 'date' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--clr-text-3)', display: 'block', marginBottom: 5 }}>
                    {f.label}
                  </label>
                  <input
                    style={fieldStyle}
                    type={f.type || 'text'}
                    value={form[f.key]}
                    placeholder={f.placeholder}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--clr-text-3)', display: 'block', marginBottom: 5 }}>
                  Status
                </label>
                <select
                  style={{ ...fieldStyle, cursor: 'pointer' }}
                  value={form.status}
                  onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                >
                  <option value="active">Active</option>
                  <option value="on_leave">On Leave</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="modal-btn modal-btn--ghost" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={saving} className="modal-btn modal-btn--shortlist">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function EmployeeDetailPage() {
  const { id }         = useParams()
  const navigate       = useNavigate()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [editing, setEditing] = useState(false)

  const load = () => {
    setLoading(true)
    fetchEmployee(id)
      .then(setData)
      .catch(err => setError(err.response?.data?.detail || err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  if (loading) {
    return (
      <div className="dash-page">
        <div className="skeleton-pulse" style={{ height: 36, width: 200, borderRadius: 8, marginBottom: 8 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {[1,2,3,4].map(i => (
            <div key={i} className="skeleton-pulse" style={{ height: 160, borderRadius: 14 }} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dash-page">
        <div className="dash-error">⚠️ {error}</div>
        <button onClick={() => navigate('/employees')} className="quick-action-btn" style={{ marginTop: 12 }}>
          ← Back to Employees
        </button>
      </div>
    )
  }

  const emp = data || {}
  const profile = emp.profile || emp
  const name = profile.full_name || profile.name || 'Employee'
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const attendance = emp.attendance_summary || emp.attendance || {}
  const payroll    = emp.payroll_history    || emp.payroll    || []
  const reviews    = emp.performance_reviews || emp.performance || []

  return (
    <div className="dash-page">

      {/* Back button */}
      <button
        onClick={() => navigate('/employees')}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', color: 'var(--clr-text-3)',
          fontSize: '0.875rem', cursor: 'pointer', fontWeight: 600,
          padding: 0, width: 'fit-content',
          transition: 'color 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--clr-text-1)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--clr-text-3)'}
      >
        ← Back to Employees
      </button>

      {/* Profile Header */}
      <div style={{
        background: 'linear-gradient(135deg, hsl(239,84%,67%,0.1), hsl(262,83%,68%,0.06))',
        border: '1px solid hsl(239,84%,67%,0.2)',
        borderRadius: 16,
        padding: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
        flexWrap: 'wrap',
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, hsl(239,84%,67%), hsl(262,83%,68%))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.75rem', fontWeight: 800, color: '#fff',
          boxShadow: '0 0 0 4px hsl(239,84%,67%,0.2)',
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--clr-text-1)', letterSpacing: '-0.02em' }}>
            {name}
          </div>
          <div style={{ fontSize: '0.9rem', color: 'hsl(239,84%,67%)', fontWeight: 600, marginTop: 2 }}>
            {profile.role || profile.job_title}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--clr-text-3)', marginTop: 2 }}>
            {profile.email}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{
            padding: '6px 14px', borderRadius: 20,
            background: 'var(--clr-surface-2)', border: '1px solid var(--clr-border)',
            fontSize: '0.78rem', color: 'var(--clr-text-2)',
          }}>
            🏢 {profile.department || '—'}
          </div>
          <div style={{
            padding: '6px 14px', borderRadius: 20,
            background: 'var(--clr-surface-2)', border: '1px solid var(--clr-border)',
            fontSize: '0.78rem', color: 'var(--clr-text-2)',
          }}>
            📅 Joined {(profile.joining_date || '').slice(0, 10) || '—'}
          </div>
          <StatusBadge status={profile.status || 'active'} />
          <button
            className="quick-action-btn"
            style={{
              background: 'var(--clr-surface-2)',
              color: 'var(--clr-text-1)',
              boxShadow: 'none',
              border: '1px solid var(--clr-border)',
            }}
            onClick={() => setEditing(true)}
          >
            ✏️ Edit Profile
          </button>
        </div>
      </div>

      {/* 2-col grid */}
      <div className="dash-grid-2">

        {/* Attendance Summary */}
        <SectionCard title="Attendance This Month">
          {Object.keys(attendance).length === 0 ? (
            <div style={{ color: 'var(--clr-text-3)', fontSize: '0.875rem', padding: '1rem 0' }}>
              No attendance data available.
            </div>
          ) : (
            <>
              <InfoRow label="Present"      value={`${attendance.present ?? 0} days`} />
              <InfoRow label="Absent"       value={`${attendance.absent ?? 0} days`} />
              <InfoRow label="On Leave"     value={`${attendance.leave ?? 0} days`} />
              <InfoRow label="Working Days" value={`${attendance.working_days ?? 22} days`} />
              <div style={{ marginTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--clr-text-3)' }}>Attendance rate</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'hsl(142,71%,50%)' }}>
                    {attendance.working_days ? Math.round((attendance.present / attendance.working_days) * 100) : 0}%
                  </span>
                </div>
                <div style={{ height: 8, background: 'var(--clr-surface-3)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${attendance.working_days ? Math.round((attendance.present / attendance.working_days) * 100) : 0}%`,
                    background: 'linear-gradient(90deg, hsl(239,84%,67%), hsl(142,71%,50%))',
                    borderRadius: 4,
                  }} />
                </div>
              </div>
            </>
          )}
        </SectionCard>

        {/* Performance Reviews */}
        <SectionCard title="Performance Reviews">
          {reviews.length === 0 ? (
            <div style={{ color: 'var(--clr-text-3)', fontSize: '0.875rem', padding: '1rem 0' }}>
              No performance reviews on record.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {reviews.map((r, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.75rem', borderRadius: 10,
                  background: 'var(--clr-surface-2)', border: '1px solid var(--clr-border)',
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--clr-text-1)' }}>
                      {r.quarter || r.period}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-3)', marginTop: 2 }}>
                      {r.rating || ''}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '1.2rem', fontWeight: 800,
                    color: r.score >= 4 ? 'hsl(142,71%,50%)' : r.score >= 3 ? 'hsl(239,84%,67%)' : 'hsl(38,92%,55%)',
                  }}>
                    {r.score} <span style={{ fontSize: '0.7rem', color: 'var(--clr-text-3)', fontWeight: 400 }}>/5</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

      </div>

      {/* Payroll History — full width */}
      <SectionCard title="Payroll History">
        {payroll.length === 0 ? (
          <div style={{ color: 'var(--clr-text-3)', fontSize: '0.875rem', padding: '1rem 0' }}>
            No payroll records found.
          </div>
        ) : (
          <table className="dash-table" style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>Month</th>
                <th>Amount</th>
                <th>Paid On</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {payroll.map((p, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{p.month}</td>
                  <td style={{ fontWeight: 700, color: 'hsl(142,71%,50%)' }}>{p.amount}</td>
                  <td style={{ color: 'var(--clr-text-3)', fontSize: '0.82rem' }}>{p.paid_on || '—'}</td>
                  <td><StatusBadge status={p.status || 'Processed'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>

      {/* Edit modal */}
      {editing && (
        <EditModal
          employee={{ id, ...profile }}
          onClose={() => setEditing(false)}
          onSaved={load}
        />
      )}

    </div>
  )
}
