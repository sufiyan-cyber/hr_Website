/**
 * EmptyState — Phase 5 UI Polish
 *
 * A reusable, illustrated component for empty states across the platform.
 * Relies on .empty-state classes defined in index.css.
 */

import React from 'react'

/**
 * @param {object}   props
 * @param {string}   [props.illustration] - Emoji or icon to show (default: 📋)
 * @param {string}   props.title          - Main heading
 * @param {string}   props.subtitle       - Context or suggestion text
 * @param {string}   [props.actionLabel]  - Button label (optional)
 * @param {Function} [props.onAction]     - Button click callback (optional)
 */
export default function EmptyState({
  illustration = '📋',
  title,
  subtitle,
  actionLabel,
  onAction,
}) {
  return (
    <div className="empty-state">
      <div className="empty-state__illustration">{illustration}</div>
      <h3 className="empty-state__title">{title}</h3>
      <p className="empty-state__subtitle">{subtitle}</p>
      {actionLabel && onAction && (
        <button className="empty-state__action" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}
