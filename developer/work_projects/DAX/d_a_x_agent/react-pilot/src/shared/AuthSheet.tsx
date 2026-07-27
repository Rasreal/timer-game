import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from './Icon'
import './AuthSheet.css'

// Bottom-sheet-over-dimmed-backdrop presentation shared by the phone/BIN/SMS
// auth steps and the registration form. Ports the header + container chrome
// built by AuthUtils.buildModalHeader / AuthFormContainer
// (lib/auth/shared/auth_utils.dart, lib/auth/widgets/auth_form_container.dart):
// a drag handle, a bold left-aligned title with a circular close (X) button,
// scrollable body, and a fixed bottom slot for the primary button + any
// secondary content (privacy footnote / resend timer).
export function AuthSheet({
  title,
  helperText,
  onClose,
  children,
  footer,
  tall = false,
}: {
  title: string
  helperText?: ReactNode
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  /** Registration sheet uses a taller (90% height) sheet per showRegistrationModal. */
  tall?: boolean
}) {
  const { t } = useTranslation()
  return (
    <div className="auth-sheet-backdrop" onClick={onClose}>
      <div
        className={`auth-sheet ${tall ? 'auth-sheet--tall' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="auth-sheet__handle" />
        <div className="auth-sheet__header">
          <div className="auth-sheet__header-text">
            <h1 className="auth-sheet__title">{title}</h1>
            {helperText && <p className="auth-sheet__helper">{helperText}</p>}
          </div>
          <button type="button" className="auth-sheet__close" onClick={onClose} aria-label={t('common_close')}>
            <Icon name="close" variant="round" size={24} />
          </button>
        </div>

        <div className="auth-sheet__body">{children}</div>

        {footer && <div className="auth-sheet__footer">{footer}</div>}
      </div>
    </div>
  )
}
