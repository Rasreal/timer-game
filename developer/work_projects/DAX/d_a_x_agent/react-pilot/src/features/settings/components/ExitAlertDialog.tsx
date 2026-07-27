import { useTranslation } from 'react-i18next'
import './ExitAlertDialog.css'

// Ports the logout confirmation in lib/pages/settings/settings_widget.dart:
// a stock Material (M2) AlertDialog — content-only text ("Выйти из
// программы?"), two right-aligned TextButtons "Нет"/"Да" in the Material
// default blue (ground-truth screenshot 20.22.49: blue buttons, white
// surface, small corner radius, 54% black barrier).
export function ExitAlertDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void
  onConfirm: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="exit-alert__barrier" onClick={onCancel}>
      <div
        className="exit-alert"
        role="alertdialog"
        aria-modal="true"
        aria-label={t('settings_logout_confirm')}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="exit-alert__content">{t('settings_logout_confirm')}</p>
        <div className="exit-alert__actions">
          <button type="button" className="exit-alert__button" onClick={onCancel}>
            {t('settings_no')}
          </button>
          <button type="button" className="exit-alert__button" onClick={onConfirm}>
            {t('settings_yes')}
          </button>
        </div>
      </div>
    </div>
  )
}
