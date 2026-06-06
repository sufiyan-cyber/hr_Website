/**
 * payrollService.js
 * Wraps /api/v1/payroll endpoints.
 */
import api from './api'

/** Get current employee payroll history */
export const fetchMyPayroll = () =>
  api.get('/api/v1/payroll/me').then(r => r.data)
