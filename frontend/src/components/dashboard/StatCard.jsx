/**
 * StatCard — Reusable KPI card with icon, value, label, and color accent.
 *
 * Props:
 *   label       string   — e.g. "Total Employees"
 *   value       string|number — e.g. "136" or "84%"
 *   icon        ReactNode — emoji or SVG icon
 *   accent      string   — CSS color token: 'primary' | 'success' | 'warning' | 'danger' | 'purple'
 *   trend       string?  — optional e.g. "+12% vs last month"
 *   loading     bool?    — show skeleton
 */

export default function StatCard({ label, value, icon, accent = 'primary', trend, loading = false }) {
  if (loading) {
    return (
      <div className="stat-card stat-card--loading">
        <div className="stat-card__icon-wrap skeleton-pulse" />
        <div className="stat-card__body">
          <div className="skeleton-pulse" style={{ height: '1.75rem', width: '60%', borderRadius: 6, marginBottom: 8 }} />
          <div className="skeleton-pulse" style={{ height: '0.8rem', width: '80%', borderRadius: 6 }} />
        </div>
      </div>
    )
  }

  return (
    <div className={`stat-card stat-card--${accent}`}>
      <div className="stat-card__icon-wrap">
        <span className="stat-card__icon">{icon}</span>
      </div>
      <div className="stat-card__body">
        <div className="stat-card__value">{value}</div>
        <div className="stat-card__label">{label}</div>
        {trend && <div className="stat-card__trend">{trend}</div>}
      </div>
    </div>
  )
}
