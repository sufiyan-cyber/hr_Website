/**
 * SkeletonCard — Loading placeholder for stat cards and panels.
 *
 * Props:
 *   height  string? — explicit height (default '80px')
 *   rows    number? — number of skeleton rows to show (default 1)
 */

export default function SkeletonCard({ height = '80px', rows = 1 }) {
  return (
    <div className="skeleton-card" style={{ minHeight: height }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="skeleton-pulse"
          style={{
            height: i === 0 ? '1.5rem' : '0.85rem',
            width: i === 0 ? '50%' : `${70 + Math.random() * 25}%`,
            borderRadius: 6,
            marginBottom: i < rows - 1 ? 10 : 0,
          }}
        />
      ))}
    </div>
  )
}
