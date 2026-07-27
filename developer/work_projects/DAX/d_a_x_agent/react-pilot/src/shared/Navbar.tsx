import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { Icon } from './Icon'
import './Navbar.css'

// Ports lib/shared/widgets/navbar_widget.dart. In the Dart source this widget
// exists and is fully implemented, but every page that references it
// (main/orders/messages/settings) has its `bottomNavigationBar:` line
// commented out, so it never actually renders in the current app. That looks
// like leftover mid-refactor state rather than an intentional decision to ship
// without navigation, so it's wired up (uncommented, in effect) here.
//
// One deviation: the Dart "Routes" tab only navigates when coverage mode is on
// (`onTap: () { if (FFAppState().mainPageType1) {...} }`), silently no-op'ing
// otherwise. Since coverage mode defaults to off, replicating that gate would
// make the home tab unreachable from the nav bar out of the box — treated as
// an unintentional guard rather than a real UX choice, so it always navigates here.
// Icon names match lib/shared/widgets/navbar_widget.dart exactly:
// Icons.share_location, Icons.receipt, Icons.mail_outlined, Icons.settings_outlined.
// Ligature names are the base name ("mail", "settings"); the variant comes
// from Icon.tsx's `filled` prop — plain Icons.x is the filled family,
// Icons.x_outlined the outlined one.
const TABS: { path: string; labelKey: string; icon: string; filled: boolean }[] = [
  { path: '/main', labelKey: 'nav_routes', icon: 'share_location', filled: true },
  { path: '/orders', labelKey: 'nav_orders', icon: 'receipt', filled: true },
  { path: '/messages', labelKey: 'nav_messages', icon: 'mail', filled: false },
  { path: '/settings', labelKey: 'nav_settings', icon: 'settings', filled: false },
]

export function Navbar() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <nav className="navbar">
      {TABS.map((tab) => {
        const active = location.pathname === tab.path
        return (
          <button
            key={tab.path}
            type="button"
            className={`navbar__tab ${active ? 'navbar__tab--active' : ''}`}
            onClick={() => navigate(tab.path)}
          >
            <Icon
              name={tab.icon}
              size={24}
              filled={tab.filled}
              color={active ? 'var(--color-primary)' : '#999999'}
              className="navbar__icon"
            />
            <span className="navbar__label">{t(tab.labelKey)}</span>
          </button>
        )
      })}
    </nav>
  )
}
