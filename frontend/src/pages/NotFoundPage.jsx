/** NotFoundPage — Phase 5 */
export default function NotFoundPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--clr-bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 24,
      padding: '2rem',
      fontFamily: 'inherit',
    }}>
      {/* Animated 404 */}
      <div style={{ position: 'relative', textAlign: 'center' }}>
        <div style={{
          fontSize: 'clamp(6rem, 20vw, 10rem)',
          fontWeight: 900,
          background: 'linear-gradient(135deg, hsl(239,84%,67%), hsl(262,83%,68%))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          lineHeight: 1,
          animation: 'float 3s ease-in-out infinite',
          letterSpacing: '-4px',
        }}>
          404
        </div>
        {/* Glow behind */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(circle, hsl(239,84%,67%,0.15) 0%, transparent 70%)',
          filter: 'blur(20px)',
          zIndex: -1,
        }} />
      </div>

      {/* Illustration */}
      <div style={{ fontSize: '4rem', animation: 'float 4s ease-in-out infinite 0.5s' }}>
        🗺️
      </div>

      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <h1 style={{
          fontSize: 'clamp(1.25rem, 4vw, 1.75rem)',
          fontWeight: 800,
          color: 'var(--clr-text-1)',
          margin: '0 0 12px',
        }}>
          Page Not Found
        </h1>
        <p style={{
          color: 'var(--clr-text-3)',
          fontSize: '0.95rem',
          lineHeight: 1.6,
          margin: '0 0 28px',
        }}>
          The page you're looking for doesn't exist or may have been moved.
          Let's get you back on track.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a
            href="/"
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: 12,
              background: 'linear-gradient(135deg, hsl(239,84%,67%), hsl(262,83%,68%))',
              color: '#fff',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '0.9rem',
              boxShadow: '0 4px 14px hsl(239,84%,67%,0.35)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 8px 24px hsl(239,84%,67%,0.45)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = ''
              e.currentTarget.style.boxShadow = '0 4px 14px hsl(239,84%,67%,0.35)'
            }}
          >
            🏠 Go Home
          </a>
          <button
            onClick={() => window.history.back()}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: 12,
              border: '1px solid var(--clr-border)',
              background: 'var(--clr-surface)',
              color: 'var(--clr-text-1)',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'border-color 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'hsl(239,84%,67%)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = ''}
          >
            ← Go Back
          </button>
        </div>
      </div>

      {/* Quick links */}
      <div style={{
        marginTop: 8,
        padding: '1.25rem 2rem',
        background: 'var(--clr-surface)',
        border: '1px solid var(--clr-border)',
        borderRadius: 16,
        display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center',
      }}>
        {[
          { label: '📊 Dashboard',   href: '/admin/dashboard' },
          { label: '👥 Employees',   href: '/employees' },
          { label: '📋 Pipeline',    href: '/pipeline' },
          { label: '🤖 HRBot',       href: '/chatbot' },
        ].map(l => (
          <a
            key={l.href}
            href={l.href}
            style={{
              color: 'var(--clr-text-2)',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: 600,
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'hsl(239,84%,67%)'}
            onMouseLeave={e => e.currentTarget.style.color = ''}
          >
            {l.label}
          </a>
        ))}
      </div>
    </div>
  )
}
