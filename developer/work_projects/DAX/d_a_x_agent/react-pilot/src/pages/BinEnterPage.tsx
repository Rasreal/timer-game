import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { verifyPhoneNumber } from '../features/auth/phoneAuthService'
import { AuthSheet } from '../shared/AuthSheet'
import { AlertDialog } from '../shared/AlertDialog'
import './AuthForm.css'

// Ports lib/auth/phone_enter/bin_enter_widget.dart as a bottom sheet
// (AuthUtils.showAuthModal). On userNotFound the Dart app shows an error
// dialog then opens the registration modal — mirrored via /register.
// location.state.backgroundLocation (see App.tsx) is forwarded to
// /loginCodeEnter and /register so StartPage stays the dimmed background.
export function BinEnterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const backgroundState = { state: location.state }
  const [params] = useSearchParams()
  const phone = params.get('phone') ?? ''

  const [bin, setBin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [alert, setAlert] = useState<{ title: string; message: string; then?: () => void } | null>(null)
  const [loading, setLoading] = useState(false)

  const close = () => navigate(-1)

  const validateBin = (value: string): string | null => {
    if (!value) return t('bin_enter')
    if (value.length !== 12) return t('bin_must_12_digits')
    if (!/^\d+$/.test(value)) return t('bin_digits_only')
    return null
  }

  const handleSubmit = async () => {
    const validationError = validateBin(bin)
    if (validationError) {
      // Dart shows both the inline field validator error and the
      // 'Ошибка валидации' dialog from _handleBinSubmit.
      setError(validationError)
      setAlert({
        title: t('validation_error_title'),
        message: t('bin_enter_valid'),
      })
      return
    }

    setLoading(true)
    setError(null)
    try {
      const result = await verifyPhoneNumber(phone, bin)

      if (result.status === 'success' || result.status === 'demoUser') {
        navigate(
          `/loginCodeEnter?phone=${encodeURIComponent(phone)}&bin=${encodeURIComponent(bin)}&code=${encodeURIComponent(result.smsCode ?? '')}&dev=${result.isDevGeneratedCode ? '1' : '0'}`,
          backgroundState,
        )
        return
      }

      if (result.status === 'userNotFound') {
        setAlert({
          title: t('registration_title'),
          message: result.errorMessage ?? t('phone_not_registered'),
          then: () => navigate(`/register?phone=${encodeURIComponent(phone)}`, backgroundState),
        })
        return
      }

      setAlert({ title: t('common_error'), message: result.errorMessage ?? t('error_unknown') })
    } catch (e) {
      setAlert({ title: t('common_error'), message: t('error_unexpected', { error: String(e) }) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <AuthSheet
        title={t('bin_enter')}
        onClose={close}
        footer={
          <>
            <button type="button" className="auth-form__primary" onClick={handleSubmit} disabled={loading}>
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
        <p className="auth-form__info-text">{t('bin_org_description')}</p>

        <input
          className={`auth-form__input ${error ? 'auth-form__input--error' : ''}`}
          value={bin}
          onChange={(e) => setBin(e.target.value.replace(/\D/g, '').slice(0, 12))}
          placeholder=""
          inputMode="numeric"
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
