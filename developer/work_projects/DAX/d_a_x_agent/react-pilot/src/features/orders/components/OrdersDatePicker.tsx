import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '../../../shared/Icon'
import './OrdersDatePicker.css'

// Ports lib/pages/orders/components/orders_date_picker.dart. The trigger is a
// 54x54 FlutterFlowIconButton (Icons.date_range_outlined, always the inactive
// alternate gray — orders_widget.dart passes isCalendarActive: false). Pressing
// it opens Flutter's showDatePicker (firstDate 1900, lastDate 2050) themed via
// wrapInMaterialDatePickerTheme: orange primary header with white InterTight
// 600 32px date, white picker body with primaryText day/weekday glyphs,
// primary-orange selected-day circle with white text, and primaryText
// ОТМЕНА/ОК action buttons. The dialog below re-implements that Material 2
// calendar dialog (overline header label, month + arrow_drop_down year toggle,
// chevron month nav, weekday initials row, 6-row day grid, year grid, and the
// pencil-icon manual-input mode) since no native web control matches it.

const FIRST_YEAR = 1900
const LAST_YEAR = 2050

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function OrdersDatePicker({
  selectedDate,
  onDateChanged,
}: {
  selectedDate: Date
  onDateChanged: (date: Date) => void
}) {
  const { t, i18n } = useTranslation()
  // Intl locales matching the app's three languages (ru default).
  const lang = i18n.language ?? 'ru'
  const locale = lang.startsWith('kk') ? 'kk' : lang.startsWith('en') ? 'en-US' : 'ru'
  // MaterialLocalizations firstDayOfWeekIndex: Sunday for en_US, Monday for ru/kk.
  const firstDayOfWeek = locale === 'en-US' ? 0 : 1

  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Date>(selectedDate)
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth())
  const [mode, setMode] = useState<'day' | 'year'>('day')
  const [inputMode, setInputMode] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [inputError, setInputError] = useState(false)
  const yearListRef = useRef<HTMLDivElement | null>(null)

  const openDialog = () => {
    setDraft(selectedDate)
    setViewYear(selectedDate.getFullYear())
    setViewMonth(selectedDate.getMonth())
    setMode('day')
    setInputMode(false)
    setInputError(false)
    setInputValue(
      `${pad2(selectedDate.getDate())}.${pad2(selectedDate.getMonth() + 1)}.${selectedDate.getFullYear()}`,
    )
    setOpen(true)
  }

  // Barrier dismiss with Escape, like Flutter's dialog barrier.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Scroll the selected year into view when the year grid opens.
  useEffect(() => {
    if (mode !== 'year') return
    const el = yearListRef.current?.querySelector('[data-selected="true"]')
    el?.scrollIntoView({ block: 'center' })
  }, [mode])

  // "вт, 21 июл." — Material 2 header date format per locale.
  const headerDate = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' }).format(draft),
    [locale, draft],
  )

  // "июль 2026 г." month/year subheader label.
  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(new Date(viewYear, viewMonth, 1)),
    [locale, viewYear, viewMonth],
  )

  // Narrow weekday initials in grid order (П В С Ч П С В for ru).
  const weekdayInitials = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: 'narrow' })
    // 2023-01-01 is a Sunday; index date by weekday number 0..6.
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2023, 0, 1 + ((firstDayOfWeek + i) % 7))))
  }, [locale, firstDayOfWeek])

  const dayCells = useMemo(() => {
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const leading = (new Date(viewYear, viewMonth, 1).getDay() - firstDayOfWeek + 7) % 7
    const cells: (number | null)[] = Array.from({ length: leading }, () => null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    return cells
  }, [viewYear, viewMonth, firstDayOfWeek])

  const today = new Date()

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1)
    if (next.getFullYear() < FIRST_YEAR || next.getFullYear() > LAST_YEAR) return
    setViewYear(next.getFullYear())
    setViewMonth(next.getMonth())
  }

  const parseInput = (raw: string): Date | null => {
    const m = raw.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
    if (!m) return null
    const [, d, mo, y] = m.map(Number)
    const date = new Date(y, mo - 1, d)
    if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null
    if (y < FIRST_YEAR || y > LAST_YEAR) return null
    return date
  }

  const handleOk = () => {
    if (inputMode) {
      const parsed = parseInput(inputValue)
      if (!parsed) {
        setInputError(true)
        return
      }
      setOpen(false)
      onDateChanged(parsed)
      return
    }
    setOpen(false)
    onDateChanged(new Date(draft.getFullYear(), draft.getMonth(), draft.getDate()))
  }

  const toggleInputMode = () => {
    if (!inputMode) {
      setInputValue(`${pad2(draft.getDate())}.${pad2(draft.getMonth() + 1)}.${draft.getFullYear()}`)
      setInputError(false)
    }
    setMode('day')
    setInputMode((v) => !v)
  }

  return (
    <>
      <button type="button" className="orders-date-picker" aria-label={t('date_picker_change_date')} onClick={openDialog}>
        {/* Icons.date_range_outlined; isCalendarActive is always false in the Dart
            source (orders_widget.dart passes the literal `false`), so this is
            always the inactive gray-alternate color, never the active orange. */}
        <Icon name="date_range" color="var(--color-alternate)" />
      </button>

      {open && (
        <div className="odp-overlay" onClick={() => setOpen(false)}>
          <div className="odp-dialog" role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>
            <div className="odp-header">
              <span className="odp-header-overline">{t('date_picker_select_date')}</span>
              <div className="odp-header-row">
                <span className="odp-header-date">{headerDate}</span>
                <button
                  type="button"
                  className="odp-header-edit"
                  aria-label={inputMode ? t('date_picker_select_date') : t('date_picker_enter_date')}
                  onClick={toggleInputMode}
                >
                  {/* Icons.edit pencil (calendar_today when in manual-input mode) */}
                  <Icon name={inputMode ? 'calendar_today' : 'edit'} filled size={24} />
                </button>
              </div>
            </div>

            {inputMode ? (
              <div className="odp-input-body">
                <label className={`odp-input-field${inputError ? ' odp-input-field--error' : ''}`}>
                  <span className="odp-input-label">{t('date_picker_enter_date')}</span>
                  <input
                    className="odp-input"
                    value={inputValue}
                    placeholder={t('date_picker_format_hint')}
                    inputMode="numeric"
                    autoFocus
                    onChange={(e) => {
                      setInputValue(e.target.value)
                      setInputError(false)
                      const parsed = parseInput(e.target.value)
                      if (parsed) {
                        setDraft(parsed)
                        setViewYear(parsed.getFullYear())
                        setViewMonth(parsed.getMonth())
                      }
                    }}
                  />
                  <span className="odp-input-helper">{t('date_picker_format_hint')}</span>
                </label>
              </div>
            ) : (
              <>
                <div className="odp-controls">
                  <button
                    type="button"
                    className="odp-month-btn"
                    onClick={() => setMode((m) => (m === 'day' ? 'year' : 'day'))}
                  >
                    {monthLabel}
                    <Icon
                      name="arrow_drop_down"
                      filled
                      size={24}
                      className={`odp-drop-icon${mode === 'year' ? ' odp-drop-icon--up' : ''}`}
                    />
                  </button>
                  {mode === 'day' && (
                    <div className="odp-nav">
                      <button type="button" className="odp-nav-btn" aria-label={t('date_picker_prev_month')} onClick={() => shiftMonth(-1)}>
                        <Icon name="chevron_left" filled size={24} />
                      </button>
                      <button type="button" className="odp-nav-btn" aria-label={t('date_picker_next_month')} onClick={() => shiftMonth(1)}>
                        <Icon name="chevron_right" filled size={24} />
                      </button>
                    </div>
                  )}
                </div>

                {mode === 'day' ? (
                  <div className="odp-calendar">
                    <div className="odp-weekdays">
                      {weekdayInitials.map((w, i) => (
                        <span key={i} className="odp-weekday">
                          {w}
                        </span>
                      ))}
                    </div>
                    <div className="odp-grid">
                      {dayCells.map((d, i) =>
                        d === null ? (
                          <span key={i} />
                        ) : (
                          <button
                            key={i}
                            type="button"
                            className={`odp-day${
                              isSameDay(new Date(viewYear, viewMonth, d), draft) ? ' odp-day--selected' : ''
                            }${isSameDay(new Date(viewYear, viewMonth, d), today) ? ' odp-day--today' : ''}`}
                            onClick={() => setDraft(new Date(viewYear, viewMonth, d))}
                          >
                            {d}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="odp-years" ref={yearListRef}>
                    {Array.from({ length: LAST_YEAR - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i).map((y) => (
                      <button
                        key={y}
                        type="button"
                        data-selected={y === draft.getFullYear()}
                        className={`odp-year${y === draft.getFullYear() ? ' odp-year--selected' : ''}${
                          y === today.getFullYear() ? ' odp-year--today' : ''
                        }`}
                        onClick={() => {
                          setViewYear(y)
                          setMode('day')
                        }}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            <div className="odp-actions">
              <button type="button" className="odp-action-btn" onClick={() => setOpen(false)}>
                {t('common_cancel')}
              </button>
              <button type="button" className="odp-action-btn" onClick={handleOk}>
                {t('common_ok')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
