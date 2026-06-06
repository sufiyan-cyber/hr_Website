/**
 * dashboardService.js — Phase 3
 *
 * Fetches role-specific dashboard data from the HRMS backend.
 * All calls attach the Supabase JWT via the shared `api` axios instance.
 */

import api from './api'

// ── Admin ─────────────────────────────────────────────────────────────────────
export const fetchAdminDashboard = () =>
  api.get('/api/v1/dashboard/admin').then(r => r.data)

// ── HR Recruiter ──────────────────────────────────────────────────────────────
export const fetchHRDashboard = () =>
  api.get('/api/v1/dashboard/hr').then(r => r.data)

// ── Senior Manager ────────────────────────────────────────────────────────────
export const fetchManagerDashboard = () =>
  api.get('/api/v1/dashboard/manager').then(r => r.data)

// ── Employee ──────────────────────────────────────────────────────────────────
export const fetchEmployeeDashboard = () =>
  api.get('/api/v1/dashboard/employee').then(r => r.data)
