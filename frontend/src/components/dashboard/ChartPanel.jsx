/**
 * ChartPanel — Wrapper for Recharts charts with title and optional subtitle.
 *
 * Props:
 *   title     string
 *   subtitle  string?
 *   children  ReactNode — the chart itself
 *   loading   bool?
 *   minHeight string?   — default '280px'
 */
import SkeletonCard from './SkeletonCard'

export default function ChartPanel({ title, subtitle, children, loading = false, minHeight = '280px' }) {
  return (
    <div className="chart-panel">
      <div className="chart-panel__header">
        <div>
          <h3 className="chart-panel__title">{title}</h3>
          {subtitle && <p className="chart-panel__subtitle">{subtitle}</p>}
        </div>
      </div>
      <div className="chart-panel__body" style={{ minHeight }}>
        {loading
          ? <SkeletonCard height={minHeight} rows={4} />
          : children
        }
      </div>
    </div>
  )
}
