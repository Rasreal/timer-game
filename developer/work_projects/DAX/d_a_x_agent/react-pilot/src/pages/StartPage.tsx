import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { FFIcon } from '../shared/FFIcon'
import './StartPage.css'

interface OnboardingPage {
  titleKey: string
  subtitleKey: string
  image?: string
  isFirstPage?: boolean
}

// Ports lib/auth/start_page/start_page_widget.dart. The PWA-install prompt
// (_maybeShowPwaInstallPrompt) isn't ported here — this pilot doesn't run as
// an installable PWA.
//
// The Dart source always shows a single "Войти" button (not
// Пропустить/Далее/Начать) that opens the phone-entry bottom sheet,
// regardless of which onboarding slide is active (see lines 344-370 of the
// widget: the button sits below the PageView/indicator Stack, outside the
// per-slide conditional). Slides advance by swipe (a real PageView in Dart)
// or by clicking a page-indicator dot; ported here as a horizontal
// pointer-drag gesture on the slide area, with a distance/velocity threshold
// deciding whether the swipe commits to the next/previous slide or snaps back.
const PAGES: OnboardingPage[] = [
  { titleKey: '', subtitleKey: '', isFirstPage: true },
  {
    image: '/images/cart100.png',
    titleKey: 'start_cart_title',
    subtitleKey: 'start_cart_subtitle',
  },
  {
    image: '/images/cloudSync100.png',
    titleKey: 'start_sync_title',
    subtitleKey: 'start_sync_subtitle',
  },
  {
    image: '/images/finreport100.png',
    titleKey: 'start_reports_title',
    subtitleKey: 'start_reports_subtitle',
  },
]

const SWIPE_DISTANCE_THRESHOLD = 50
const SWIPE_VELOCITY_THRESHOLD = 0.35 // px/ms

export function StartPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [index, setIndex] = useState(0)
  const page = PAGES[index]

  const dragRef = useRef<{ startX: number; startTime: number; active: boolean } | null>(null)
  const trackRef = useRef<HTMLDivElement | null>(null)

  const goTo = (next: number) => {
    setIndex(Math.max(0, Math.min(PAGES.length - 1, next)))
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    dragRef.current = { startX: e.clientX, startTime: performance.now(), active: true }
    trackRef.current?.setPointerCapture(e.pointerId)
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    const drag = dragRef.current
    dragRef.current = null
    if (!drag?.active) return

    const dx = e.clientX - drag.startX
    const dt = Math.max(1, performance.now() - drag.startTime)
    const velocity = Math.abs(dx) / dt

    if (Math.abs(dx) > SWIPE_DISTANCE_THRESHOLD || velocity > SWIPE_VELOCITY_THRESHOLD) {
      goTo(dx < 0 ? index + 1 : index - 1)
    }
  }

  return (
    <div className="start-page">
      <div className="start-page__content">
        <div
          className="start-page__slide"
          key={index}
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => {
            dragRef.current = null
          }}
        >
          {page.isFirstPage ? (
            <div className="start-page__icon-circle">
              <FFIcon name="icons8FastCart64" size={64} color="#fff" />
            </div>
          ) : (
            <img className="start-page__image" src={page.image} alt="" />
          )}

          <div className={`start-page__title-wrap ${page.isFirstPage ? 'start-page__title-wrap--first' : ''}`}>
            {page.isFirstPage ? (
              <h1 className="start-page__app-title">
                DAX <span>Agent</span>
              </h1>
            ) : (
              <h1 className="start-page__page-title">{t(page.titleKey)}</h1>
            )}
          </div>

          {!page.isFirstPage && (
            <p className="start-page__subtitle">
              {t(page.subtitleKey)
                .split('\n')
                .map((line, i) => (
                  <span key={i}>{line}</span>
                ))}
            </p>
          )}
        </div>

        <div className="start-page__indicator">
          {PAGES.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`start-page__dot ${i === index ? 'start-page__dot--active' : ''}`}
              aria-label={t('start_go_to_slide', { num: i + 1 })}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      </div>

      <button
        type="button"
        className="start-page__login-button"
        onClick={() => navigate('/phoneEnter', { state: { backgroundLocation: location } })}
      >
        {t('start_login')}
      </button>

    </div>
  )
}
