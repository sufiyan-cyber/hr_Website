/**
 * PipelinePage — Phase 4
 *
 * Kanban-style candidate pipeline board.
 * Columns: Applied | Screening | Shortlisted | Interview | Selected | Rejected | Onboarding
 * - Drag cards via move buttons (no external DnD library needed)
 * - Click card → detail panel slides in from the right
 * - Full candidate AI report, notes, stage history, action buttons
 */

import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import EmptyState from '@components/EmptyState'
import ConfirmDialog from '@components/ConfirmDialog'
import {
  fetchCandidates,
  fetchCandidate,
  updateCandidateStage,
  addCandidateNote,
} from '@services/candidateService'

// ── Pipeline column config ────────────────────────────────────────────────────
const COLUMNS = [
  { key: 'applied',              label: 'Applied',      color: 'hsl(215,20%,55%)' },
  { key: 'screening',            label: 'Screening',    color: 'hsl(38,92%,55%)'  },
  { key: 'shortlisted',          label: 'Shortlisted',  color: 'hsl(239,84%,67%)' },
  { key: 'interview_scheduled',  label: 'Interview',    color: 'hsl(262,83%,68%)' },
  { key: 'hired',                label: 'Selected',     color: 'hsl(142,71%,50%)' },
  { key: 'rejected',             label: 'Rejected',     color: 'hsl(0,72%,60%)'   },
  { key: 'onboarding',           label: 'Onboarding',   color: 'hsl(195,80%,55%)' },
]

// Stages you can move forward/back to from a given column
const NEXT_STAGES = {
  applied:             ['screening', 'rejected'],
  screening:           ['shortlisted', 'rejected'],
  shortlisted:         ['interview_scheduled', 'rejected'],
  interview_scheduled: ['hired', 'rejected'],
  hired:               ['onboarding'],
  rejected:            ['screening'],
  onboarding:          [],
}

// ── Score color helper ────────────────────────────────────────────────────────
const scoreColor = (s) =>
  s >= 80 ? 'hsl(142,71%,50%)' : s >= 60 ? 'hsl(239,84%,67%)' : 'hsl(38,92%,55%)'

// ── Candidate card ────────────────────────────────────────────────────────────
function CandidateCard({ candidate, onSelect, onMove, moving }) {
  const score = Math.round(candidate.ai_score || 0)
  const initials = (candidate.candidate_name || 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div
      className="pipeline-card"
      onClick={() => onSelect(candidate.id)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onSelect(candidate.id)}
    >
      <div className="pipeline-card__top">
        <div className="pipeline-card__avatar">{initials}</div>
        <div className="pipeline-card__info">
          <div className="pipeline-card__name">{candidate.candidate_name}</div>
          <div className="pipeline-card__role">{candidate.job_title || 'Open Role'}</div>
        </div>
        <div
          className="pipeline-card__score"
          style={{ color: scoreColor(score), borderColor: scoreColor(score) }}
        >
          {score}%
        </div>
      </div>

      {/* Move buttons */}
      {(NEXT_STAGES[candidate.status] || []).length > 0 && (
        <div
          className="pipeline-card__actions"
          onClick={e => e.stopPropagation()}
        >
          {(NEXT_STAGES[candidate.status] || []).map(stage => {
            const col = COLUMNS.find(c => c.key === stage)
            const isReject = stage === 'rejected'
            return (
              <button
                key={stage}
                disabled={moving}
                onClick={() => onMove(candidate.id, stage)}
                style={{
                  padding: '3px 10px',
                  borderRadius: 5,
                  border: 'none',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: moving ? 'not-allowed' : 'pointer',
                  background: isReject
                    ? 'hsl(0,72%,60%,0.15)'
                    : `${col?.color}22`,
                  color: isReject ? 'hsl(0,72%,65%)' : col?.color,
                  transition: 'opacity 0.15s',
                  opacity: moving ? 0.5 : 1,
                }}
              >
                → {col?.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Kanban column ─────────────────────────────────────────────────────────────
function KanbanColumn({ column, candidates, onSelect, onMove, moving }) {
  return (
    <div className="kanban-col">
      <div className="kanban-col__header">
        <span
          className="kanban-col__dot"
          style={{ background: column.color }}
        />
        <span className="kanban-col__label">{column.label}</span>
        <span className="kanban-col__count">{candidates.length}</span>
      </div>
      <div className="kanban-col__body">
        {candidates.length === 0 ? (
          <div className="kanban-col__empty">No candidates</div>
        ) : (
          candidates.map(c => (
            <CandidateCard
              key={c.id}
              candidate={c}
              onSelect={onSelect}
              onMove={onMove}
              moving={moving}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ── Detail panel ──────────────────────────────────────────────────────────────
function DetailPanel({ candidateId, onClose, onStageChange }) {
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [note, setNote]         = useState('')
  const [sending, setSending]   = useState(false)
  const [moving, setMoving]     = useState(false)
  const [activeTab, setActiveTab] = useState('report')
  const [confirm, setConfirm]   = useState(null)

  useEffect(() => {
    setLoading(true)
    setData(null)
    fetchCandidate(candidateId)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [candidateId])

  const handleNote = async () => {
    if (!note.trim()) return
    setSending(true)
    try {
      await addCandidateNote(candidateId, note.trim())
      setNote('')
      const fresh = await fetchCandidate(candidateId)
      setData(fresh)
    } catch {}
    setSending(false)
  }

  const doStageMove = async (stage) => {
    setMoving(true)
    try {
      await updateCandidateStage(candidateId, stage)
      onStageChange()
      const fresh = await fetchCandidate(candidateId)
      setData(fresh)
    } catch {}
    setMoving(false)
  }

  const handleStageMove = (stage) => {
    if (stage === 'rejected') {
      setConfirm({
        title: 'Reject Candidate',
        message: 'Are you sure you want to reject this candidate? This will move them to the Rejected stage.',
        confirmLabel: 'Reject',
        variant: 'danger',
        icon: '⚠️',
        onConfirm: () => doStageMove(stage),
      })
    } else {
      doStageMove(stage)
    }
  }

  const score = Math.round(data?.ai_score || 0)
  const name  = data?.candidate_name || '…'
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-panel" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="detail-panel__header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="detail-panel__avatar">{loading ? '…' : initials}</div>
            <div>
              <div className="detail-panel__name">{loading ? 'Loading…' : name}</div>
              <div className="detail-panel__role">{data?.job_title || 'Candidate'}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
            {!loading && (
              <div
                style={{
                  fontWeight: 800,
                  fontSize: '1.1rem',
                  color: scoreColor(score),
                }}
              >
                {score}%
              </div>
            )}
            <button className="detail-panel__close" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Stage Actions */}
        {!loading && (NEXT_STAGES[data?.status] || []).length > 0 && (
          <div className="detail-panel__stages">
            {(NEXT_STAGES[data?.status] || []).map(stage => {
              const col = COLUMNS.find(c => c.key === stage)
              const isReject = stage === 'rejected'
              return (
                <button
                  key={stage}
                  disabled={moving}
                  onClick={() => handleStageMove(stage)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 8,
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: moving ? 'not-allowed' : 'pointer',
                    background: isReject
                      ? 'hsl(0,72%,60%,0.15)'
                      : `${col?.color}22`,
                    color: isReject ? 'hsl(0,72%,65%)' : col?.color,
                    opacity: moving ? 0.6 : 1,
                    transition: 'all 0.2s',
                  }}
                >
                  → {col?.label}
                </button>
              )
            })}
          </div>
        )}

        {/* Tabs */}
        <div className="detail-panel__tabs">
          {['report', 'notes', 'history'].map(t => (
            <button
              key={t}
              className={`detail-panel__tab${activeTab === t ? ' detail-panel__tab--active' : ''}`}
              onClick={() => setActiveTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab body */}
        <div className="detail-panel__body">
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '1rem' }}>
              {[1,2,3,4,5].map(i => (
                <div key={i} className="skeleton-pulse" style={{ height: '1.2rem', borderRadius: 6 }} />
              ))}
            </div>
          ) : activeTab === 'report' ? (
            <AIReport data={data} />
          ) : activeTab === 'notes' ? (
            <NotesTab
              notes={data?.notes || []}
              note={note}
              setNote={setNote}
              onSend={handleNote}
              sending={sending}
            />
          ) : (
            <HistoryTab history={data?.stage_history || []} />
          )}
        </div>

      </div>
      {confirm && <ConfirmDialog {...confirm} onCancel={() => setConfirm(null)} />}
    </div>
  )
}

// ── AI Report tab ─────────────────────────────────────────────────────────────
function AIReport({ data }) {
  let summary = {}
  if (data?.ai_summary) {
    try {
      summary = JSON.parse(data.ai_summary)
    } catch {
      summary = { recommendation_reason: data.ai_summary }
    }
  }

  const Section = ({ title, children }) => (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{
        fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: 'var(--clr-text-3)', marginBottom: 8,
      }}>
        {title}
      </div>
      {children}
    </div>
  )

  const Chip = ({ text, color }) => (
    <span style={{
      padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
      background: `${color}18`, color, marginRight: 4, marginBottom: 4, display: 'inline-block',
    }}>
      {text}
    </span>
  )

  return (
    <div>
      {/* Profile info */}
      <Section title="Contact">
        <div style={{ fontSize: '0.85rem', color: 'var(--clr-text-2)' }}>
          📧 {data.email || 'N/A'}
        </div>
        {data.file_url && (
          <a
            href={data.file_url}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              marginTop: 6, fontSize: '0.8rem', color: 'hsl(239,84%,67%)',
              textDecoration: 'none', fontWeight: 600,
            }}
          >
            📄 View Resume ↗
          </a>
        )}
      </Section>

      {/* AI Summary */}
      {summary.recommendation_reason && (
        <Section title="AI Assessment">
          <div style={{
            padding: '0.875rem 1rem',
            background: 'hsl(239,84%,67%,0.07)',
            border: '1px solid hsl(239,84%,67%,0.2)',
            borderRadius: 10,
            fontSize: '0.875rem',
            lineHeight: 1.6,
            color: 'var(--clr-text-1)',
          }}>
            {summary.recommendation_reason}
          </div>
        </Section>
      )}

      {/* Matched skills */}
      {(summary.matched_skills || data.matched_skills || []).length > 0 && (
        <Section title="Matched Skills">
          <div>
            {(summary.matched_skills || data.matched_skills || []).map((s, i) => (
              <Chip key={i} text={s} color="hsl(142,71%,50%)" />
            ))}
          </div>
        </Section>
      )}

      {/* Missing skills */}
      {(summary.missing_skills || data.missing_skills || []).length > 0 && (
        <Section title="Missing Skills">
          <div>
            {(summary.missing_skills || data.missing_skills || []).map((s, i) => (
              <Chip key={i} text={s} color="hsl(0,72%,60%)" />
            ))}
          </div>
        </Section>
      )}

      {/* Strengths + Weaknesses */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {(summary.strengths || data.strengths || []).length > 0 && (
          <Section title="Strengths">
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(summary.strengths || data.strengths || []).map((s, i) => (
                <li key={i} style={{
                  fontSize: '0.8rem', color: 'var(--clr-text-2)',
                  padding: '4px 8px', borderRadius: 6,
                  background: 'hsl(142,71%,50%,0.07)',
                }}>
                  ✓ {s}
                </li>
              ))}
            </ul>
          </Section>
        )}
        {(summary.weaknesses || data.weaknesses || []).length > 0 && (
          <Section title="Areas to Improve">
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(summary.weaknesses || data.weaknesses || []).map((s, i) => (
                <li key={i} style={{
                  fontSize: '0.8rem', color: 'var(--clr-text-2)',
                  padding: '4px 8px', borderRadius: 6,
                  background: 'hsl(38,92%,55%,0.07)',
                }}>
                  △ {s}
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    </div>
  )
}

// ── Notes tab ─────────────────────────────────────────────────────────────────
function NotesTab({ notes, note, setNote, onSend, sending }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: 12 }}>
        {notes.length === 0 ? (
          <div style={{
            textAlign: 'center', color: 'var(--clr-text-3)',
            padding: '2rem 0', fontSize: '0.875rem',
          }}>
            No notes yet — add the first one below.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {notes.map((n, i) => (
              <div key={i} style={{
                padding: '0.75rem 1rem',
                background: 'var(--clr-surface-2)',
                border: '1px solid var(--clr-border)',
                borderRadius: 10,
              }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--clr-text-1)', lineHeight: 1.5 }}>
                  {n.notes || n.note}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--clr-text-3)', marginTop: 4 }}>
                  {n.updated_at ? new Date(n.updated_at).toLocaleString() : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Add a note…"
          rows={2}
          style={{
            flex: 1,
            padding: '0.625rem 0.875rem',
            background: 'var(--clr-surface-2)',
            border: '1px solid var(--clr-border)',
            borderRadius: 8,
            color: 'var(--clr-text-1)',
            fontSize: '0.85rem',
            resize: 'none',
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />
        <button
          onClick={onSend}
          disabled={sending || !note.trim()}
          style={{
            padding: '0 1rem',
            borderRadius: 8,
            border: 'none',
            background: sending || !note.trim()
              ? 'var(--clr-surface-3)'
              : 'linear-gradient(135deg, hsl(239,84%,67%), hsl(262,83%,68%))',
            color: '#fff',
            fontWeight: 700,
            cursor: sending || !note.trim() ? 'not-allowed' : 'pointer',
            fontSize: '0.8rem',
            transition: 'all 0.2s',
          }}
        >
          {sending ? '…' : 'Send'}
        </button>
      </div>
    </div>
  )
}

// ── History tab ───────────────────────────────────────────────────────────────
function HistoryTab({ history }) {
  return (
    <div>
      {history.length === 0 ? (
        <div style={{
          textAlign: 'center', color: 'var(--clr-text-3)',
          padding: '2rem 0', fontSize: '0.875rem',
        }}>
          No stage history yet.
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          {/* Timeline line */}
          <div style={{
            position: 'absolute', left: 11, top: 0, bottom: 0,
            width: 2, background: 'var(--clr-border)',
          }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {history.map((h, i) => {
              const col = COLUMNS.find(c => c.key === h.stage)
              return (
                <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                    background: col?.color || 'var(--clr-surface-3)',
                    border: '2px solid var(--clr-surface)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative', zIndex: 1,
                  }} />
                  <div style={{ paddingTop: 2 }}>
                    <div style={{
                      fontWeight: 700, fontSize: '0.85rem', color: 'var(--clr-text-1)',
                    }}>
                      {col?.label || h.stage}
                    </div>
                    {h.notes && (
                      <div style={{
                        fontSize: '0.78rem', color: 'var(--clr-text-2)',
                        marginTop: 2, lineHeight: 1.4,
                      }}>
                        {h.notes}
                      </div>
                    )}
                    <div style={{
                      fontSize: '0.7rem', color: 'var(--clr-text-3)', marginTop: 3,
                    }}>
                      {h.updated_at ? new Date(h.updated_at).toLocaleString() : ''}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PipelinePage() {
  const navigate = useNavigate()
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [moving, setMoving]         = useState(false)
  const [confirm, setConfirm]       = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    fetchCandidates()
      .then(data => setCandidates(Array.isArray(data) ? data : data.candidates || []))
      .catch(err => setError(err.response?.data?.detail || err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const doMove = async (id, stage) => {
    setMoving(true)
    try {
      await updateCandidateStage(id, stage)
      setCandidates(prev =>
        prev.map(c => c.id === id ? { ...c, status: stage } : c)
      )
    } catch {}
    setMoving(false)
  }

  const handleMove = (id, stage) => {
    if (stage === 'rejected') {
      setConfirm({
        title: 'Reject Candidate',
        message: 'Are you sure you want to reject this candidate? This will move them to the Rejected stage.',
        confirmLabel: 'Reject',
        variant: 'danger',
        icon: '⚠️',
        onConfirm: () => doMove(id, stage),
      })
    } else {
      doMove(id, stage)
    }
  }

  const byStage = (stageKey) =>
    candidates.filter(c => c.status === stageKey)

  const totalCount = candidates.length

  return (
    <div className="dash-page">

      {/* Header */}
      <div className="dash-page__header">
        <div>
          <h1 className="dash-page__title">Candidate Pipeline</h1>
          <p className="dash-page__subtitle">
            {loading ? 'Loading…' : `${totalCount} candidates across all stages`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {COLUMNS.map(col => {
            const n = byStage(col.key).length
            return n > 0 ? (
              <div key={col.key} style={{
                padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700,
                background: `${col.color}18`, color: col.color,
              }}>
                {col.label} · {n}
              </div>
            ) : null
          })}
        </div>
      </div>

      {error && <div className="dash-error">⚠️ {error}</div>}

      {/* Kanban board */}
      {!loading && totalCount === 0 ? (
        <EmptyState
          illustration="📋"
          title="No candidates in pipeline"
          subtitle="There are no candidates currently in the recruitment pipeline. Upload and screen resumes to get started."
          actionLabel="Go to Recruitment"
          onAction={() => navigate('/recruitment')}
        />
      ) : (
        <div className="kanban-board">
          {loading ? (
            COLUMNS.map(col => (
              <div key={col.key} className="kanban-col">
                <div className="kanban-col__header">
                  <span className="kanban-col__dot" style={{ background: col.color }} />
                  <span className="kanban-col__label">{col.label}</span>
                </div>
                <div className="kanban-col__body">
                  {[1,2].map(i => (
                    <div key={i} className="skeleton-pulse" style={{ height: '90px', borderRadius: 12, marginBottom: 8 }} />
                  ))}
                </div>
              </div>
            ))
          ) : (
            COLUMNS.map(col => (
              <KanbanColumn
                key={col.key}
                column={col}
                candidates={byStage(col.key)}
                onSelect={setSelectedId}
                onMove={handleMove}
                moving={moving}
              />
            ))
          )}
        </div>
      )}

      {/* Detail panel */}
      {selectedId && (
        <DetailPanel
          candidateId={selectedId}
          onClose={() => setSelectedId(null)}
          onStageChange={load}
        />
      )}
      {confirm && <ConfirmDialog {...confirm} onCancel={() => setConfirm(null)} />}

    </div>
  )
}
