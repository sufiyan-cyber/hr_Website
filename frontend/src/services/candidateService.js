/**
 * candidateService.js — Phase 4
 * Candidate Pipeline API calls.
 */

import api from './api'

/** List all candidates, optionally filtered by stage */
export const fetchCandidates = (stage = null) => {
  const params = {}
  if (stage) params.stage = stage
  return api.get('/api/v1/candidates', { params }).then(r => r.data)
}

/** Full candidate profile with history */
export const fetchCandidate = (id) =>
  api.get(`/api/v1/candidates/${id}`).then(r => r.data)

/** Move candidate to a new pipeline stage */
export const updateCandidateStage = (id, stage, notes = null) =>
  api.patch(`/api/v1/candidates/${id}/stage`, { stage, notes }).then(r => r.data)

/** Add a note to a candidate */
export const addCandidateNote = (id, note) =>
  api.post(`/api/v1/candidates/${id}/notes`, { note }).then(r => r.data)
