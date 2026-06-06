/**
 * RoleGuard — Phase 1 (upgraded)
 *
 * Allows access only if the user's role is in the `roles` array.
 * Wrong role → redirects to their own dashboard (not /unauthorized).
 * This prevents HR from getting stuck on an "Unauthorized" dead end —
 * they're smoothly redirected to their dashboard instead.
 */

import { Navigate, Outlet } from 'react-router-dom'
import { useAuth, getDashboardPath } from '@context/AuthContext'

/**
 * @param {Object}   props
 * @param {string[]} props.roles - Roles that may access the wrapped routes
 */
export default function RoleGuard({ roles = [] }) {
  const { role, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-screen" role="status" aria-label="Checking permissions…">
        <div className="loading-screen__spinner" />
        <p className="loading-screen__text">Checking permissions…</p>
      </div>
    )
  }

  if (!roles.includes(role)) {
    // Redirect to the user's own dashboard instead of a dead-end 403 page
    return <Navigate to={getDashboardPath(role)} replace />
  }

  return <Outlet />
}
