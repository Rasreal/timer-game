import './Snackbar.css'

// Ports the SnackBar(...) calls scattered through
// lib/administration/main/product_component/product_component_widget.dart —
// pale-green background (#E8F5E9) with dark-green text (#1B5E20) for
// "added" messages, pale-red (#FFCCBC) with dark-red text (#BF360C) for
// "removed" messages. Shown full-width, pinned to the bottom of the page.
export function Snackbar({ message, tone }: { message: string; tone: 'success' | 'error' }) {
  return (
    <div className={`ff-snackbar ff-snackbar--${tone}`} role="status">
      {message}
    </div>
  )
}
