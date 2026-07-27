import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { type ThemeMode, useSettingsStore } from '../useSettingsStore'
import { BaseSettingsItem } from './BaseSettingsItem'
import { Icon } from '../../../shared/Icon'
import './SelectorSheet.css'

const THEME_OPTIONS: { mode: ThemeMode; labelKey: string }[] = [
  { mode: 'system', labelKey: 'theme_system' },
  { mode: 'light', labelKey: 'theme_light' },
  { mode: 'dark', labelKey: 'theme_dark' },
]

// Matches _getThemeIcon in lib/pages/settings/components/theme_toggle_item.dart:
// Icons.light_mode_outlined / dark_mode_outlined / settings_brightness_outlined.
const THEME_ICON: Record<ThemeMode, string> = {
  light: 'light_mode',
  dark: 'dark_mode',
  system: 'settings_brightness',
}

// Ports lib/pages/settings/components/theme_toggle_item.dart
export function ThemeToggleItem() {
  const { t } = useTranslation()
  const themeMode = useSettingsStore((s) => s.themeMode)
  const setThemeMode = useSettingsStore((s) => s.setThemeMode)
  const [open, setOpen] = useState(false)

  return (
    <>
      <BaseSettingsItem
        title={t('settings_theme')}
        subtitle={t(`theme_${themeMode}`)}
        icon={<Icon name={THEME_ICON[themeMode]} color="var(--color-secondary-text)" />}
        onTap={() => setOpen(true)}
      />
      {open && (
        <div className="selector-sheet-backdrop" onClick={() => setOpen(false)}>
          <div className="selector-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="selector-sheet__handle" />
            <div className="selector-sheet__header">
              <div>
                <h2>{t('settings_theme')}</h2>
                <p>{t('settings_choose_theme')}</p>
              </div>
              <button type="button" className="selector-sheet__close" onClick={() => setOpen(false)}>
                <Icon name="close" variant="round" />
              </button>
            </div>
            <div className="selector-sheet__list">
              {THEME_OPTIONS.map(({ mode, labelKey }) => (
                <button
                  key={mode}
                  type="button"
                  className="selector-sheet__option"
                  onClick={() => {
                    setThemeMode(mode)
                    setOpen(false)
                  }}
                >
                  <span>{t(labelKey)}</span>
                  {themeMode === mode && (
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
