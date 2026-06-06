/**
 * performanceService.js
 * Wraps /api/v1/performance endpoints.
 */
import api from './api'

/** Get current employee performance reviews */
export const fetchMyPerformance = () =>
  api.get('/api/v1/performance/me').then(r => r.data)
