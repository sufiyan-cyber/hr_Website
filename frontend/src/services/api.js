/**
 * Axios instance for HRMS Backend API.
 *
 * Automatically attaches the Supabase JWT as a Bearer token on every request.
 * Handles 401 responses by signing out the user.
 *
 * Usage:
 *   import api from '@services/api'
 *   const { data } = await api.get('/api/v1/employees')
 */

import axios from 'axios'
import { supabase } from './supabaseClient'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30_000, // 30 seconds
})

// ── Request interceptor: attach JWT ───────────────────────────────────────────
api.interceptors.request.use(
  async (config) => {
    const { data: { session } } = await supabase.auth.getSession()

    if (session?.access_token) {
      config.headers['Authorization'] = `Bearer ${session.access_token}`
    }

    return config
  },
  (error) => Promise.reject(error)
)

// ── Response interceptor: handle auth errors ──────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // NOTE: Do NOT auto-signout on 401 here.
    // The backend may return 401 for reasons unrelated to the Supabase session
    // (e.g. JWT secret mismatch, role issues, backend misconfiguration).
    // Blindly signing out would boot the user even though their Supabase
    // session is perfectly valid.
    // True session expiry is handled by AuthContext via onAuthStateChange.
    return Promise.reject(error)
  }
)

export default api
