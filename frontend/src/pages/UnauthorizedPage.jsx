/**
 * UnauthorizedPage — shown when the user's role doesn't match.
 * Phase 1: now with styled design and navigation.
 */

import { Link } from 'react-router-dom'
import { useAuth, getDashboardPath } from '@context/AuthContext'

export default function UnauthorizedPage() {
  const { role, isAuthenticated } = useAuth()
  const backPath = isAuthenticated ? getDashboardPath(role) : '/login'

  return (
    <main className="unauth-page" aria-label="Access denied">
      <div className="unauth-page__code" aria-hidden="true">403</div>
      <h1 className="unauth-page__title">Access Denied</h1>
      <p className="unauth-page__sub">
        You don't have permission to view this page.
        You'll be redirected to your dashboard automatically.
      </p>
      <Link
        to={backPath}
        style={{
          marginTop: '0.5rem',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.625rem 1.25rem',
          background: 'linear-gradient(135deg, var(--clr-primary), var(--clr-accent))',
          color: '#fff',
          borderRadius: 'var(--r-md)',
          fontWeight: 600,
          fontSize: '0.9rem',
        }}
      >
        ← Go to my dashboard
      </Link>
    </main>
  )
}
