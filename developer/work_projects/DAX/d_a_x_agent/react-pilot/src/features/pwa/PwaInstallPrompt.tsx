import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { pwaIsAlreadyInstalled } from './pwaInstall'
import { PwaInstallBottomSheet } from './PwaInstallBottomSheet'

// App-level port of _maybeShowPwaInstallPrompt() from
// lib/auth/start_page/start_page_widget.dart (the active Dart call site;
// lib/pages/main/main_widget.dart defines the identical method but never
// invokes it). Trigger conditions mirrored 1:1:
//   - web only (always true here),
//   - skipped when already running as an installed PWA (standalone),
//   - 2-second delay after the page appears, then the sheet opens,
//   - no persistence flag — it shows on every visit/page load (commit
//     92fe1b6e37 removed the pwa_install_shown flag on purpose).
// Mounted in App.tsx instead of inside StartPage/MainPage so page files stay
// untouched; fires once per browser page load on first landing on /start or
// /main — the two screens whose Dart counterparts carry the method.
const TRIGGER_PATHS = new Set(['/start', '/main'])

let shownThisPageLoad = false

export function PwaInstallPrompt() {
  const location = useLocation()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (shownThisPageLoad) return
    if (!TRIGGER_PATHS.has(location.pathname)) return
    if (pwaIsAlreadyInstalled()) return
    shownThisPageLoad = true
    const timer = window.setTimeout(() => setOpen(true), 2000)
    return () => window.clearTimeout(timer)
  }, [location.pathname])

  if (!open) return null
  return <PwaInstallBottomSheet onClose={() => setOpen(false)} />
}
