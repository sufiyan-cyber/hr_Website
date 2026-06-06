/**
 * EmployeesPage — Phase 4
 *
 * Employee Management for Admin / HR / Manager
 * - Full employee table with search + department + status filters
 * - Add New Employee modal
 * - Department management section (admin only)
 * - Click row → navigate to /employees/:id
 */

import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import ConfirmDialog from '@components/ConfirmDialog'
import EmptyState from '@components/EmptyState'
import {
  fetchEmployees,
  createEmployee,
  deactivateEmployee,
  fetchDepartments,
  createDepartment,
} from '@services/employeeService'

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    active:   { color: 'hsl(142,71%,50%)', bg: 'hsl(142,71%,50%,0.12)', label: 'Active' },
    inactive: { color: 'hsl(0,72%,60%)',   bg: 'hsl(0,72%,60%,0.1)',    label: 'Inactive' },
    on_leave: { color: 'hsl(38,92%,55%)',  bg: 'hsl(38,92%,55%,0.12)',  label: 'On Leave' },
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

// ── Add Employee Modal ────────────────────────────────────────────────────────
function AddEmployeeModal({ departments, onClose, onAdded }) {
  const [form, setForm] = useState({
    full_name: '', email: '', role: 'employee',
    department: '', joining_date: '', salary: '',
  })
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.full_name || !form.email || !form.department) {
      setError('Name, email, and department are required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await createEmployee({
        ...form,
        salary: form.salary ? Number(form.salary) : undefined,
      })
      onAdded()
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create employee.')
    }
    setSaving(false)
  }

  const fieldStyle = {
    width: '100%',
    padding: '0.625rem 0.875rem',
    background: 'var(--clr-surface-2)',
    border: '1px solid var(--clr-border)',
    borderRadius: 8,
    color: 'var(--clr-text-1)',
    fontSize: '0.875rem',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-panel"
        style={{ maxWidth: 520 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-avatar">👤</div>
          <div>
            <div className="modal-title">Add New Employee</div>
            <div className="modal-email">Fill in the profile details below</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 14 }}>

            {error && (
              <div className="dash-error" style={{ marginBottom: 0 }}>⚠️ {error}</div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--clr-text-3)', display: 'block', marginBottom: 5 }}>
                  Full Name *
                </label>
                <input
                  style={fieldStyle}
                  value={form.full_name}
                  onChange={e => set('full_name', e.target.value)}
                  placeholder="Jane Smith"
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--clr-text-3)', display: 'block', marginBottom: 5 }}>
                  Email *
                </label>
                <input
                  style={fieldStyle}
                  type="email"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  placeholder="jane@company.com"
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--clr-text-3)', display: 'block', marginBottom: 5 }}>
                  Department *
                </label>
                <select
                  style={{ ...fieldStyle, cursor: 'pointer' }}
                  value={form.department}
                  onChange={e => set('department', e.target.value)}
                  required
                >
                  <option value="">Select department…</option>
                  {departments.map(d => (
                    <option key={d.id || d.name} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--clr-text-3)', display: 'block', marginBottom: 5 }}>
                  Role / Title
                </label>
                <input
                  style={fieldStyle}
                  value={form.role}
                  onChange={e => set('role', e.target.value)}
                  placeholder="Software Engineer"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--clr-text-3)', display: 'block', marginBottom: 5 }}>
                  Joining Date
                </label>
                <input
                  style={fieldStyle}
                  type="date"
                  value={form.joining_date}
                  onChange={e => set('joining_date', e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--clr-text-3)', display: 'block', marginBottom: 5 }}>
                  Salary (₹)
                </label>
                <input
                  style={fieldStyle}
                  type="number"
                  value={form.salary}
                  onChange={e => set('salary', e.target.value)}
                  placeholder="85000"
                />
              </div>
            </div>

          </div>

          <div className="modal-footer">
            <button type="button" className="modal-btn modal-btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="modal-btn modal-btn--shortlist"
            >
              {saving ? 'Saving…' : '+ Add Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Add Department Modal ──────────────────────────────────────────────────────
function AddDeptModal({ onClose, onAdded }) {
  const [form, setForm] = useState({ name: '', description: '', head_name: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name) { setError('Department name is required.'); return }
    setSaving(true)
    try {
      await createDepartment(form)
      onAdded()
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create department.')
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
      <div className="modal-panel" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-avatar">🏢</div>
          <div>
            <div className="modal-title">Add Department</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {error && <div className="dash-error">⚠️ {error}</div>}
            {[
              { key: 'name', label: 'Name *', placeholder: 'e.g. Engineering' },
              { key: 'head_name', label: 'Department Head', placeholder: 'e.g. John Doe' },
              { key: 'description', label: 'Description', placeholder: 'Brief description…' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--clr-text-3)', display: 'block', marginBottom: 5 }}>
                  {f.label}
                </label>
                <input
                  style={fieldStyle}
                  value={form[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                />
              </div>
            ))}
          </div>
          <div className="modal-footer">
            <button type="button" className="modal-btn modal-btn--ghost" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={saving} className="modal-btn modal-btn--shortlist">
              {saving ? 'Saving…' : '+ Add Department'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function EmployeesPage() {
  const navigate = useNavigate()
  const [employees,    setEmployees]    = useState([])
  const [departments,  setDepartments]  = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [search,       setSearch]       = useState('')
  const [deptFilter,   setDeptFilter]   = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showAddEmp,   setShowAddEmp]   = useState(false)
  const [showAddDept,  setShowAddDept]  = useState(false)
  const [activeTab,    setActiveTab]    = useState('employees')
  const [deactivating, setDeactivating] = useState(null)
  const [confirmData,  setConfirmData]  = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [emps, depts] = await Promise.all([
        fetchEmployees({ department: deptFilter || undefined, status: statusFilter || undefined, search: search || undefined }),
        fetchDepartments(),
      ])
      setEmployees(Array.isArray(emps) ? emps : emps.employees || [])
      setDepartments(Array.isArray(depts) ? depts : depts.departments || [])
    } catch (err) {
      setError(err.response?.data?.detail || err.message)
    }
    setLoading(false)
  }, [deptFilter, statusFilter, search])

  useEffect(() => { load() }, [load])

  // Client-side search filter (as supplement to server-side)
  const filtered = employees.filter(e => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (e.full_name || '').toLowerCase().includes(q) ||
      (e.email || '').toLowerCase().includes(q) ||
      (e.role || '').toLowerCase().includes(q) ||
      (e.department || '').toLowerCase().includes(q)
    )
  })

  const handleDeactivate = (id, name) => {
    setConfirmData({
      id,
      name,
      title: 'Deactivate Employee',
      message: `Are you sure you want to deactivate ${name || 'this employee'}? They will be marked as inactive but all historical data is preserved.`,
      confirmLabel: 'Deactivate',
      icon: '⚠️',
    })
  }

  const doDeactivate = async (id) => {
    setDeactivating(id)
    try {
      await deactivateEmployee(id)
      await load()
    } catch {}
    setDeactivating(null)
    setConfirmData(null)
  }

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

  return (
    <div className="dash-page">

      {/* Header */}
      <div className="dash-page__header">
        <div>
          <h1 className="dash-page__title">Employee Management</h1>
          <p className="dash-page__subtitle">
            {loading ? 'Loading…' : `${employees.length} employees · ${departments.length} departments`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="quick-action-btn"
            style={{ background: 'var(--clr-surface-2)', color: 'var(--clr-text-1)', boxShadow: 'none', border: '1px solid var(--clr-border)' }}
            onClick={() => setShowAddDept(true)}
          >
            🏢 Add Department
          </button>
          <button className="quick-action-btn" onClick={() => setShowAddEmp(true)}>
            + Add Employee
          </button>
        </div>
      </div>

      {error && <div className="dash-error">⚠️ {error}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--clr-border)', paddingBottom: 0 }}>
        {['employees', 'departments'].map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            style={{
              padding: '0.6rem 1.25rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === t ? '2px solid hsl(239,84%,67%)' : '2px solid transparent',
              color: activeTab === t ? 'hsl(239,84%,67%)' : 'var(--clr-text-3)',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ── EMPLOYEES TAB ── */}
      {activeTab === 'employees' && (
        <>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              style={{ ...fieldStyle, minWidth: 220 }}
              placeholder="🔍 Search by name, role, department…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select
              style={{ ...fieldStyle, cursor: 'pointer' }}
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d.id || d.name} value={d.name}>{d.name}</option>
              ))}
            </select>
            <select
              style={{ ...fieldStyle, cursor: 'pointer' }}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="on_leave">On Leave</option>
            </select>
            {(search || deptFilter || statusFilter) && (
              <button
                onClick={() => { setSearch(''); setDeptFilter(''); setStatusFilter('') }}
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

          {/* Employee table */}
          <div className="dash-table-wrap">
            <div className="dash-table-wrap__header">
              <span className="dash-table-wrap__title">
                {loading ? 'Loading…' : `${filtered.length} employee${filtered.length !== 1 ? 's' : ''}`}
              </span>
            </div>
            {loading ? (
              <div style={{ padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="skeleton-pulse" style={{ height: '2.5rem', borderRadius: 6 }} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                illustration="👥"
                title="No employees found"
                subtitle="Try adjusting your filters or search terms, or add a new employee profile to get started."
                actionLabel="✕ Add Employee"
                onAction={() => setShowAddEmp(true)}
              />
            ) : (
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Role</th>
                    <th>Joining Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(emp => (
                    <tr
                      key={emp.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/employees/${emp.id}`)}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                            background: 'linear-gradient(135deg, hsl(239,84%,67%), hsl(262,83%,68%))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.8rem', fontWeight: 700, color: '#fff',
                          }}>
                            {(emp.full_name || 'U')[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--clr-text-1)' }}>
                              {emp.full_name || emp.name}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--clr-text-3)' }}>
                              {emp.email}
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
                          {emp.department || '—'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--clr-text-2)', fontSize: '0.85rem' }}>
                        {emp.role || emp.job_title || '—'}
                      </td>
                      <td style={{ color: 'var(--clr-text-3)', fontSize: '0.82rem' }}>
                        {emp.joining_date ? emp.joining_date.slice(0, 10) : '—'}
                      </td>
                      <td>
                        <StatusBadge status={emp.status || 'active'} />
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => navigate(`/employees/${emp.id}`)}
                            style={{
                              padding: '4px 10px', borderRadius: 6,
                              border: '1px solid var(--clr-border)',
                              background: 'var(--clr-surface-2)',
                              color: 'var(--clr-text-2)',
                              fontSize: '0.75rem', cursor: 'pointer',
                              fontWeight: 600,
                            }}
                          >
                            View
                          </button>
                          {emp.status !== 'inactive' && (
                            <button
                              disabled={deactivating === emp.id}
                              onClick={() => handleDeactivate(emp.id, emp.full_name || emp.name)}
                              style={{
                                padding: '4px 10px', borderRadius: 6,
                                border: '1px solid hsl(0,72%,60%,0.3)',
                                background: 'hsl(0,72%,60%,0.08)',
                                color: 'hsl(0,72%,65%)',
                                fontSize: '0.75rem', cursor: 'pointer',
                                fontWeight: 600,
                                opacity: deactivating === emp.id ? 0.5 : 1,
                              }}
                            >
                              {deactivating === emp.id ? '…' : 'Deactivate'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ── DEPARTMENTS TAB ── */}
      {activeTab === 'departments' && (
        <div>
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="skeleton-pulse" style={{ height: '120px', borderRadius: 12 }} />
              ))}
            </div>
          ) : (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: '1rem',
              }}>
                {departments.map((dept, i) => {
                  const colors = [
                    'hsl(239,84%,67%)', 'hsl(262,83%,68%)',
                    'hsl(142,71%,50%)', 'hsl(38,92%,55%)',
                    'hsl(195,80%,55%)', 'hsl(0,72%,60%)',
                  ]
                  const c = colors[i % colors.length]
                  return (
                    <div
                      key={dept.id || dept.name}
                      style={{
                        background: 'var(--clr-surface)',
                        border: `1px solid ${c}30`,
                        borderRadius: 14,
                        padding: '1.25rem 1.5rem',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = `0 8px 24px ${c}20`
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = ''
                        e.currentTarget.style.boxShadow = ''
                      }}
                    >
                      <div style={{
                        width: 40, height: 40, borderRadius: 10, marginBottom: 10,
                        background: `${c}18`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.2rem',
                      }}>
                        🏢
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--clr-text-1)', marginBottom: 4 }}>
                        {dept.name}
                      </div>
                      {dept.head_name && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--clr-text-3)', marginBottom: 6 }}>
                          Head: {dept.head_name}
                        </div>
                      )}
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '3px 10px', borderRadius: 20,
                        background: `${c}12`, color: c,
                        fontSize: '0.75rem', fontWeight: 700,
                      }}>
                        👥 {dept.employee_count ?? dept.count ?? '—'} employees
                      </div>
                      {dept.description && (
                        <div style={{
                          fontSize: '0.78rem', color: 'var(--clr-text-3)',
                          marginTop: 8, lineHeight: 1.4,
                        }}>
                          {dept.description}
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Add dept card */}
                <div
                  onClick={() => setShowAddDept(true)}
                  style={{
                    background: 'var(--clr-surface)',
                    border: '2px dashed var(--clr-border)',
                    borderRadius: 14,
                    padding: '1.25rem 1.5rem',
                    cursor: 'pointer',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    gap: 8, minHeight: 120,
                    transition: 'border-color 0.2s, background 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'hsl(239,84%,67%)'
                    e.currentTarget.style.background = 'hsl(239,84%,67%,0.04)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = ''
                    e.currentTarget.style.background = ''
                  }}
                >
                  <span style={{ fontSize: '1.5rem' }}>+</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--clr-text-3)' }}>
                    Add Department
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Modals */}
      {showAddEmp && (
        <AddEmployeeModal
          departments={departments}
          onClose={() => setShowAddEmp(false)}
          onAdded={load}
        />
      )}
      {showAddDept && (
        <AddDeptModal
          onClose={() => setShowAddDept(false)}
          onAdded={load}
        />
      )}

      {confirmData && (
        <ConfirmDialog
          title={confirmData.title}
          message={confirmData.message}
          confirmLabel={confirmData.confirmLabel}
          icon={confirmData.icon}
          variant="danger"
          onConfirm={() => doDeactivate(confirmData.id)}
          onCancel={() => setConfirmData(null)}
        />
      )}

    </div>
  )
}
