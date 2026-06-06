/**
 * SmartRedirect — redirects root (/) intelligently:
 * - Not authenticated → /login
 * - Authenticated → role-specific dashboard
 */

import { Navigate } from 'react-router-dom'
import { useAuth, getDashboardPath } from '@context/AuthContext'

export default function SmartRedirect() {
  const { isAuthenticated, loading, role } = useAuth()

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-screen__spinner" />
        <p className="loading-screen__text">Loading…</p>
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />

  return <Navigate to={getDashboardPath(role)} replace />
}
