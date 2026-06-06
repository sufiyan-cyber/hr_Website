/**
 * ResumeScreeningPage — Phase 2
 *
 * Full AI Resume Screening UI for HR Recruiters.
 * 3 steps:
 *   Step 1 — Upload resumes + job description
 *   Step 2 — Ranked candidate cards with scores
 *   Step 3 — Full report modal per candidate
 */

import { useCallback, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import {
  uploadResumes,
  uploadJobDescription,
  screenCandidates,
  updateCandidateStatus,
} from '@services/recruitmentService'

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

const ACCEPT = '.pdf,.docx,.doc'
const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
])

function getScoreColor(score) {
  if (score >= 75) return 'var(--clr-success)'
  if (score >= 50) return 'var(--clr-warning)'
  return 'var(--clr-danger)'
}

function getScoreBg(score) {
  if (score >= 75) return 'hsla(142,71%,45%,0.12)'
  if (score >= 50) return 'hsla(38,92%,50%,0.12)'
  return 'hsla(0,84%,60%,0.1)'
}

function getRecBadgeStyle(rec) {
  const map = {
    'Strong Yes': { bg: 'hsla(142,71%,45%,0.18)', color: 'hsl(142,71%,55%)', border: 'hsla(142,71%,45%,0.35)' },
    'Yes':        { bg: 'hsla(196,80%,50%,0.15)', color: 'hsl(196,80%,60%)', border: 'hsla(196,80%,50%,0.3)' },
    'Maybe':      { bg: 'hsla(38,92%,50%,0.15)',  color: 'hsl(38,92%,60%)',  border: 'hsla(38,92%,50%,0.3)' },
    'No':         { bg: 'hsla(0,84%,60%,0.12)',   color: 'hsl(0,84%,65%)',   border: 'hsla(0,84%,60%,0.3)' },
  }
  return map[rec] || map['Maybe']
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ────────────────────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────────────────────

// Score ring (CSS-only animated arc)
function ScoreRing({ score, size = 88 }) {
  const color = getScoreColor(score)
  const radius = (size - 10) / 2
  const circ = 2 * Math.PI * radius
  const pct = (score / 100) * circ

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="var(--clr-border)" strokeWidth="7"
        />
        {/* Progress */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${pct} ${circ}`}
          style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: size < 80 ? '0.9rem' : '1.25rem', fontWeight: 800, color, lineHeight: 1 }}>
          {score.toFixed(0)}%
        </span>
      </div>
    </div>
  )
}

// Skill chip
function SkillChip({ label, variant = 'matched' }) {
  const styles = {
    matched: { bg: 'hsla(142,71%,45%,0.14)', color: 'hsl(142,71%,60%)', border: 'hsla(142,71%,45%,0.3)' },
    missing: { bg: 'hsla(0,84%,60%,0.1)',    color: 'hsl(0,84%,68%)',   border: 'hsla(0,84%,60%,0.25)' },
    neutral: { bg: 'var(--clr-surface-3)',    color: 'var(--clr-text-2)', border: 'var(--clr-border)' },
  }
  const s = styles[variant]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '3px 10px',
      background: s.bg, color: s.color,
      border: `1px solid ${s.border}`,
      borderRadius: 'var(--r-full)',
      fontSize: '0.72rem', fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>
      {variant === 'matched' && '✓ '}{variant === 'missing' && '✕ '}{label}
    </span>
  )
}

// File row in upload zone
function FileRow({ file, onRemove }) {
  const icon = file.name.endsWith('.pdf') ? '📄' : '📝'
  return (
    <div className="file-row">
      <span className="file-row__icon">{icon}</span>
      <div className="file-row__info">
        <span className="file-row__name">{file.name}</span>
        <span className="file-row__size">{formatBytes(file.size)}</span>
      </div>
      <button className="file-row__remove" onClick={() => onRemove(file.name)} aria-label="Remove file">
        <XIcon />
      </button>
    </div>
  )
}

// Inline SVG icons
const UploadCloudIcon = () => (
  <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5"
       strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <polyline points="16 16 12 12 8 16"/>
    <line x1="12" y1="12" x2="12" y2="21"/>
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
  </svg>
)

const XIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"
       strokeLinecap="round" viewBox="0 0 24 24">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

const AIIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M12 2a10 10 0 1 0 10 10"/>
    <path d="M12 8v4l2 2"/>
    <circle cx="18" cy="6" r="3"/>
  </svg>
)

const ChevronDown = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"
       strokeLinecap="round" viewBox="0 0 24 24">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)

// ────────────────────────────────────────────────────────────────────────────
// Candidate Card
// ────────────────────────────────────────────────────────────────────────────

function CandidateCard({ candidate, rank, onViewReport }) {
  const [expanded, setExpanded] = useState(false)
  const recStyle = getRecBadgeStyle(candidate.recommendation)

  return (
    <div className="candidate-card" style={{ '--rank': rank }}>
      {/* Rank badge */}
      <div className="candidate-card__rank">#{rank}</div>

      <div className="candidate-card__top">
        {/* Avatar */}
        <div className="candidate-card__avatar">
          {(candidate.candidate_name?.[0] || 'C').toUpperCase()}
        </div>

        {/* Name + email + rec */}
        <div className="candidate-card__identity">
          <h3 className="candidate-card__name">{candidate.candidate_name}</h3>
          {candidate.email && (
            <p className="candidate-card__email">{candidate.email}</p>
          )}
          <span className="candidate-card__rec-badge" style={{
            background: recStyle.bg,
            color: recStyle.color,
            border: `1px solid ${recStyle.border}`,
          }}>
            {candidate.recommendation}
          </span>
        </div>

        {/* Score ring */}
        <ScoreRing score={candidate.ai_score} />
      </div>

      {/* AI Summary */}
      {candidate.ai_summary && (
        <p className="candidate-card__summary">{candidate.ai_summary}</p>
      )}

      {/* Skills */}
      <div className="candidate-card__skills">
        {candidate.matched_skills.slice(0, 5).map((s) => (
          <SkillChip key={s} label={s} variant="matched" />
        ))}
        {candidate.missing_skills.slice(0, 3).map((s) => (
          <SkillChip key={s} label={s} variant="missing" />
        ))}
        {(candidate.matched_skills.length > 5) && (
          <SkillChip label={`+${candidate.matched_skills.length - 5} more`} variant="neutral" />
        )}
      </div>

      {/* Actions */}
      <div className="candidate-card__actions">
        <button
          className="candidate-card__btn candidate-card__btn--primary"
          onClick={() => onViewReport(candidate)}
        >
          View Full Report
        </button>
        <button
          className="candidate-card__btn candidate-card__btn--secondary"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
        >
          {expanded ? 'Less ▲' : 'Details ▼'}
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="candidate-card__expanded">
          <div className="candidate-card__expanded-grid">
            {candidate.strengths.length > 0 && (
              <div>
                <p className="candidate-card__expanded-label">💪 Strengths</p>
                <ul className="candidate-card__expanded-list">
                  {candidate.strengths.map((s) => <li key={s}>{s}</li>)}
                </ul>
              </div>
            )}
            {candidate.weaknesses.length > 0 && (
              <div>
                <p className="candidate-card__expanded-label">⚠️ Areas to probe</p>
                <ul className="candidate-card__expanded-list">
                  {candidate.weaknesses.map((w) => <li key={w}>{w}</li>)}
                </ul>
              </div>
            )}
          </div>
          {candidate.recommendation_reason && (
            <p className="candidate-card__expanded-reason">
              <strong>AI Reasoning:</strong> {candidate.recommendation_reason}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Full Report Modal
// ────────────────────────────────────────────────────────────────────────────

function ReportModal({ candidate, onClose, onAction }) {
  const [actionLoading, setActionLoading] = useState(null)
  const recStyle = getRecBadgeStyle(candidate.recommendation)
  const parsed = candidate.parsed_data || {}

  const handleAction = async (stage) => {
    setActionLoading(stage)
    try {
      await updateCandidateStatus(candidate.candidate_id, { stage })
      toast.success(stage === 'shortlisted' ? '✅ Candidate shortlisted!' : '❌ Candidate rejected')
      onAction(candidate.candidate_id, stage)
      onClose()
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Action failed')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true"
         aria-label={`Report for ${candidate.candidate_name}`}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
            <div className="modal-avatar">
              {(candidate.candidate_name?.[0] || 'C').toUpperCase()}
            </div>
            <div>
              <h2 className="modal-title">{candidate.candidate_name}</h2>
              {candidate.email && (
                <p className="modal-email">{candidate.email}</p>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <ScoreRing score={candidate.ai_score} size={72} />
            <button className="modal-close" onClick={onClose} aria-label="Close">
              <XIcon />
            </button>
          </div>
        </div>

        {/* Recommendation */}
        <div className="modal-rec-bar" style={{ background: recStyle.bg, border: `1px solid ${recStyle.border}` }}>
          <span style={{ fontWeight: 700, color: recStyle.color, fontSize: '0.9rem' }}>
            AI Recommendation: {candidate.recommendation}
          </span>
          {candidate.recommendation_reason && (
            <span style={{ color: 'var(--clr-text-2)', fontSize: '0.85rem' }}>
              — {candidate.recommendation_reason}
            </span>
          )}
        </div>

        <div className="modal-body">
          {/* AI Summary */}
          {candidate.ai_summary && (
            <section className="modal-section">
              <h3 className="modal-section-title">🤖 AI Analysis Summary</h3>
              <p className="modal-ai-summary">{candidate.ai_summary}</p>
            </section>
          )}

          {/* Skills grid */}
          <section className="modal-section">
            <h3 className="modal-section-title">Skills Match</h3>
            <div className="modal-skills-grid">
              <div>
                <p className="modal-skills-label">✅ Matched Skills ({candidate.matched_skills.length})</p>
                <div className="modal-chips">
                  {candidate.matched_skills.length > 0
                    ? candidate.matched_skills.map((s) => <SkillChip key={s} label={s} variant="matched" />)
                    : <span style={{ color: 'var(--clr-text-3)', fontSize: '0.875rem' }}>None identified</span>
                  }
                </div>
              </div>
              <div>
                <p className="modal-skills-label">❌ Missing Skills ({candidate.missing_skills.length})</p>
                <div className="modal-chips">
                  {candidate.missing_skills.length > 0
                    ? candidate.missing_skills.map((s) => <SkillChip key={s} label={s} variant="missing" />)
                    : <span style={{ color: 'var(--clr-text-3)', fontSize: '0.875rem' }}>None identified</span>
                  }
                </div>
              </div>
            </div>
          </section>

          {/* Strengths + Weaknesses */}
          <section className="modal-section">
            <div className="modal-sw-grid">
              {candidate.strengths.length > 0 && (
                <div>
                  <h3 className="modal-section-title">💪 Strengths</h3>
                  <ul className="modal-list modal-list--strength">
                    {candidate.strengths.map((s) => <li key={s}>{s}</li>)}
                  </ul>
                </div>
              )}
              {candidate.weaknesses.length > 0 && (
                <div>
                  <h3 className="modal-section-title">⚠️ Areas to Probe</h3>
                  <ul className="modal-list modal-list--weak">
                    {candidate.weaknesses.map((w) => <li key={w}>{w}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </section>

          {/* Parsed resume data */}
          {parsed.education?.length > 0 && (
            <section className="modal-section">
              <h3 className="modal-section-title">🎓 Education</h3>
              {parsed.education.map((edu, i) => (
                <div key={i} className="modal-timeline-item">
                  <strong>{edu.degree}</strong>
                  <span> — {edu.institution}</span>
                  {edu.year && <span style={{ color: 'var(--clr-text-3)', marginLeft: 8 }}>{edu.year}</span>}
                  {edu.gpa && <span style={{ color: 'var(--clr-text-3)', marginLeft: 8 }}>GPA: {edu.gpa}</span>}
                </div>
              ))}
            </section>
          )}

          {parsed.experience?.length > 0 && (
            <section className="modal-section">
              <h3 className="modal-section-title">💼 Experience</h3>
              {parsed.experience.map((exp, i) => (
                <div key={i} className="modal-timeline-item">
                  <strong>{exp.role}</strong>
                  <span> @ {exp.company}</span>
                  {exp.duration && <span style={{ color: 'var(--clr-text-3)', marginLeft: 8 }}>({exp.duration})</span>}
                  {exp.description && <p style={{ color: 'var(--clr-text-2)', fontSize: '0.85rem', marginTop: 4 }}>{exp.description}</p>}
                </div>
              ))}
            </section>
          )}

          {parsed.certifications?.length > 0 && (
            <section className="modal-section">
              <h3 className="modal-section-title">🏅 Certifications</h3>
              <div className="modal-chips">
                {parsed.certifications.map((c) => <SkillChip key={c} label={c} variant="neutral" />)}
              </div>
            </section>
          )}
        </div>

        {/* Action footer */}
        <div className="modal-footer">
          {candidate.file_url && (
            <a
              href={candidate.file_url}
              target="_blank"
              rel="noreferrer"
              className="modal-btn modal-btn--ghost"
            >
              📎 View Resume
            </a>
          )}
          <div style={{ flex: 1 }} />
          <button
            className="modal-btn modal-btn--reject"
            onClick={() => handleAction('rejected')}
            disabled={!!actionLoading}
          >
            {actionLoading === 'rejected' ? <span className="spinner-inline" /> : '✕'} Reject
          </button>
          <button
            className="modal-btn modal-btn--shortlist"
            onClick={() => handleAction('interview_scheduled')}
            disabled={!!actionLoading}
          >
            {actionLoading === 'interview_scheduled' ? <span className="spinner-inline" /> : '✓'} Shortlist
          </button>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Main Page
// ────────────────────────────────────────────────────────────────────────────

export default function ResumeScreeningPage() {
  // ── Step state ────────────────────────────────────────────────────────────
  const [step, setStep] = useState(1) // 1=Upload, 2=Results

  // ── Upload state ──────────────────────────────────────────────────────────
  const [resumeFiles, setResumeFiles]   = useState([])
  const [jdTitle, setJdTitle]           = useState('')
  const [jdText, setJdText]             = useState('')
  const [jdFile, setJdFile]             = useState(null)
  const [isDragging, setIsDragging]     = useState(false)
  const [uploadPct, setUploadPct]       = useState(0)

  // ── Processing state ──────────────────────────────────────────────────────
  const [isProcessing, setIsProcessing] = useState(false)
  const [processStage, setProcessStage] = useState('') // descriptive status text

  // ── Results state ─────────────────────────────────────────────────────────
  const [results, setResults]           = useState(null)   // ScreenResponse
  const [uploadedIds, setUploadedIds]   = useState([])     // resume UUIDs
  const [jobId, setJobId]               = useState(null)

  // ── Modal state ───────────────────────────────────────────────────────────
  const [modalCandidate, setModalCandidate] = useState(null)

  const fileInputRef = useRef(null)
  const jdFileRef    = useRef(null)

  // ── File handling ─────────────────────────────────────────────────────────

  const addFiles = useCallback((incoming) => {
    const valid = []
    const invalid = []
    for (const f of incoming) {
      if (!ALLOWED_TYPES.has(f.type)) { invalid.push(f.name); continue }
      if (f.size > 10 * 1024 * 1024)  { invalid.push(`${f.name} (>10MB)`); continue }
      if (resumeFiles.find((e) => e.name === f.name)) continue
      valid.push(f)
    }
    if (invalid.length) toast.error(`Unsupported: ${invalid.join(', ')}`)
    if (resumeFiles.length + valid.length > 20) {
      toast.error('Maximum 20 files allowed')
      return
    }
    setResumeFiles((prev) => [...prev, ...valid])
  }, [resumeFiles])

  const removeFile = (name) =>
    setResumeFiles((prev) => prev.filter((f) => f.name !== name))

  // Drag & drop
  const onDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    addFiles(Array.from(e.dataTransfer.files))
  }, [addFiles])

  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true) }
  const onDragLeave = () => setIsDragging(false)

  // ── Main pipeline ─────────────────────────────────────────────────────────

  const handleStartScreening = async () => {
    // Validate
    if (resumeFiles.length === 0) { toast.error('Please upload at least one resume.'); return }
    if (!jdTitle.trim())           { toast.error('Please enter a job title.'); return }
    if (!jdText.trim())            { toast.error('Please enter a job description.'); return }

    setIsProcessing(true)
    setUploadPct(0)

    try {
      // ── Step 1: Upload resumes ──
      setProcessStage('Uploading resumes to S3…')
      const uploadResult = await uploadResumes(resumeFiles, setUploadPct)

      if (uploadResult.uploaded.length === 0) {
        const reason = uploadResult.failed[0]?.reason || 'Unknown error'
        toast.error(`All uploads failed: ${reason}`)
        return
      }
      if (uploadResult.failed.length > 0) {
        toast.error(`${uploadResult.failed.length} file(s) failed to upload`)
      }

      const resumeIds = uploadResult.uploaded.map((r) => r.id)
      setUploadedIds(resumeIds)

      // ── Step 2: Save JD ──
      setProcessStage('Saving job description…')
      const jdResult = await uploadJobDescription({
        title: jdTitle.trim(),
        description: jdText.trim(),
        jdFile: jdFile || undefined,
      })
      setJobId(jdResult.id)

      // ── Step 3: AI Screening ──
      setProcessStage(`Running AI analysis on ${resumeIds.length} resume(s)… This may take a minute.`)
      const screenResult = await screenCandidates({
        job_description_id: jdResult.id,
        resume_ids: resumeIds,
      })

      setResults(screenResult)
      setStep(2)
      toast.success(`✨ Screening complete! ${screenResult.total} candidates ranked.`)

    } catch (err) {
      const msg = err?.response?.data?.detail || err.message || 'Screening failed'
      toast.error(msg)
    } finally {
      setIsProcessing(false)
      setProcessStage('')
    }
  }

  const handleReset = () => {
    setStep(1)
    setResumeFiles([])
    setJdTitle('')
    setJdText('')
    setJdFile(null)
    setResults(null)
    setUploadedIds([])
    setJobId(null)
    setUploadPct(0)
  }

  const handleCandidateAction = (candidateId, stage) => {
    setResults((prev) => ({
      ...prev,
      candidates: prev.candidates.filter((c) => c.candidate_id !== candidateId),
      total: prev.total - 1,
    }))
  }

  // ────────────────────────────────────────────────────────────────────────
  // Render — Step 1: Upload
  // ────────────────────────────────────────────────────────────────────────

  if (step === 1) {
    return (
      <div className="screening-page">
        {/* Page header */}
        <div className="screening-page__header">
          <div>
            <div className="screening-page__eyebrow">
              <AIIcon /> AI-Powered
            </div>
            <h1 className="screening-page__title">Resume Screening</h1>
            <p className="screening-page__sub">
              Upload resumes and a job description. Our AI will rank candidates by fit score,
              extract skills, and generate hiring recommendations.
            </p>
          </div>
          {/* Stats chips */}
          <div className="screening-page__stat-chips">
            {[
              { icon: '🤖', label: 'Gemini AI' },
              { icon: '📊', label: 'Semantic Scoring' },
              { icon: '⚡', label: 'Instant Insights' },
            ].map((s) => (
              <span key={s.label} className="stat-chip">{s.icon} {s.label}</span>
            ))}
          </div>
        </div>

        <div className="screening-upload-grid">
          {/* ── Resume Upload Zone ── */}
          <section className="upload-section">
            <h2 className="upload-section__title">
              📄 Upload Resumes
              <span className="upload-section__badge">{resumeFiles.length} / 20</span>
            </h2>

            {/* Drop zone */}
            <div
              className={`dropzone ${isDragging ? 'dropzone--active' : ''} ${resumeFiles.length > 0 ? 'dropzone--has-files' : ''}`}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              aria-label="Drop resumes here or click to browse"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
            >
              <div className="dropzone__icon"><UploadCloudIcon /></div>
              <p className="dropzone__primary">
                {isDragging ? 'Drop files here' : 'Drag & drop resumes here'}
              </p>
              <p className="dropzone__secondary">PDF or DOCX · Max 10 MB per file · Up to 20 files</p>
              <button
                type="button"
                className="dropzone__browse-btn"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
              >
                Browse Files
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT}
                multiple
                className="sr-only"
                onChange={(e) => addFiles(Array.from(e.target.files))}
              />
            </div>

            {/* File list */}
            {resumeFiles.length > 0 && (
              <div className="file-list">
                {resumeFiles.map((f) => (
                  <FileRow key={f.name} file={f} onRemove={removeFile} />
                ))}
              </div>
            )}
          </section>

          {/* ── Job Description ── */}
          <section className="upload-section">
            <h2 className="upload-section__title">📋 Job Description</h2>

            <div className="form-group">
              <label className="form-label" htmlFor="jd-title">Job Title *</label>
              <input
                id="jd-title"
                className="form-input form-input--no-icon"
                type="text"
                placeholder="e.g. Senior Full-Stack Engineer"
                value={jdTitle}
                onChange={(e) => setJdTitle(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="jd-text">Job Description *</label>
              <textarea
                id="jd-text"
                className="jd-textarea"
                placeholder="Paste the full job description, requirements, and responsibilities here…"
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                rows={10}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--clr-text-3)', marginTop: 4 }}>
                {jdText.length} characters — more detail = better matching accuracy
              </p>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="jd-file">
                Optional: Attach JD PDF
              </label>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => jdFileRef.current?.click()}
                >
                  📎 {jdFile ? jdFile.name : 'Attach PDF'}
                </button>
                {jdFile && (
                  <button
                    type="button"
                    onClick={() => setJdFile(null)}
                    style={{ color: 'var(--clr-danger)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Remove
                  </button>
                )}
                <input
                  ref={jdFileRef}
                  type="file"
                  accept=".pdf"
                  className="sr-only"
                  onChange={(e) => setJdFile(e.target.files[0] || null)}
                />
              </div>
            </div>
          </section>
        </div>

        {/* ── Processing status / CTA ── */}
        <div className="screening-cta">
          {isProcessing ? (
            <div className="screening-progress">
              <div className="screening-progress__bar-wrap">
                <div
                  className="screening-progress__bar"
                  style={{ width: `${uploadPct || 15}%` }}
                />
              </div>
              <p className="screening-progress__label">
                <span className="spinner-inline" style={{ width: 14, height: 14 }} />
                {processStage}
              </p>
            </div>
          ) : (
            <button
              id="start-screening-btn"
              className="btn-primary screening-cta__btn"
              onClick={handleStartScreening}
              disabled={resumeFiles.length === 0 || !jdTitle || !jdText}
            >
              <AIIcon />
              Start AI Screening ({resumeFiles.length} resume{resumeFiles.length !== 1 ? 's' : ''})
            </button>
          )}
        </div>
      </div>
    )
  }

  // ────────────────────────────────────────────────────────────────────────
  // Render — Step 2: Results
  // ────────────────────────────────────────────────────────────────────────

  return (
    <div className="screening-page">
      {/* Results header */}
      <div className="screening-results-header">
        <div>
          <p className="screening-page__eyebrow"><AIIcon /> Screening Complete</p>
          <h1 className="screening-page__title">
            {results.job_title}
            <span className="results-count-badge">{results.total} candidates</span>
          </h1>
        </div>
        <button className="btn-secondary" onClick={handleReset}>
          ← New Screening
        </button>
      </div>

      {/* Score legend */}
      <div className="score-legend">
        <span className="score-legend__item score-legend__item--high">● High fit ≥75%</span>
        <span className="score-legend__item score-legend__item--mid">● Good fit ≥50%</span>
        <span className="score-legend__item score-legend__item--low">● Low fit &lt;50%</span>
      </div>

      {/* Candidate cards grid */}
      <div className="candidates-grid">
        {results.candidates.map((c, i) => (
          <CandidateCard
            key={c.candidate_id}
            candidate={c}
            rank={i + 1}
            onViewReport={setModalCandidate}
          />
        ))}
      </div>

      {/* Report Modal */}
      {modalCandidate && (
        <ReportModal
          candidate={modalCandidate}
          onClose={() => setModalCandidate(null)}
          onAction={handleCandidateAction}
        />
      )}
    </div>
  )
}
