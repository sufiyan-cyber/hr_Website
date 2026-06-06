/**
 * Recruitment API Service — Phase 2
 * Wraps all FastAPI /recruitment endpoints.
 */

import api from './api'

/**
 * Upload multiple resume files (PDF/DOCX).
 * Uses multipart/form-data.
 * @param {File[]} files
 * @param {(pct: number) => void} onProgress
 * @returns {Promise<{ uploaded, failed }>}
 */
export async function uploadResumes(files, onProgress) {
  const form = new FormData()
  for (const f of files) form.append('files', f)

  const { data } = await api.post('/api/v1/recruitment/upload-resumes', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (evt) => {
      if (evt.total && onProgress) {
        onProgress(Math.round((evt.loaded / evt.total) * 100))
      }
    },
  })
  return data
}

/**
 * Save a job description (text-based).
 * @param {{ title, description, requirements }} payload
 * @returns {Promise<{ id, title, message }>}
 */
export async function uploadJobDescription(payload) {
  const form = new FormData()
  form.append('title', payload.title)
  form.append('description', payload.description)
  if (payload.requirements) form.append('requirements', payload.requirements)
  if (payload.jdFile) form.append('jd_file', payload.jdFile)

  const { data } = await api.post('/api/v1/recruitment/upload-jd', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

/**
 * Run AI screening on a set of resumes against a job description.
 * @param {{ job_description_id: string, resume_ids: string[] }} payload
 * @returns {Promise<ScreenResponse>}
 */
export async function screenCandidates(payload) {
  const { data } = await api.post('/api/v1/recruitment/screen', payload, {
    timeout: 180_000, // 3 min — AI processing can be slow
  })
  return data
}

/**
 * Fetch ranked candidates for a job.
 * @param {string} jobId
 * @returns {Promise<ResultsResponse>}
 */
export async function getScreeningResults(jobId) {
  const { data } = await api.get(`/api/v1/recruitment/results/${jobId}`)
  return data
}

/**
 * Move a candidate to a new pipeline stage.
 * @param {string} candidateId
 * @param {{ stage: string, notes?: string }} payload
 */
export async function updateCandidateStatus(candidateId, payload) {
  const { data } = await api.patch(
    `/api/v1/recruitment/candidates/${candidateId}/status`,
    payload
  )
  return data
}

/**
 * Fetch all job descriptions with candidate counts.
 * @returns {Promise<{ total, jobs }>}
 */
export const fetchJobs = () =>
  api.get('/api/v1/recruitment/jobs').then(r => r.data)

/**
 * Fetch a single job description with its candidates.
 * @param {string} jobId
 */
export const fetchJob = (jobId) =>
  api.get(`/api/v1/recruitment/jobs/${jobId}`).then(r => r.data)

