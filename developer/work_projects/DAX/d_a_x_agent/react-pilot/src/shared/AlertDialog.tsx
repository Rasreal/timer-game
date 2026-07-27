import { useTranslation } from 'react-i18next'
import './AlertDialog.css'

// Ports AuthUtils.showErrorDialog/showInfoDialog (lib/auth/shared/auth_utils.dart):
// native-looking centered white rounded card, bold title, body text, single
// right-aligned blue text button. Default button label is common_close
// ('Закрыть' in the Dart dialogs).
export function AlertDialog({
  title,
  message,
  buttonText,
  onClose,
}: {
  title?: string
  message: string
  buttonText?: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="ff-alert-backdrop" onClick={onClose}>
      <div className="ff-alert" onClick={(e) => e.stopPropagation()}>
        {title && <h2 className="ff-alert__title">{title}</h2>}
        <p className={`ff-alert__message${title ? '' : ' ff-alert__message--no-title'}`}>{message}</p>
        <div className="ff-alert__actions">
          <button type="button" className="ff-alert__button" onClick={onClose}>
            {buttonText ?? t('common_close')}
          </button>
        </div>
      </div>
    </div>
  )
}
