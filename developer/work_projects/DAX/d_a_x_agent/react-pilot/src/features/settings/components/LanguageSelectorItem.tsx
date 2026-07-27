import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '../useSettingsStore'
import { BaseSettingsItem } from './BaseSettingsItem'
import { Icon } from '../../../shared/Icon'
import './SelectorSheet.css'

const LANGUAGE_OPTIONS: { code: 'ru' | 'kk' | 'en'; label: string }[] = [
  { code: 'ru', label: 'Русский' },
  { code: 'kk', label: 'Қазақша' },
  { code: 'en', label: 'English' },
]

// Ports lib/pages/settings/components/language_selector_item.dart
export function LanguageSelectorItem() {
  const { t, i18n } = useTranslation()
  const setLanguage = useSettingsStore((s) => s.setLanguage)
  const [open, setOpen] = useState(false)
  const current = LANGUAGE_OPTIONS.find((o) => o.code === i18n.language)?.label ?? 'Русский'

  return (
    <>
      <BaseSettingsItem
        title={t('settings_language')}
        subtitle={current}
        icon={<Icon name="language" color="var(--color-secondary-text)" />}
        showBottomBorder
        onTap={() => setOpen(true)}
      />
      {open && (
        <div className="selector-sheet-backdrop" onClick={() => setOpen(false)}>
          <div className="selector-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="selector-sheet__handle" />
            <div className="selector-sheet__header">
              <div>
                <h2>{t('settings_language')}</h2>
                <p>{t('settings_choose_language')}</p>
              </div>
              <button type="button" className="selector-sheet__close" onClick={() => setOpen(false)}>
                <Icon name="close" variant="round" />
              </button>
            </div>
            <div className="selector-sheet__list">
              {LANGUAGE_OPTIONS.map(({ code, label }) => (
                <button
                  key={code}
                  type="button"
                  className="selector-sheet__option"
                  onClick={() => {
                    // Dart _updateLanguage: FFLocalizations.storeLocale +
                    // MyApp.setLocale — switch the live locale AND persist it.
                    // Persistence goes through the settings store (same
                    // localStorage mechanism as themeMode/coverage).
                    i18n.changeLanguage(code)
                    setLanguage(code)
                    setOpen(false)
                  }}
                >
                  <span>{label}</span>
                  {i18n.language === code && (
                    <span className="selector-sheet__option-check">
                      {/* Icons.check — plain orange check, 24pt */}
                      <Icon name="check" filled />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
