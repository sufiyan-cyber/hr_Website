/**
 * Utility helpers for the HRMS Platform frontend.
 * Phase 1: stubs only — expand as features are built.
 */

// ── Date formatting ──────────────────────────────────────────────────────────

/**
 * Format a date string or Date object to a human-readable format.
 * @param {string|Date} date
 * @param {Intl.DateTimeFormatOptions} [options]
 * @returns {string}
 */
export function formatDate(date, options = { year: 'numeric', month: 'short', day: 'numeric' }) {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-US', options).format(new Date(date))
}

// ── Currency formatting ──────────────────────────────────────────────────────

/**
 * Format a number as a currency string.
 * @param {number} amount
 * @param {string} [currency='USD']
 * @returns {string}
 */
export function formatCurrency(amount, currency = 'USD') {
  if (amount == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
}

// ── String utilities ─────────────────────────────────────────────────────────

/**
 * Convert a snake_case or kebab-case string to Title Case.
 * E.g. "hr_recruiter" → "Hr Recruiter"
 * @param {string} str
 * @returns {string}
 */
export function toTitleCase(str) {
  if (!str) return ''
  return str
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Truncate a string to a max length and append ellipsis.
 * @param {string} str
 * @param {number} maxLength
 * @returns {string}
 */
export function truncate(str, maxLength = 100) {
  if (!str || str.length <= maxLength) return str ?? ''
  return str.slice(0, maxLength).trimEnd() + '…'
}

// ── Role utilities ───────────────────────────────────────────────────────────

export const ROLES = {
  ADMIN:   'management_admin',
  HR:      'hr_recruiter',
  MANAGER: 'senior_manager',
  EMPLOYEE:'employee',
}

/**
 * Check if a given role is in the list of allowed roles.
 * @param {string} role
 * @param {string[]} allowedRoles
 * @returns {boolean}
 */
export function hasPermission(role, allowedRoles) {
  return allowedRoles.includes(role)
}
