import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { formatDDMMYYYY } from '../../../lib/dateFormat'
import { FFIcon } from '../../../shared/FFIcon'
import { Icon } from '../../../shared/Icon'
import './MainAppBar.css'

// Ports lib/pages/main/components/{main_app_bar,main_app_bar_title}.dart.
// The calendar-filter icon (Icons.filter_list) is shown only when coverage
// mode is on (FFAppState().mainPageType1), matching the Dart `showCalendarFilter`
// gate on MainAppBar. It toggles the coverage calendar below the app bar and
// turns orange (--color-primary) while the calendar is open, gray otherwise.
export function MainAppBar({
  showFilter,
  calendarOpen,
  onToggleCalendar,
}: {
  showFilter: boolean
  calendarOpen: boolean
  onToggleCalendar: () => void
}) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const now = new Date()
  // main_app_bar_title.dart's dateFormatEEEE hardcodes DateFormat('EEEE', 'ru_RU')
  // regardless of the app's selected language; here the weekday follows the
  // active i18n language instead so kk/en render correctly.
  const weekdayLocale = i18n.language.startsWith('kk')
    ? 'kk-KZ'
    : i18n.language.startsWith('en')
      ? 'en-US'
      : 'ru-RU'
  const weekday = now.toLocaleDateString(weekdayLocale, { weekday: 'long' })

  return (
    <header className="main-app-bar">
      <button
        type="button"
        className="main-app-bar__location"
        aria-label={t('city_select')}
        onClick={() => navigate('/selectCityPage')}
      >
        {/* FFIcons.klocation, light gray (--color-alternate) */}
        <FFIcon name="location" size={24} color="var(--color-alternate)" />
      </button>
      <div className="main-app-bar__title-group">
        <span className="main-app-bar__weekday">{weekday}</span>
        <span className="main-app-bar__date">{formatDDMMYYYY(now)}</span>
      </div>
      {showFilter ? (
        <button
          type="button"
          className="main-app-bar__filter"
          aria-label={t('calendar_toggle')}
          aria-pressed={calendarOpen}
          onClick={onToggleCalendar}
        >
          <Icon
            name="filter_list"
            size={24}
            // main_app_bar.dart: active color is Constants.primaryColor, a hardcoded
            // const Color(0xFFFF6300) — NOT theme.primary; inactive IS theme.alternate.
            color={calendarOpen ? '#FF6300' : 'var(--color-alternate)'}
          />
        </button>
      ) : (
        <div className="main-app-bar__spacer" />
      )}
    </header>
  )
}
