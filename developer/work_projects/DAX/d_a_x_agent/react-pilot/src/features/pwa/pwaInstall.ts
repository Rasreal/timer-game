// Ports the JS-interop helpers from
// lib/custom_code/widgets/pwa_install_bottom_sheet.dart (_hasInstallPrompt /
// pwaIsAlreadyInstalled / _triggerPrompt / _listenForInstallPrompt). The
// `window.__pwaInstallPrompt` slot is filled by the inline capture script in
// index.html (mirroring Flutter's web/index.html), which runs before the app
// bundle so an early `beforeinstallprompt` is never missed.

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

declare global {
  interface Window {
    __pwaInstallPrompt?: BeforeInstallPromptEvent | null
  }
}

export function hasInstallPrompt(): boolean {
  try {
    return window.__pwaInstallPrompt != null
  } catch {
    return false
  }
}

// Dart pwaIsAlreadyInstalled(): display-mode standalone media query, plus the
// iOS Safari navigator.standalone flag.
export function pwaIsAlreadyInstalled(): boolean {
  try {
    if (window.matchMedia('(display-mode: standalone)').matches) return true
    const nav = window.navigator as Navigator & { standalone?: boolean }
    if (nav.standalone === true) return true
    return false
  } catch {
    return false
  }
}

export function triggerInstallPrompt(): void {
  try {
    const prompt = window.__pwaInstallPrompt
    if (prompt != null) {
      void prompt.prompt()
      window.__pwaInstallPrompt = null
    }
  } catch {
    // ignore, same as the Dart helper
  }
}

// Dart _listenForInstallPrompt: live listener covering the race where
// beforeinstallprompt fires after the app has loaded. Returns a cleanup fn.
export function listenForInstallPrompt(onPrompt: () => void): () => void {
  const handler = () => {
    onPrompt()
  }
  try {
    window.addEventListener('beforeinstallprompt', handler)
    return () => {
      try {
        window.removeEventListener('beforeinstallprompt', handler)
      } catch {
        // ignore
      }
    }
  } catch {
    return () => {}
  }
}

export type PwaPlatform = 'ios' | 'android' | 'desktop'

// Dart _detectPlatform(): userAgent sniffing for iOS / Android, everything
// else (Mac/Windows Chrome, Edge, ...) is desktop.
// Deviation from Dart (bug fix): iPadOS 13+ Safari reports a macOS UA with no
// "ipad" token — the Dart original classifies those iPads as desktop and shows
// Chrome install steps that can never work there. A Mac UA with multitouch is
// an iPad (real Macs report maxTouchPoints 0), so route it to the iOS branch.
export function detectPwaPlatform(): PwaPlatform {
  const userAgent = window.navigator.userAgent.toLowerCase()
  const isIPadOS = userAgent.includes('macintosh') && window.navigator.maxTouchPoints > 1
  const isIOS =
    userAgent.includes('iphone') ||
    userAgent.includes('ipad') ||
    userAgent.includes('ipod') ||
    isIPadOS
  if (isIOS) return 'ios'
  if (userAgent.includes('android')) return 'android'
  return 'desktop'
}
