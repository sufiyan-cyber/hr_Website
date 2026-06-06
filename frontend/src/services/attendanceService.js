/**
 * attendanceService.js
 * Wraps /api/v1/attendance endpoints.
 */
import api from './api'

/** Get current employee attendance for a given month */
export const fetchMyAttendance = (year = null, month = null) => {
  const params = {}
  if (year)  params.year  = year
  if (month) params.month = month
  return api.get('/api/v1/attendance/me', { params }).then(r => r.data)
}

/** Get 6-month attendance trend for current employee */
export const fetchAttendanceSummary = () =>
  api.get('/api/v1/attendance/summary').then(r => r.data)
