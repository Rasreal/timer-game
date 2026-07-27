import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { loginWithPhone } from '../features/auth/authStore'
import { DynamicSupabaseService } from '../features/auth/dynamicSupabaseService'
import { DEMO_PHONE_NUMBER } from '../features/auth/phoneAuthService'
import { AuthSheet } from '../shared/AuthSheet'
import { AlertDialog } from '../shared/AlertDialog'
import './AuthForm.css'

// Locale keys for DynamicSupabaseService.switchToCompanyDatabase results —
// resolved with t() at display time so they follow the active language.
const DYNAMIC_DB_ERROR_KEYS: Record<string, string> = {
  user_not_found: 'db_error_user_not_found',
  company_not_found: 'db_error_company_not_found',
  invalid_bin: 'db_error_invalid_bin',
  unknown_error: 'db_error_unknown',
}

const CODE_LENGTH = 6
const TIMER_SECONDS = 60

// Ports lib/auth/login_code_enter/login_code_enter_widget.dart +
// lib/auth/widgets/sms_code_input.dart (6 boxed-pin cells) +
// lib/auth/widgets/sms_timer_widget.dart (60s resend countdown) +
// lib/auth/controllers/sms_code_controller.dart's submit logic. Device-security
// lockout isn't ported (see features/auth/phoneAuthService.ts for why).
export function LoginCodeEnterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const phone = params.get('phone') ?? ''
  const bin = params.get('bin') ?? ''
  const expectedCode = params.get('code') ?? ''
  const isDevGenerated = params.get('dev') === '1'
  const isDemoPhone = phone === DEMO_PHONE_NUMBER

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''))
  const [error, setError] = useState<string | null>(null)
  const [alert, setAlert] = useState<{ title: string; message: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(TIMER_SECONDS)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (secondsLeft <= 0) return
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [secondsLeft])

  const close = () => navigate(-1)

  const enteredCode = digits.join('')

  const handleDigitChange = (index: number, value: string) => {
    const clean = value.replace(/\D/g, '')
    if (!clean) {
      setDigits((prev) => {
        const next = [...prev]
        next[index] = ''
        return next
      })
      return
    }
    setDigits((prev) => {
      const next = [...prev]
      next[index] = clean.slice(-1)
      return next
    })
    if (index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleResend = () => {
    setSecondsLeft(TIMER_SECONDS)
  }

  const handleSubmit = async () => {
    setError(null)

    // Incomplete code -> inline field validator (AuthUtils.validateSmsCode);
    // wrong code -> thrown Exception surfaced via showErrorDialog in Dart.
    if (enteredCode.length !== CODE_LENGTH) {
      setError(t('validation_sms_6_digits'))
      return
    }
    if (enteredCode !== expectedCode) {
      setAlert({ title: t('common_error'), message: t('sms_code_invalid') })
      return
    }

    setLoading(true)
    try {
      if (phone === DEMO_PHONE_NUMBER) {
        await loginWithPhone(DEMO_PHONE_NUMBER)
        navigate('/main')
        return
      }

      const switchResult = await DynamicSupabaseService.instance.switchToCompanyDatabase(phone, bin)
      if (switchResult !== 'success') {
        setAlert({
          title: t('common_error'),
          message: t(DYNAMIC_DB_ERROR_KEYS[switchResult] ?? 'db_error_unknown'),
        })
        return
      }

      await loginWithPhone(phone)
      navigate('/main')
    } catch (e) {
      setAlert({ title: t('common_error'), message: t('error_occurred', { error: String(e) }) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <AuthSheet
        title={t('validation_sms_code')}
        onClose={close}
        footer={
          <>
            <button type="button" className="auth-form__primary" onClick={handleSubmit} disabled={loading}>
              {loading ? '...' : t('common_confirm')}
            </button>
            {/* AuthFormContainer renders the SmsTimerWidget as secondaryWidget
                BELOW the primary button, not in the scrollable body. */}
            {secondsLeft > 0 ? (
              <p className="auth-form__timer">
                {t('sms_resend_prefix')} <span>{secondsLeft}</span> {t('sms_resend_suffix')}
              </p>
            ) : (
              <button type="button" className="auth-form__resend" onClick={handleResend}>
                {t('sms_resend')}
              </button>
            )}
          </>
        }
      >
        <p className="auth-form__info-text auth-form__info-text--sms">
          {t('sms_sent_to_number', { phone })}
        </p>

        {(isDevGenerated || isDemoPhone) && (
          <div className="auth-form__dev-code-banner">
            {isDemoPhone ? t('auth_demo_fixed_code') : t('auth_demo_no_sms')}
            <br />
            {t('auth_your_code')}
            <strong>{expectedCode}</strong>
          </div>
        )}

        <div className="sms-code-input">
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => {
                inputRefs.current[i] = el
              }}
              className={`sms-code-input__cell ${error ? 'sms-code-input__cell--error' : ''}`}
              value={digit}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              inputMode="numeric"
              maxLength={1}
              placeholder="*"
              autoFocus={i === 0}
            />
          ))}
        </div>
        {error && <p className="auth-form__error" style={{ marginLeft: 0 }}>{error}</p>}
      </AuthSheet>

      {alert && <AlertDialog title={alert.title} message={alert.message} onClose={() => setAlert(null)} />}
    </>
  )
}
