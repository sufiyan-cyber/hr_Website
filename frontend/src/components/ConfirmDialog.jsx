/**
 * ConfirmDialog — Phase 5 UI Polish
 *
 * A polished confirmation modal to replace window.confirm() across the app.
 *
 * Usage:
 *   const [confirm, setConfirm] = useState(null)
 *
 *   // To show:
 *   setConfirm({
 *     title: 'Deactivate Employee',
 *     message: 'This will mark the employee as inactive. You can reactivate them later.',
 *     confirmLabel: 'Deactivate',
 *     onConfirm: () => handleDeactivate(id),
 *   })
 *
 *   // In JSX:
 *   {confirm && <ConfirmDialog {...confirm} onCancel={() => setConfirm(null)} />}
 */

import { useEffect, useRef } from 'react'

/**
 * @param {object}   props
 * @param {string}   props.title         - Dialog heading
 * @param {string}   props.message       - Body text
 * @param {string}   [props.icon]        - Emoji icon (default: ⚠️)
 * @param {string}   [props.confirmLabel]- Confirm button label (default: 'Confirm')
 * @param {string}   [props.cancelLabel] - Cancel button label (default: 'Cancel')
 * @param {string}   [props.variant]     - 'danger' | 'warning' (default: 'danger')
 * @param {Function} props.onConfirm     - Called when user confirms
 * @param {Function} props.onCancel      - Called when user cancels / clicks overlay
 */
export default function ConfirmDialog({
  title        = 'Are you sure?',
  message      = 'This action cannot be undone.',
  icon         = '⚠️',
  confirmLabel = 'Confirm',
  cancelLabel  = 'Cancel',
  variant      = 'danger',
  onConfirm,
  onCancel,
}) {
  const confirmBtnRef = useRef(null)

  // Trap focus on mount and handle Escape key
  useEffect(() => {
    const prev = document.activeElement
    confirmBtnRef.current?.focus()

    const onKey = (e) => {
      if (e.key === 'Escape') onCancel?.()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      prev?.focus()
    }
  }, [onCancel])

  const handleConfirm = () => {
    onConfirm?.()
    onCancel?.()
  }

  return (
    <div
      className="confirm-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
      onClick={(e) => e.target === e.currentTarget && onCancel?.()}
    >
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>

        {/* Icon */}
        <div className="confirm-dialog__icon">{icon}</div>

        {/* Content */}
        <div id="confirm-title" className="confirm-dialog__title">{title}</div>
        <div id="confirm-message" className="confirm-dialog__message">{message}</div>

        {/* Actions */}
        <div className="confirm-dialog__actions">
          <button
            className="confirm-dialog__btn confirm-dialog__btn--cancel"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            className={`confirm-dialog__btn confirm-dialog__btn--${variant}`}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </button>
        </div>

      </div>
    </div>
  )
}
