import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../auth/authStore'
import { BaseSettingsItem } from './BaseSettingsItem'
import { Icon } from '../../../shared/Icon'
import './ProfileSettingsItem.css'

// Ports lib/administration/settings/profil/profil_widget.dart + profil_model.dart,
// composed in the Dart source from lib/components/profile/widgets/
// (profile_header, profile_form, profile_form_field, profile_section_header,
// profile_save_button). This is an edit form ("Редактировать"), not the
// read-only summary this pilot previously showed.
//
// Field readonly logic mirrors profile_form.dart exactly:
// - Фамилия (lastname): always editable
// - Имя (firstname): readonly IF the app already has a non-empty firstname
//   for this user (isReadonly: FFAppState().userInfo.firstnameUser.isNotEmpty)
// - Отчество (patronymic): always editable
// - ИИН, Email: always editable
// - Номер телефона: always readonly (isReadonly: true)
//
// Save wiring: profil_widget.dart's _handleSave both updates FFAppState()
// and calls UsersTable().update(...) against the per-company Supabase project
// resolved by lib/backend/dynamic_supabase_service.dart. That resolution layer
// isn't ported here (see authStore.ts's loginWithPhone doc comment), so there
// is no reachable per-company `users` row to write back to. Save here only
// commits local edits into authStore's userInfo (updateUserInfo) and closes
// the sheet — no network call. Validation mirrors profil_model.dart's
// validators (required IIN of exactly 12 digits, required well-formed email).
export function ProfileSettingsItem() {
  const { t } = useTranslation()
  const userInfo = useAuthStore((s) => s.userInfo)
  const updateUserInfo = useAuthStore((s) => s.updateUserInfo)
  const [open, setOpen] = useState(false)

  const [lastname, setLastname] = useState('')
  const [firstname, setFirstname] = useState('')
  const [patronymic, setPatronymic] = useState('')
  const [iin, setIin] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [errors, setErrors] = useState<{ iin?: string; email?: string }>({})

  const firstnameIsReadonly = (userInfo?.firstnameUser ?? '').trim().length > 0

  const openSheet = () => {
    setLastname(userInfo?.lastnameUser ?? '')
    setFirstname(userInfo?.firstnameUser ?? '')
    setPatronymic(userInfo?.patronymicUser ?? '')
    setIin(userInfo?.iinUser ?? '')
    setEmail(userInfo?.emailUser ?? '')
    setPhone(userInfo?.phoneNumber ?? '')
    setErrors({})
    setOpen(true)
  }

  const validate = () => {
    const next: { iin?: string; email?: string } = {}
    if (!iin.trim()) next.iin = t('profile_error_required')
    else if (iin.trim().length < 12) next.iin = t('profile_error_iin_length')

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email.trim()) next.email = t('profile_error_required')
    else if (!emailRe.test(email.trim())) next.email = t('profile_error_email')

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    updateUserInfo({
      lastnameUser: lastname,
      firstnameUser: firstname,
      patronymicUser: patronymic,
      iinUser: iin,
      emailUser: email,
      phoneNumber: phone,
    })
    setOpen(false)
  }

  return (
    <>
      <BaseSettingsItem
        title={t('profile_title')}
        icon={<Icon name="person_outline" variant="round" />}
        showTopBorder
        onTap={openSheet}
      />
      {open && (
        <div className="selector-sheet-backdrop" onClick={() => setOpen(false)}>
          <div
            className="selector-sheet profile-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="selector-sheet__handle" />
            <div className="profile-sheet__header">
              <div>
                <h2 className="profile-sheet__title">{t('profile_edit_title')}</h2>
                <p className="profile-sheet__helper">
                  {t('profile_helper')} <span className="profile-sheet__asterisk">*</span>
                </p>
              </div>
              <button
                type="button"
                className="selector-sheet__close"
                onClick={() => setOpen(false)}
                aria-label={t('common_close')}
              >
                <Icon name="close" variant="round" />
              </button>
            </div>

            <div className="profile-sheet__body">
              <p className="profile-sheet__label">{t('profile_fio')}</p>
              <input
                className="profile-sheet__input"
                value={lastname}
                onChange={(e) => setLastname(e.target.value)}
                placeholder={t('profile_lastname')}
              />
              <input
                className="profile-sheet__input"
                value={firstname}
                onChange={(e) => setFirstname(e.target.value)}
                placeholder={t('profile_firstname')}
                readOnly={firstnameIsReadonly}
                data-readonly={firstnameIsReadonly || undefined}
              />
              <input
                className="profile-sheet__input"
                value={patronymic}
                onChange={(e) => setPatronymic(e.target.value)}
                placeholder={t('profile_patronymic')}
              />

              <p className="profile-sheet__label">
                {t('profile_iin')} <span className="profile-sheet__asterisk">*</span>
              </p>
              <input
                className="profile-sheet__input"
                value={iin}
                onChange={(e) => setIin(e.target.value.replace(/\D/g, '').slice(0, 12))}
                placeholder={t('profile_iin_placeholder')}
                inputMode="numeric"
              />
              {errors.iin && <p className="profile-sheet__error">{errors.iin}</p>}

              <p className="profile-sheet__label">
                {t('profile_contacts')} <span className="profile-sheet__asterisk">*</span>
              </p>
              <input
                className="profile-sheet__input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('profile_email')}
                type="email"
              />
              {errors.email && <p className="profile-sheet__error">{errors.email}</p>}
              <input
                className="profile-sheet__input"
                value={phone}
                placeholder={t('profile_phone')}
                readOnly
                data-readonly
              />
            </div>

            <div className="profile-sheet__footer">
              <button type="button" className="profile-sheet__save" onClick={handleSave}>
                {t('profile_save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
