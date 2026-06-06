/**
 * Auth service — wraps the FastAPI /auth endpoints.
 *
 * Used by the frontend to validate tokens server-side and fetch fresh
 * user profile data that may differ from the JWT metadata.
 *
 * Usage:
 *   import { validateToken, getMe } from '@services/authService'
 *   const profile = await getMe()
 */

import api from './api'

/**
 * Validate the current Supabase JWT with the backend and get the user profile.
 * The JWT is automatically attached by the Axios interceptor in api.js.
 *
 * @returns {Promise<{ user_id, auth_uid, email, full_name, role }>}
 */
export async function getMe() {
  const { data } = await api.get('/api/v1/auth/me')
  return data
}

/**
 * Explicitly validate a token string (e.g., from a URL param or storage).
 *
 * @param {string} token - Raw Supabase access token
 * @returns {Promise<{ user_id, auth_uid, email, full_name, role }>}
 */
export async function validateToken(token) {
  const { data } = await api.post('/api/v1/auth/validate-token', { token })
  return data
}
