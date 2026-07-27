import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { DEMO_PHONE_NUMBER } from '../features/auth/phoneAuthService'
import { supabase } from '../lib/supabase'
import { AuthSheet } from '../shared/AuthSheet'
import { AlertDialog } from '../shared/AlertDialog'
import './AuthForm.css'

// Ports lib/auth/phone_enter/phone_only_widget.dart, rendered as a bottom
// sheet over the dimmed start page (AuthUtils.showAuthModal). Backdrop click
// and the close (X) button both navigate back to /start, matching
// Navigator.pop(context) in the Dart modal. On an unregistered number the
// Dart app shows an error dialog then opens the registration modal
// (CreateUserWidget) — mirrored here by navigating to /register after the
// alert is dismissed. This page is only ever reached via the background-
// location pattern (see App.tsx), so location.state.backgroundLocation is
// always set here — forwarded to /binEnter and /register so StartPage stays
// the dimmed background all the way through the chain.
export function PhoneEnterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const backgroundState = { state: location.state }
  const [phone, setPhone] = useState('+7')
  const [error, setError] = useState<string | null>(null)
  const [alert, setAlert] = useState<{ title: string; message: string; then?: () => void } | null>(null)
  const [loading, setLoading] = useState(false)

  const close = () => navigate(-1)

  // MaskTextInputFormatter(mask: '+7##########'): fixed +7 prefix, then up to
  // 10 digits — 12 characters total.
  const applyPhoneMask = (raw: string) => {
    let digits = raw.replace(/\D/g, '')
    if (digits.startsWith('7')) digits = digits.slice(1)
    return `+7${digits.slice(0, 10)}`
  }

  const handleNext = async () => {
    setError(null)
    const normalized = phone.replace(/[^\d+]/g, '')

    if (normalized.length < 12) {
      // Dart shows both: the inline field validator (AuthUtils.validatePhoneNumber)
      // and the 'Ошибка валидации' dialog from _handlePhoneNext.
      setError(
        normalized.length <= 2 ? t('validation_required_fill') : t('validation_phone_correct'),
      )
      setAlert({
        title: t('validation_error_title'),
        message: t('phone_enter_valid'),
      })
      return
    }

    if (normalized === DEMO_PHONE_NUMBER) {
      navigate(`/binEnter?phone=${encodeURIComponent(normalized)}`, backgroundState)
      return
    }

    setLoading(true)
    try {
      const { data: users, error: queryError } = await supabase
        .from('users')
        .select('role_user, sms_code')
        .eq('phone_number', normalized)

      if (queryError) throw queryError
      const user = users?.[0]

      if (user?.role_user === 0) {
        setAlert({
          title: t('main_no_access'),
          message: t('auth_no_access_message'),
        })
        return
      }

      if (!user || !user.sms_code) {
        setAlert({
          title: t('registration_title'),
          message: t('phone_not_registered'),
          then: () => navigate(`/register?phone=${encodeURIComponent(normalized)}`, backgroundState),
        })
        return
      }

      navigate(`/binEnter?phone=${encodeURIComponent(normalized)}`, backgroundState)
    } catch (e) {
      setAlert({ title: t('common_error'), message: t('error_unexpected', { error: String(e) }) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <AuthSheet
        title={t('phone_enter')}
        onClose={close}
        footer={
          <>
            <button type="button" className="auth-form__primary" onClick={handleNext} disabled={loading}>
              {loading ? '...' : t('common_continue')}
            </button>
            <p className="auth-form__privacy">
              {t('auth_privacy_agree_line1')} <br />
              {t('auth_privacy_agree_line2')}{' '}
              <button
                type="button"
                className="auth-form__privacy-link"
                onClick={() => navigate('/privacyPolicy')}
              >
                {t('auth_privacy_policy_link')}
              </button>
            </p>
          </>
        }
      >
        <p className="auth-form__info-text">{t('sms_will_be_sent')}</p>

        <input
          className={`auth-form__input ${error ? 'auth-form__input--error' : ''}`}
          value={phone}
          onChange={(e) => setPhone(applyPhoneMask(e.target.value))}
          placeholder="+7"
          inputMode="tel"
          autoFocus
        />
        {error && <p className="auth-form__error">{error}</p>}
      </AuthSheet>

      {alert && (
        <AlertDialog
          title={alert.title}
          message={alert.message}
          onClose={() => {
            const then = alert.then
            setAlert(null)
            then?.()
          }}
        />
      )}
    </>
  )
}
