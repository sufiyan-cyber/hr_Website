/**
 * DepartmentsPage — Phase 4
 *
 * Department management for Admin / Manager
 * - Grid of department cards (name, head, employee count, description)
 * - Add Department modal (name, description, head name, assign manager)
 * - Delete department with confirmation dialog
 * - Toast notifications on all actions
 * - Matches existing design system (dash-page, modal-panel, etc.)
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { fetchDepartments, createDepartment, deleteDepartment } from '@services/departmentService'
import { fetchEmployees } from '@services/employeeService'

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      display: 'flex', flexDirection: 'column', gap: 10,
      zIndex: 9999, pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          pointerEvents: 'auto',
          padding: '0.75rem 1.25rem',
          borderRadius: 10,
          background: t.type === 'success'
            ? 'hsl(142,71%,50%,0.12)' : 'hsl(0,72%,60%,0.12)',
          border: `1px solid ${t.type === 'success'
            ? 'hsl(142,71%,50%,0.3)' : 'hsl(0,72%,60%,0.3)'}`,
          color: t.type === 'success'
            ? 'hsl(142,71%,45%)' : 'hsl(0,72%,60%)',
          fontSize: '0.875rem',
          fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          backdropFilter: 'blur(8px)',
          animation: 'slideInRight 0.3s ease',
          display: 'flex', alignItems: 'center', gap: 8,
          minWidth: 260,
        }}>
          <span>{t.type === 'success' ? '✅' : '❌'}</span>
          {t.message}
        </div>
      ))}
    </div>
  )
}

function useToast() {
  const [toasts, setToasts] = useState([])
  const push = (message, type = 'success') => {
    const id = Date.now()
    setToasts(ts => [...ts, { id, message, type }])
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 3500)
  }
  return { toasts, push }
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────
function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel, danger }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal-panel"
        style={{ maxWidth: 400 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-avatar" style={{
            background: danger
              ? 'hsl(0,72%,60%,0.15)'
              : 'hsl(239,84%,67%,0.15)',
          }}>
            {danger ? '⚠️' : '❓'}
          </div>
          <div>
            <div className="modal-title">{title}</div>
            <div className="modal-email">{message}</div>
          </div>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>
        <div className="modal-footer">
          <button className="modal-btn modal-btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="modal-btn"
            style={{
              background: danger
                ? 'linear-gradient(135deg, hsl(0,72%,55%), hsl(0,72%,45%))'
                : 'linear-gradient(135deg, hsl(239,84%,67%), hsl(262,83%,68%))',
              color: '#fff',
              border: 'none',
              boxShadow: danger
                ? '0 4px 14px hsl(0,72%,55%,0.35)'
                : '0 4px 14px hsl(239,84%,67%,0.35)',
            }}
            onClick={onConfirm}
          >
            {confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Add Department Modal ──────────────────────────────────────────────────────
function AddDeptModal({ employees, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '', description: '', head_name: '', manager_id: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Department name is required.'); return }
    setSaving(true)
    setError(null)
    try {
      await createDepartment({
        name:        form.name.trim(),
        description: form.description || undefined,
        head_name:   form.head_name || undefined,
        manager_id:  form.manager_id || undefined,
      })
      onSaved()
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create department.')
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

  const labelStyle = {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'var(--clr-text-3)',
    display: 'block',
    marginBottom: 5,
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-panel"
        style={{ maxWidth: 480 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-avatar">🏢</div>
          <div>
            <div className="modal-title">Add New Department</div>
            <div className="modal-email">Fill in the department details below</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 14 }}>

            {error && (
              <div className="dash-error" style={{ marginBottom: 0 }}>⚠️ {error}</div>
            )}

            <div>
              <label style={labelStyle}>Department Name *</label>
              <input
                style={fieldStyle}
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. Engineering"
                required
                autoFocus
              />
            </div>

            <div>
              <label style={labelStyle}>Department Head / Manager Name</label>
              <input
                style={fieldStyle}
                value={form.head_name}
                onChange={e => set('head_name', e.target.value)}
                placeholder="e.g. Jane Smith"
              />
            </div>

            {employees.length > 0 && (
              <div>
                <label style={labelStyle}>Assign Manager (from employees)</label>
                <select
                  style={{ ...fieldStyle, cursor: 'pointer' }}
                  value={form.manager_id}
                  onChange={e => {
                    const emp = employees.find(em => em.id === e.target.value)
                    set('manager_id', e.target.value)
                    if (emp && !form.head_name) set('head_name', emp.full_name || emp.name || '')
                  }}
                >
                  <option value="">Select employee…</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name || emp.name} — {emp.role || emp.department || ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label style={labelStyle}>Description</label>
              <textarea
                style={{ ...fieldStyle, minHeight: 80, resize: 'vertical' }}
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Brief description of this department…"
              />
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
              {saving ? 'Saving…' : '+ Add Department'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Department Card ───────────────────────────────────────────────────────────
const DEPT_COLORS = [
  'hsl(239,84%,67%)',
  'hsl(262,83%,68%)',
  'hsl(142,71%,50%)',
  'hsl(38,92%,55%)',
  'hsl(195,80%,55%)',
  'hsl(0,72%,60%)',
  'hsl(330,75%,60%)',
  'hsl(50,90%,55%)',
]

const DEPT_ICONS = ['💻', '📊', '🎯', '🚀', '📣', '🧑‍💼', '🔬', '🛡️', '💰', '🌍']

function DeptCard({ dept, index, onDelete }) {
  const color = DEPT_COLORS[index % DEPT_COLORS.length]
  const icon  = DEPT_ICONS[index % DEPT_ICONS.length]

  return (
    <div
      style={{
        background: 'var(--clr-surface)',
        border: `1px solid ${color}28`,
        borderRadius: 16,
        padding: '1.5rem',
        position: 'relative',
        transition: 'transform 0.2s, box-shadow 0.2s',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px)'
        e.currentTarget.style.boxShadow = `0 12px 32px ${color}22`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = ''
        e.currentTarget.style.boxShadow = ''
      }}
    >
      {/* Delete button */}
      <button
        onClick={() => onDelete(dept)}
        title="Delete department"
        style={{
          position: 'absolute', top: 12, right: 12,
          width: 28, height: 28, borderRadius: '50%',
          border: 'none',
          background: 'hsl(0,72%,60%,0.08)',
          color: 'hsl(0,72%,60%)',
          cursor: 'pointer',
          fontSize: '0.8rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0.7,
          transition: 'opacity 0.2s, background 0.2s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.opacity = '1'
          e.currentTarget.style.background = 'hsl(0,72%,60%,0.16)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.opacity = '0.7'
          e.currentTarget.style.background = 'hsl(0,72%,60%,0.08)'
        }}
      >
        🗑
      </button>

      {/* Icon */}
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: `${color}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.4rem',
        flexShrink: 0,
      }}>
        {icon}
      </div>

      {/* Name */}
      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--clr-text-1)', paddingRight: 24 }}>
        {dept.name}
      </div>

      {/* Head */}
      {dept.head_name && (
        <div style={{
          fontSize: '0.78rem',
          color: 'var(--clr-text-3)',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <span>👤</span>
          <span>{dept.head_name}</span>
        </div>
      )}

      {/* Employee count badge */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '4px 12px', borderRadius: 20,
        background: `${color}14`, color,
        fontSize: '0.75rem', fontWeight: 700,
        width: 'fit-content',
      }}>
        👥 {dept.employee_count ?? dept.count ?? 0} employees
      </div>

      {/* Description */}
      {dept.description && (
        <div style={{
          fontSize: '0.78rem',
          color: 'var(--clr-text-3)',
          lineHeight: 1.5,
          marginTop: 2,
        }}>
          {dept.description}
        </div>
      )}

      {/* Bottom accent bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 3, borderRadius: '0 0 16px 16px',
        background: `linear-gradient(90deg, ${color}60, ${color}20)`,
      }} />
    </div>
  )
}

// ── Add Card ──────────────────────────────────────────────────────────────────
function AddCard({ onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--clr-surface)',
        border: '2px dashed var(--clr-border)',
        borderRadius: 16,
        padding: '1.5rem',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        minHeight: 160,
        transition: 'border-color 0.2s, background 0.2s, transform 0.2s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'hsl(239,84%,67%)'
        e.currentTarget.style.background  = 'hsl(239,84%,67%,0.04)'
        e.currentTarget.style.transform   = 'translateY(-3px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = ''
        e.currentTarget.style.background  = ''
        e.currentTarget.style.transform   = ''
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: 'hsl(239,84%,67%,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.5rem', color: 'hsl(239,84%,67%)',
      }}>
        +
      </div>
      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--clr-text-3)' }}>
        New Department
      </span>
    </div>
  )
}

// ── Stats Bar ─────────────────────────────────────────────────────────────────
function StatPill({ label, value, color }) {
  return (
    <div style={{
      background: 'var(--clr-surface)',
      border: '1px solid var(--clr-border)',
      borderRadius: 12,
      padding: '0.875rem 1.25rem',
      display: 'flex', flexDirection: 'column', gap: 4,
      minWidth: 140,
    }}>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: color || 'var(--clr-text-1)' }}>
        {value}
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-3)', fontWeight: 600 }}>
        {label}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([])
  const [employees,   setEmployees]   = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [showAdd,     setShowAdd]     = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting,    setDeleting]    = useState(false)
  const [search,      setSearch]      = useState('')
  const { toasts, push } = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [deptsRes, empsRes] = await Promise.all([
        fetchDepartments(),
        fetchEmployees({}).catch(() => ({ employees: [] })),
      ])
      setDepartments(
        Array.isArray(deptsRes) ? deptsRes : (deptsRes.departments || [])
      )
      setEmployees(
        Array.isArray(empsRes) ? empsRes : (empsRes.employees || [])
      )
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to load departments.')
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteDepartment(deleteTarget.id)
      push(`"${deleteTarget.name}" department deleted.`, 'success')
      setDeleteTarget(null)
      await load()
    } catch (err) {
      push(err.response?.data?.detail || 'Failed to delete department.', 'error')
    }
    setDeleting(false)
  }

  const handleAdded = async () => {
    push('Department created successfully! 🏢', 'success')
    await load()
  }

  // Filter
  const filtered = departments.filter(d => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (d.name || '').toLowerCase().includes(q) ||
      (d.head_name || '').toLowerCase().includes(q) ||
      (d.description || '').toLowerCase().includes(q)
    )
  })

  const totalEmployees = departments.reduce((s, d) => s + (d.employee_count || 0), 0)

  return (
    <div className="dash-page">
      <Toast toasts={toasts} />

      {/* Header */}
      <div className="dash-page__header">
        <div>
          <h1 className="dash-page__title">Department Management</h1>
          <p className="dash-page__subtitle">
            {loading
              ? 'Loading departments…'
              : `${departments.length} department${departments.length !== 1 ? 's' : ''} · ${totalEmployees} total employees`}
          </p>
        </div>
        <button
          className="quick-action-btn"
          id="add-department-btn"
          onClick={() => setShowAdd(true)}
        >
          🏢 Add Department
        </button>
      </div>

      {error && <div className="dash-error">⚠️ {error}</div>}

      {/* Stats bar */}
      {!loading && departments.length > 0 && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <StatPill
            label="Total Departments"
            value={departments.length}
            color="hsl(239,84%,67%)"
          />
          <StatPill
            label="Total Employees"
            value={totalEmployees}
            color="hsl(142,71%,50%)"
          />
          <StatPill
            label="Avg Team Size"
            value={departments.length
              ? Math.round(totalEmployees / departments.length)
              : 0}
            color="hsl(38,92%,55%)"
          />
        </div>
      )}

      {/* Search */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <input
          style={{
            padding: '0.5rem 0.875rem',
            background: 'var(--clr-surface-2)',
            border: '1px solid var(--clr-border)',
            borderRadius: 8,
            color: 'var(--clr-text-1)',
            fontSize: '0.875rem',
            outline: 'none',
            fontFamily: 'inherit',
            minWidth: 260,
          }}
          placeholder="🔍 Search departments…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          id="dept-search"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{
              padding: '0.5rem 0.875rem',
              background: 'hsl(0,72%,60%,0.08)',
              border: '1px solid hsl(0,72%,60%,0.2)',
              borderRadius: 8,
              color: 'hsl(0,72%,65%)',
              fontSize: '0.875rem',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            ✕ Clear
          </button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '1rem',
        }}>
          {[1,2,3,4,5,6].map(i => (
            <div
              key={i}
              className="skeleton-pulse"
              style={{ height: 180, borderRadius: 16 }}
            />
          ))}
        </div>
      ) : filtered.length === 0 && search ? (
        <div style={{
          textAlign: 'center', padding: '3rem 0',
          color: 'var(--clr-text-3)', fontSize: '0.95rem',
        }}>
          No departments match "{search}".{' '}
          <button
            onClick={() => setSearch('')}
            style={{ color: 'hsl(239,84%,67%)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
          >
            Clear search →
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '1rem',
        }}>
          {filtered.map((dept, i) => (
            <DeptCard
              key={dept.id || dept.name}
              dept={dept}
              index={i}
              onDelete={setDeleteTarget}
            />
          ))}
          <AddCard onClick={() => setShowAdd(true)} />
        </div>
      )}

      {/* Empty state */}
      {!loading && departments.length === 0 && !search && (
        <div style={{
          textAlign: 'center', padding: '4rem 0',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
        }}>
          <div style={{ fontSize: '3rem' }}>🏢</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--clr-text-1)' }}>
            No departments yet
          </div>
          <div style={{ color: 'var(--clr-text-3)', fontSize: '0.9rem' }}>
            Create your first department to organize your team.
          </div>
          <button className="quick-action-btn" onClick={() => setShowAdd(true)}>
            + Create Department
          </button>
        </div>
      )}

      {/* Add Department Modal */}
      {showAdd && (
        <AddDeptModal
          employees={employees}
          onClose={() => setShowAdd(false)}
          onSaved={handleAdded}
        />
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete Department"
          message={`Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.`}
          confirmLabel={deleting ? 'Deleting…' : 'Delete'}
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
