import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BaseSettingsItem } from './BaseSettingsItem'
import { Icon } from '../../../shared/Icon'
import { DynamicSupabaseService } from '../../auth/dynamicSupabaseService'
import './DatabaseConnectionItem.css'

// Ports lib/pages/settings/components/database_connection_item.dart, which opens
// lib/components/database_connection/change_database_bottom_sheet.dart. The Dart
// source has this item commented out on the settings list itself, but the
// ground-truth screenshots (app-screen-6/11) show a separate "Поменять Базу"
// card below the main settings card that opens the "База Данных" sheet — so we
// render it there, matching the screenshots over the (stale) commented-out code.
export function DatabaseConnectionItem() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="database-connection-card">
        <BaseSettingsItem
          title={t('db_change')}
          icon={<Icon name="sync_alt" filled color="var(--color-secondary-text)" />}
          showTopBorder
          showBottomBorder
          onTap={() => setOpen(true)}
        />
      </div>
      {open && <DatabaseSheet onClose={() => setOpen(false)} />}
    </>
  )
}

function DatabaseSheet({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const [phone, setPhone] = useState('')
  const [bin, setBin] = useState('')
  const [phoneFocused, setPhoneFocused] = useState(false)
  const [binFocused, setBinFocused] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connectedName, setConnectedName] = useState<string | null>(
    DynamicSupabaseService.instance.currentCompanyName,
  )

  const formatPhoneMask = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 11)
    let out = ''
    if (digits.length > 0) out += '+' + digits[0]
    if (digits.length > 1) out += ' (' + digits.slice(1, 4)
    if (digits.length >= 4) out += ') ' + digits.slice(4, 7)
    if (digits.length >= 7) out += '-' + digits.slice(7, 9)
    if (digits.length >= 9) out += '-' + digits.slice(9, 11)
    return out
  }

  const formatBinMask = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 12)
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ')
  }

  const handleConnect = async () => {
    setError(null)
    const phoneDigits = phone.replace(/\D/g, '')
    const binDigits = bin.replace(/\D/g, '')

    if (phoneDigits.length !== 11) {
      setError(`${t('phone_must_11_digits')} (${phoneDigits.length})`)
      return
    }
    if (!phoneDigits.startsWith('7')) {
      setError(t('phone_must_start_7'))
      return
    }
    if (binDigits.length !== 12) {
      setError(t('bin_must_12_digits'))
      return
    }

    setConnecting(true)
    try {
      const result = await DynamicSupabaseService.instance.switchToCompanyDatabase(
        `+${phoneDigits}`,
        binDigits,
      )
      if (result === 'success') {
        setConnectedName(DynamicSupabaseService.instance.currentCompanyName)
        onClose()
      } else {
        setError(t('connection_error'))
      }
    } catch {
      setError(t('connection_error'))
    } finally {
      setConnecting(false)
    }
  }

  return (
    <div className="database-sheet-backdrop" onClick={onClose}>
      <div className="database-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="database-sheet__handle" />
        <div className="database-sheet__header">
          <div>
            <h2>{t('db_title')}</h2>
            <p>
              {t('db_enter_connection_data')} <span className="database-sheet__asterisk">*</span>
            </p>
          </div>
          <button type="button" className="database-sheet__close" onClick={onClose} aria-label={t('common_close')}>
            <Icon name="close" variant="round" />
          </button>
        </div>

        <div className="database-sheet__form">
          <div className={`database-sheet__field ${phoneFocused ? 'database-sheet__field--focused' : ''}`}>
            <label className="database-sheet__label">{t('phone_number')}</label>
            <input
              className="database-sheet__input"
              type="tel"
              value={phone}
              autoFocus
              onFocus={() => setPhoneFocused(true)}
              onBlur={() => setPhoneFocused(false)}
              onChange={(e) => setPhone(formatPhoneMask(e.target.value))}
            />
          </div>

          <div className={`database-sheet__field ${binFocused ? 'database-sheet__field--focused' : ''}`}>
            <label className="database-sheet__label">{t('bin_full')}</label>
            <input
              className="database-sheet__input"
              type="text"
              inputMode="numeric"
              value={bin}
              onFocus={() => setBinFocused(true)}
              onBlur={() => setBinFocused(false)}
              onChange={(e) => setBin(formatBinMask(e.target.value))}
            />
          </div>

          {error && <p className="database-sheet__error">{error}</p>}

          {connectedName && (
            <div className="database-sheet__status">
              <Icon name="check_circle" filled size={20} color="#4CAF50" />
              <span>
                {t('connected_to')} <strong>{connectedName}</strong>
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          className="database-sheet__connect"
          disabled={connecting}
          onClick={handleConnect}
        >
          {connecting ? t('connecting') : t('db_connect')}
        </button>
      </div>
    </div>
  )
}
