import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../features/auth/authStore'
import { CoverageToggleItem } from '../features/settings/components/CoverageToggleItem'
import { ExitAlertDialog } from '../features/settings/components/ExitAlertDialog'
import { LanguageSelectorItem } from '../features/settings/components/LanguageSelectorItem'
import { ProfileSettingsItem } from '../features/settings/components/ProfileSettingsItem'
import { ThemeToggleItem } from '../features/settings/components/ThemeToggleItem'
import { Icon } from '../shared/Icon'
import './SettingsPage.css'

// Ports lib/pages/settings/settings_widget.dart. AdminSettingsItem is omitted —
// it's commented out in the Dart source and not actually rendered.
// DatabaseConnectionItem ("Поменять Базу") is hidden for now per request
// (2026-07-18), which also matches the live settings_widget.dart where it's
// commented out. The component itself is kept at
// features/settings/components/DatabaseConnectionItem.tsx for when it returns.
export function SettingsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const signOut = useAuthStore((s) => s.signOut)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const handleLogout = async () => {
    // settings_widget.dart on "Да": resetToMainDatabase + signOut, then
    // goNamedAuth(StartPageWidget) — the start page, not the main page.
    setShowLogoutConfirm(false)
    await signOut()
    navigate('/start')
  }

  return (
    <div className="settings-page">
      <header className="settings-page__app-bar">
        <button
          type="button"
          className="settings-page__back"
          aria-label={t('common_back')}
          onClick={() => navigate('/main')}
        >
          {/* Icons.arrow_back_ios_new */}
          <Icon name="arrow_back_ios_new" />
        </button>
        <h1 className="settings-page__title">{t('settings_title')}</h1>
        <button
          type="button"
          className="settings-page__logout"
          aria-label={t('settings_logout')}
          onClick={() => setShowLogoutConfirm(true)}
        >
          {/* Icons.logout */}
          <Icon name="logout" filled />
        </button>
      </header>

      <main className="settings-page__body">
        <div className="settings-page__card">
          <ProfileSettingsItem />
          <CoverageToggleItem />
          <ThemeToggleItem />
          <LanguageSelectorItem />
        </div>
      </main>

      {showLogoutConfirm && (
        <ExitAlertDialog onCancel={() => setShowLogoutConfirm(false)} onConfirm={handleLogout} />
      )}
    </div>
  )
}
