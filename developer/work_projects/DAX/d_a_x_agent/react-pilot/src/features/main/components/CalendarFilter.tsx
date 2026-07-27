import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '../../../shared/Icon'
import './CalendarFilter.css'

// Ports lib/pages/main/components/calendar_filter.dart, which wraps
// FlutterFlowCalendar (lib/flutter_flow/flutter_flow_calendar.dart) in
// weekFormat/weekStartsMonday mode. That widget shows: a header row (month +
// year title, a "today" calendar icon, and left/right chevrons to page the
// visible week), a weekday-abbreviation row, and a single row of day numbers
// for the focused week. Selecting a day calls onChange with the new
// DateTimeRange; today's date renders as a lighter-orange circle
// (`lighterColor` = color.applyAlpha(0.60)) and the selected date as a solid
// orange circle, both with white text.
function startOfWeekMonday(date: Date) {
  const d = new Date(date)
  const day = d.getDay() // 0 = Sunday
  const diff = (day === 0 ? -6 : 1) - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function CalendarFilter({
  onDateChange,
}: {
  onDateChange?: (date: Date) => void
}) {
  const { t, i18n } = useTranslation()
  const today = useMemo(() => new Date(), [])
  const [focusedWeekStart, setFocusedWeekStart] = useState(() => startOfWeekMonday(today))
  const [selectedDay, setSelectedDay] = useState(today)

  const locale = i18n.language || 'ru'

  const weekDays = useMemo(() => {
    const days: Date[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(focusedWeekStart)
      d.setDate(d.getDate() + i)
      days.push(d)
    }
    return days
  }, [focusedWeekStart])

  const monthTitle = useMemo(() => {
    // Matches DateFormat.yMMMM(locale) — e.g. "декабрь 2025 г." (ru) / "February 2026" (en)
    const raw = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(focusedWeekStart)
    return raw.charAt(0).toLowerCase() + raw.slice(1)
  }, [focusedWeekStart, locale])

  const weekdayLabels = useMemo(() => {
    return weekDays.map((d) => {
      const label = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d)
      return label.charAt(0).toUpperCase() + label.slice(1).replace('.', '')
    })
  }, [weekDays, locale])

  const goToToday = () => setFocusedWeekStart(startOfWeekMonday(today))
  const goPrevWeek = () =>
    setFocusedWeekStart((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() - 7)
      return d
    })
  const goNextWeek = () =>
    setFocusedWeekStart((prev) => {
      const d = new Date(prev)
      d.setDate(d.getDate() + 7)
      return d
    })

  const handleSelectDay = (day: Date) => {
    setSelectedDay(day)
    onDateChange?.(day)
  }

  return (
    <div className="calendar-filter">
      <div className="calendar-filter__header">
        <span className="calendar-filter__title">{monthTitle}</span>
        {/* CustomIconButton's Icon(...) has no explicit `size`, so it uses the
            default Flutter IconThemeData size of 24. iconColor is the hardcoded
            const Color(0xFF57636C) in calendar_filter.dart — NOT theme.secondaryText. */}
        <button type="button" className="calendar-filter__icon-btn" aria-label={t('calendar_today')} onClick={goToToday}>
          <Icon name="calendar_today" filled size={24} color="#57636C" />
        </button>
        <button type="button" className="calendar-filter__icon-btn" aria-label={t('calendar_prev_week')} onClick={goPrevWeek}>
          <Icon name="chevron_left" filled size={24} color="#57636C" />
        </button>
        <button type="button" className="calendar-filter__icon-btn" aria-label={t('calendar_next_week')} onClick={goNextWeek}>
          <Icon name="chevron_right" filled size={24} color="#57636C" />
        </button>
      </div>
      <div className="calendar-filter__weekday-row">
        {weekdayLabels.map((label, i) => (
          <span key={i} className="calendar-filter__weekday">
            {label}
          </span>
        ))}
      </div>
      <div className="calendar-filter__day-row">
        {weekDays.map((day) => {
          const selected = isSameDay(day, selectedDay)
          const isToday = isSameDay(day, today)
          const cls = [
            'calendar-filter__day',
            selected ? 'calendar-filter__day--selected' : '',
            !selected && isToday ? 'calendar-filter__day--today' : '',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <button
              key={day.toISOString()}
              type="button"
              className={cls}
              onClick={() => handleSelectDay(day)}
            >
              {day.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
