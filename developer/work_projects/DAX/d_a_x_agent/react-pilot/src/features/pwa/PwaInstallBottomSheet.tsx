import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '../../shared/Icon'
import {
  detectPwaPlatform,
  hasInstallPrompt,
  listenForInstallPrompt,
  pwaIsAlreadyInstalled,
  triggerInstallPrompt,
  type PwaPlatform,
} from './pwaInstall'
import './PwaInstallBottomSheet.css'

// Ports lib/custom_code/widgets/pwa_install_bottom_sheet.dart.
// Platform detection happens on mount (Dart initState -> _detectPlatform):
//   - already installed (standalone) -> renders nothing (SizedBox.shrink),
//   - iOS -> manual Safari share -> Add to Home Screen steps,
//   - Android/desktop -> install button when the captured beforeinstallprompt
//     is available, otherwise manual steps + a live listener that upgrades to
//     the button if the event fires late (the Dart race-condition fix).
export function PwaInstallBottomSheet({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const [platform] = useState<PwaPlatform>(() => detectPwaPlatform())
  const [isInstalled] = useState<boolean>(() => pwaIsAlreadyInstalled())
  const [canInstall, setCanInstall] = useState<boolean>(
    () => platform === 'ios' || hasInstallPrompt(),
  )

  useEffect(() => {
    if (isInstalled || platform === 'ios' || canInstall) return
    // Dart _waitForPrompt(): attach a live beforeinstallprompt listener.
    return listenForInstallPrompt(() => setCanInstall(true))
  }, [isInstalled, platform, canInstall])

  // Dart: if (_isInstalled) return const SizedBox.shrink();
  if (isInstalled) return null

  const install = () => {
    // Dart _triggerAndroidInstall()
    if (!hasInstallPrompt()) return
    triggerInstallPrompt()
    setCanInstall(false)
  }

  const showManualSteps = !canInstall || platform === 'ios'

  return (
    <div className="pwa-install-backdrop" onClick={onClose}>
      <div className="pwa-install-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="pwa-install-sheet__handle" />

        {/* App icon + title row */}
        <div className="pwa-install-sheet__header">
          <img
            className="pwa-install-sheet__app-icon"
            src="/icons/app_launcher_icon.png"
            alt=""
          />
          <div className="pwa-install-sheet__header-text">
            <span className="pwa-install-sheet__title">{t('pwa_install_title')}</span>
            <span className="pwa-install-sheet__subtitle">{t('pwa_install_subtitle')}</span>
          </div>
        </div>

        {platform === 'ios' ? (
          <IosContent />
        ) : platform === 'desktop' ? (
          <DesktopContent canInstall={canInstall} onInstall={install} />
        ) : (
          <AndroidContent canInstall={canInstall} onInstall={install} />
        )}

        {/* "Понятно" — shown only when no install button (manual instructions) */}
        {showManualSteps && (
          <button type="button" className="pwa-install-sheet__got-it" onClick={onClose}>
            {t('pwa_install_got_it')}
          </button>
        )}

        <button type="button" className="pwa-install-sheet__not-now" onClick={onClose}>
          {t('pwa_install_not_now')}
        </button>
      </div>
    </div>
  )
}

// ── Android section (Dart _AndroidContent) ─────────────────────────────────

function AndroidContent({
  canInstall,
  onInstall,
}: {
  canInstall: boolean
  onInstall: () => void
}) {
  const { t } = useTranslation()

  if (canInstall) {
    return (
      <button type="button" className="pwa-install-sheet__install-btn" onClick={onInstall}>
        {/* Icons.add_to_home_screen */}
        <Icon name="add_to_home_screen" filled color="#ffffff" size={24} />
        <span>{t('pwa_install_android_button')}</span>
      </button>
    )
  }

  // Fallback: manual steps when prompt is not available
  return (
    <div className="pwa-install-sheet__steps">
      <span className="pwa-install-sheet__steps-title">{t('pwa_install_how')}</span>
      <Step number="1" text={t('pwa_install_android_step1')} />
      <Step number="2" text={t('pwa_install_android_step2')} />
      <Step number="3" text={t('pwa_install_android_step3')} />
    </div>
  )
}

// ── Desktop section (Dart _DesktopContent) ─────────────────────────────────

function DesktopContent({
  canInstall,
  onInstall,
}: {
  canInstall: boolean
  onInstall: () => void
}) {
  const { t } = useTranslation()

  if (canInstall) {
    return (
      <button
        type="button"
        className="pwa-install-sheet__install-btn pwa-install-sheet__install-btn--desktop"
        onClick={onInstall}
      >
        {/* Icons.download_rounded */}
        <Icon name="download" variant="round" color="#ffffff" size={24} />
        <span>{t('pwa_install_desktop_button')}</span>
      </button>
    )
  }

  // Fallback: manual steps for desktop browsers without prompt
  return (
    <div className="pwa-install-sheet__steps">
      <span className="pwa-install-sheet__steps-title">{t('pwa_install_how')}</span>
      <Step number="1" text={t('pwa_install_desktop_step1')} />
      <Step number="2" text={t('pwa_install_desktop_step2')} />
      <Step number="3" text={t('pwa_install_desktop_step3')} />
    </div>
  )
}

// ── iOS section (Dart _IosContent) ─────────────────────────────────────────

function IosContent() {
  const { t } = useTranslation()
  return (
    <div className="pwa-install-sheet__steps">
      <span className="pwa-install-sheet__steps-title">{t('pwa_install_how')}</span>
      <div className="pwa-install-sheet__ios-card">
        {/* Icons.ios_share / Icons.add_box_outlined */}
        <IosStep icon={<Icon name="ios_share" filled size={22} />} text={t('pwa_install_ios_step1')} />
        <IosStep icon={<Icon name="add_box" size={22} />} text={t('pwa_install_ios_step2')} />
      </div>
    </div>
  )
}

function IosStep({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="pwa-install-sheet__ios-step">
      <span className="pwa-install-sheet__ios-step-icon">{icon}</span>
      <span className="pwa-install-sheet__step-text">{text}</span>
    </div>
  )
}

// ── Shared numbered step (Dart _Step) ──────────────────────────────────────

function Step({ number, text }: { number: string; text: string }) {
  return (
    <div className="pwa-install-sheet__step">
      <span className="pwa-install-sheet__step-number">{number}</span>
      <span className="pwa-install-sheet__step-text">{text}</span>
    </div>
  )
}
