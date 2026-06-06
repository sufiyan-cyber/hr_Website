/**
 * CandidateDetailPage — Full Candidate Profile with Stage History
 * Reads :id from URL params. Fetches from /candidates/:id
 */

import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchCandidate, updateCandidateStage } from '@services/candidateService'

const VALID_STAGES = [
  'applied', 'screening', 'shortlisted',
  'interview_scheduled', 'interviewed',
  'offer_extended', 'offer_accepted', 'offer_rejected',
  'hired', 'rejected',
]

const STAGE_CFG = {
  applied:             { color: 'hsl(215,20%,55%)',  bg: 'hsl(215,20%,55%,0.12)', label: 'Applied'            },
  screening:           { color: 'hsl(239,84%,67%)',  bg: 'hsl(239,84%,67%,0.12)', label: 'Screening'          },
  shortlisted:         { color: 'hsl(142,71%,45%)',  bg: 'hsl(142,71%,50%,0.12)', label: 'Shortlisted'        },
  interview_scheduled: { color: 'hsl(195,80%,45%)',  bg: 'hsl(195,80%,55%,0.12)', label: 'Interview Scheduled'},
  interviewed:         { color: 'hsl(262,83%,55%)',  bg: 'hsl(262,83%,68%,0.12)', label: 'Interviewed'        },
  offer_extended:      { color: 'hsl(38,92%,45%)',   bg: 'hsl(38,92%,55%,0.12)',  label: 'Offer Extended'     },
  offer_accepted:      { color: 'hsl(142,71%,38%)',  bg: 'hsl(142,71%,50%,0.15)', label: 'Offer Accepted'     },
  offer_rejected:      { color: 'hsl(0,72%,50%)',    bg: 'hsl(0,72%,60%,0.12)',   label: 'Offer Rejected'     },
  hired:               { color: 'hsl(142,71%,35%)',  bg: 'hsl(142,71%,50%,0.18)', label: 'Hired ✓'            },
  rejected:            { color: 'hsl(0,72%,48%)',    bg: 'hsl(0,72%,60%,0.12)',   label: 'Rejected'           },
}

function StageBadge({ status }) {
  const cfg = STAGE_CFG[status] || STAGE_CFG.screening
  return (
    <span style={{
      padding: '4px 14px', borderRadius: 20,
      background: cfg.bg, color: cfg.color,
      fontSize: '0.8rem', fontWeight: 700,
    }}>
      {cfg.label}
    </span>
  )
}

function ScoreRing({ score }) {
  const pct = Math.min(100, Math.max(0, Number(score) || 0))
  const color = pct >= 80 ? 'hsl(142,71%,50%)' : pct >= 60 ? 'hsl(239,84%,67%)' : 'hsl(38,92%,55%)'
  return (
    <div style={{
      width: 80, height: 80, borderRadius: '50%',
      background: `conic-gradient(${color} ${pct}%, var(--clr-surface-3) 0)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <div style={{
        width: 60, height: 60, borderRadius: '50%',
        background: 'var(--clr-surface-1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column',
      }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 800, color, lineHeight: 1 }}>{pct}%</div>
        <div style={{ fontSize: '0.55rem', color: 'var(--clr-text-3)' }}>AI Score</div>
      </div>
    </div>
  )
}

export default function CandidateDetailPage() {
  const { id } = useParams()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [stage,   setStage]   = useState('')
  const [notes,   setNotes]   = useState('')
  const [saving,  setSaving]  = useState(false)
  const [stageMsg, setStageMsg] = useState(null)

  useEffect(() => {
    if (!id) return
    fetchCandidate(id)
      .then(d => {
        setData(d)
        setStage(d?.status || 'screening')
      })
      .catch(err => setError(err.response?.data?.detail || err.message))
      .finally(() => setLoading(false))
  }, [id])

  const handleStageUpdate = async () => {
    if (!stage) return
    setSaving(true); setStageMsg(null)
    try {
      await updateCandidateStage(id, stage, notes)
      setData(prev => ({ ...prev, status: stage }))
      setStageMsg({ type: 'success', text: `Stage updated to "${STAGE_CFG[stage]?.label || stage}"` })
      setNotes('')
    } catch (e) {
      setStageMsg({ type: 'error', text: e.response?.data?.detail || e.message })
    } finally {
      setSaving(false)
    }
  }

  if (error) {
    return (
      <div className="dash-page">
        <div className="dash-error">⚠️ {error}</div>
        <Link to="/candidates" style={{ color: 'hsl(239,84%,67%)', fontSize: '0.875rem' }}>
          ← Back to Candidates
        </Link>
      </div>
    )
  }

  const profile   = data?.profile    || {}
  const history   = data?.history    || []
  const aiSummary = data?.ai_summary || {}

  return (
    <div className="dash-page">

      {/* ── Breadcrumb ── */}
      <div style={{ marginBottom: '0.75rem' }}>
        <Link to="/candidates" style={{
          color: 'hsl(239,84%,67%)', fontSize: '0.82rem',
          textDecoration: 'none', fontWeight: 600,
        }}>
          ← Candidates
        </Link>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton-pulse" style={{ height: 120, borderRadius: 14 }} />
          ))}
        </div>
      ) : (
        <>
          {/* ── Profile Card ── */}
          <div style={{
            background: 'linear-gradient(135deg, hsl(239,84%,67%,0.1), hsl(262,83%,68%,0.07))',
            border: '1px solid hsl(239,84%,67%,0.2)',
            borderRadius: 16, padding: '1.75rem 2rem', marginBottom: '1.5rem',
            display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap',
          }}>
            {/* Avatar */}
            <div style={{
              width: 60, height: 60, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, hsl(239,84%,67%), hsl(262,83%,68%))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem', fontWeight: 700, color: '#fff',
            }}>
              {(profile.candidate_name || data?.name || 'C')[0]?.toUpperCase()}
            </div>

            {/* Info */}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--clr-text-1)' }}>
                {profile.candidate_name || data?.name || 'Unknown Candidate'}
              </div>
              <div style={{ fontSize: '0.83rem', color: 'var(--clr-text-3)', marginTop: 4 }}>
                {profile.email || data?.email}
              </div>
              <div style={{ marginTop: 10 }}>
                <StageBadge status={data?.status} />
              </div>
            </div>

            {/* Score ring */}
            <ScoreRing score={data?.ai_score} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

            {/* ── AI Summary ── */}
            <div>
              {/* Skills */}
              {(aiSummary.matched_skills || []).length > 0 && (
                <div className="chart-panel" style={{ marginBottom: '1rem' }}>
                  <div className="chart-panel__header">
                    <h3 className="chart-panel__title">✅ Matched Skills</h3>
                  </div>
                  <div className="chart-panel__body" style={{ minHeight: 'unset', padding: '0.5rem 1.5rem 1.25rem' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {aiSummary.matched_skills.map((s, i) => (
                        <span key={i} style={{
                          padding: '3px 12px', borderRadius: 20,
                          background: 'hsl(142,71%,50%,0.12)', color: 'hsl(142,71%,40%)',
                          fontSize: '0.78rem', fontWeight: 600,
                        }}>{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Missing skills */}
              {(aiSummary.missing_skills || []).length > 0 && (
                <div className="chart-panel" style={{ marginBottom: '1rem' }}>
                  <div className="chart-panel__header">
                    <h3 className="chart-panel__title">❌ Missing Skills</h3>
                  </div>
                  <div className="chart-panel__body" style={{ minHeight: 'unset', padding: '0.5rem 1.5rem 1.25rem' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {aiSummary.missing_skills.map((s, i) => (
                        <span key={i} style={{
                          padding: '3px 12px', borderRadius: 20,
                          background: 'hsl(0,72%,60%,0.12)', color: 'hsl(0,72%,50%)',
                          fontSize: '0.78rem', fontWeight: 600,
                        }}>{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* AI recommendation */}
              {aiSummary.recommendation && (
                <div className="chart-panel">
                  <div className="chart-panel__header">
                    <h3 className="chart-panel__title">🤖 AI Recommendation</h3>
                  </div>
                  <div className="chart-panel__body" style={{ minHeight: 'unset', padding: '0.5rem 1.5rem 1.25rem' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--clr-text-2)', lineHeight: 1.6 }}>
                      <strong>{aiSummary.recommendation}</strong>
                      {aiSummary.recommendation_reason && (
                        <span> — {aiSummary.recommendation_reason}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {!aiSummary.matched_skills && !aiSummary.recommendation && (
                <div className="chart-panel">
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--clr-text-3)', fontSize: '0.875rem' }}>
                    No AI analysis data available
                  </div>
                </div>
              )}
            </div>

            {/* ── Stage Update + History ── */}
            <div>
              <div className="chart-panel" style={{ marginBottom: '1rem' }}>
                <div className="chart-panel__header">
                  <h3 className="chart-panel__title">🔄 Update Stage</h3>
                </div>
                <div className="chart-panel__body" style={{ minHeight: 'unset', padding: '0.5rem 1.5rem 1.25rem' }}>
                  {stageMsg && (
                    <div style={{
                      padding: '0.6rem 1rem', borderRadius: 8, marginBottom: '0.75rem',
                      fontSize: '0.82rem', fontWeight: 600,
                      background: stageMsg.type === 'success'
                        ? 'hsl(142,71%,50%,0.12)' : 'hsl(0,72%,60%,0.12)',
                      color: stageMsg.type === 'success'
                        ? 'hsl(142,71%,40%)' : 'hsl(0,72%,50%)',
                    }}>
                      {stageMsg.text}
                    </div>
                  )}
                  <select
                    className="form-input form-input--no-icon"
                    value={stage}
                    onChange={e => setStage(e.target.value)}
                    style={{ width: '100%', marginBottom: '0.75rem' }}
                  >
                    {VALID_STAGES.map(s => (
                      <option key={s} value={s}>{STAGE_CFG[s]?.label || s}</option>
                    ))}
                  </select>
                  <textarea
                    className="form-input form-input--no-icon"
                    placeholder="Optional notes…"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={2}
                    style={{ width: '100%', resize: 'vertical', marginBottom: '0.75rem' }}
                  />
                  <button
                    className="btn-primary"
                    onClick={handleStageUpdate}
                    disabled={saving}
                    style={{ width: '100%' }}
                  >
                    {saving ? 'Updating…' : '✓ Update Stage'}
                  </button>
                </div>
              </div>

              {/* History */}
              {history.length > 0 && (
                <div className="chart-panel">
                  <div className="chart-panel__header">
                    <h3 className="chart-panel__title">📋 Stage History</h3>
                  </div>
                  <div className="chart-panel__body" style={{ minHeight: 'unset', padding: '0.5rem 1.5rem 1.25rem' }}>
                    {history.map((h, i) => (
                      <div key={i} style={{
                        display: 'flex', gap: 10, alignItems: 'flex-start',
                        padding: '0.6rem 0',
                        borderBottom: i < history.length - 1 ? '1px solid var(--clr-border)' : 'none',
                      }}>
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%', marginTop: 5,
                          background: STAGE_CFG[h.stage]?.color || 'hsl(239,84%,67%)',
                          flexShrink: 0,
                        }} />
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--clr-text-1)' }}>
                            {STAGE_CFG[h.stage]?.label || h.stage}
                          </div>
                          {h.notes && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-3)', marginTop: 2 }}>
                              {h.notes}
                            </div>
                          )}
                          <div style={{ fontSize: '0.7rem', color: 'var(--clr-text-3)', marginTop: 3 }}>
                            {h.updated_at ? new Date(h.updated_at).toLocaleString('en-IN') : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </>
      )}

    </div>
  )
}
