import './AlertDialog.css'

// Two-button variant of AlertDialog.tsx, for confirm/cancel prompts like
// favourites_widget.dart's _showCartConfirmationDialog — a stock M2
// AlertDialog (see new2/favorites_go_cart.png): left-aligned 16px message,
// "Нет"/"Да" as blue text buttons bottom-right, no title. Reuses
// AlertDialog.css's classes so both dialogs stay visually identical.
export function ConfirmDialog({
  message,
  cancelText,
  confirmText,
  onCancel,
  onConfirm,
}: {
  message: string
  cancelText: string
  confirmText: string
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="ff-alert-backdrop" onClick={onCancel}>
      <div className="ff-alert" onClick={(e) => e.stopPropagation()}>
        <p className="ff-alert__message ff-alert__message--no-title">{message}</p>
        <div className="ff-alert__actions">
          <button type="button" className="ff-alert__button" onClick={onCancel}>
            {cancelText}
          </button>
          <button type="button" className="ff-alert__button" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
