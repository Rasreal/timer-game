import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { AuthSheet } from '../shared/AuthSheet'
import './RegisterSheet.css'

// Ports lib/administration/users/create_user/create_user_widget.dart as a
// tall bottom sheet (AuthUtils.showRegistrationModal, 90% height, no
// backdrop-drag-to-dismiss). UI only: field grouping, labels, and hints match
// screen 8 ("Заявка на регистрацию"). Submit is still a no-op placeholder —
// this pilot doesn't create real company/auth records from here — but the
// БИН компании field and its validator (create_user_model.dart's
// _binUserTextControllerValidator: required, exactly 12 digits) are now
// ported so the real company_db lookup/company-provisioning flow described
// in create_user_widget.dart's onPressed can be wired up later without
// revisiting the form itself.
export function RegisterSheet() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [lastname, setLastname] = useState('')
  const [firstname, setFirstname] = useState('')
  const [patronymic, setPatronymic] = useState('')
  const [iin, setIin] = useState('')
  const [bin, setBin] = useState('')
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const close = () => navigate(-1)

  // create_user_model.dart validators (only firstname/iin/bin/email have one;
  // lastname and patronymic are optional). Like the Dart form
  // (autovalidateMode: disabled), errors only appear after pressing Отправить.
  const firstnameError = !firstname ? t('profile_error_required') : null
  const iinError = !iin
    ? t('profile_error_required')
    : iin.length < 12
      ? t('profile_error_iin_length')
      : null
  const binError = !bin
    ? t('profile_error_required')
    : bin.length < 12
      ? t('bin_error_12_digits')
      : null
  const emailError = !email
    ? t('profile_error_required')
    : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ? t('profile_error_email')
      : null

  const handleSubmit = () => {
    setSubmitted(true)
    if (firstnameError || iinError || binError || emailError) return
    close()
  }

  const errorClass = (err: string | null) => (submitted && err ? ' auth-form__input--error' : '')

  return (
    <AuthSheet
      title={t('user_registration_request')}
      helperText={
        <>
          {t('profile_helper')} <span className="register-sheet__asterisk">*</span>
        </>
      }
      onClose={close}
      tall
      footer={
        <button type="button" className="auth-form__primary" onClick={handleSubmit}>
          {t('common_send')}
        </button>
      }
    >
      <p className="register-sheet__label">{t('profile_fio')}</p>
      <input
        className="auth-form__input register-sheet__input"
        value={lastname}
        onChange={(e) => setLastname(e.target.value)}
        placeholder={t('profile_lastname')}
      />
      <input
        className={`auth-form__input register-sheet__input${errorClass(firstnameError)}`}
        value={firstname}
        onChange={(e) => setFirstname(e.target.value)}
        placeholder={t('profile_firstname')}
      />
      {submitted && firstnameError && <p className="register-sheet__error">{firstnameError}</p>}
      <input
        className="auth-form__input register-sheet__input"
        value={patronymic}
        onChange={(e) => setPatronymic(e.target.value)}
        placeholder={t('profile_patronymic')}
      />

      <p className="register-sheet__label">
        {t('profile_iin')} <span className="register-sheet__asterisk">*</span>
      </p>
      <input
        className={`auth-form__input register-sheet__input${errorClass(iinError)}`}
        value={iin}
        onChange={(e) => setIin(e.target.value.replace(/\D/g, '').slice(0, 12))}
        placeholder={t('user_iin_description')}
        inputMode="numeric"
      />
      {submitted && iinError && <p className="register-sheet__error">{iinError}</p>}

      <p className="register-sheet__label">
        {t('bin_company')} <span className="register-sheet__asterisk">*</span>
      </p>
      <input
        className={`auth-form__input register-sheet__input${errorClass(binError)}`}
        value={bin}
        onChange={(e) => setBin(e.target.value.replace(/\D/g, '').slice(0, 12))}
        placeholder={t('db_bin')}
        inputMode="numeric"
      />
      {submitted && binError && <p className="register-sheet__error">{binError}</p>}

      <p className="register-sheet__label">
        {t('user_email')} <span className="register-sheet__asterisk">*</span>
      </p>
      <input
        className={`auth-form__input register-sheet__input${errorClass(emailError)}`}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t('profile_email')}
        type="email"
      />
      {submitted && emailError && <p className="register-sheet__error">{emailError}</p>}
    </AuthSheet>
  )
}
