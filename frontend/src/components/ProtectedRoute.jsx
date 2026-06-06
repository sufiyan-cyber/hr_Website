/**
 * ProtectedRoute — Phase 1 (upgraded)
 *
 * 1. Shows loading spinner while session is being restored
 * 2. Unauthenticated → redirects to /login (saves intended URL)
 * 3. Authenticated → renders child routes via <Outlet />
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@context/AuthContext'

export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="loading-screen" role="status" aria-label="Loading…">
        <div className="loading-screen__spinner" />
        <p className="loading-screen__text">Loading your workspace…</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
