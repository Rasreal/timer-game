import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { DynamicSupabaseService } from '../auth/dynamicSupabaseService'
import { getCurrentLocation } from '../../lib/geolocation'
import { Icon } from '../../shared/Icon'
import type { City } from './types'
import './FirstCityPopup.css'

// Ports lib/administration/city/first_city/first_city_widget.dart: shown as
// a bottom sheet from main_widget.dart's _handleCitySelection when the app
// has no selectedCity yet and a geolocation-based nearest-city lookup found
// one. "Да" accepts it and closes; "Выбрать другой" opens the full picker
// (SelectCityWidget in Dart — SelectCityPage here, same underlying list).
export function FirstCityPopup({
  city,
  onAccept,
  onClose,
}: {
  city: City
  onAccept: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const pickAnother = () => {
    onClose()
    navigate('/selectCityPage')
  }

  return (
    <div className="first-city-popup-backdrop" onClick={onClose}>
      <div className="first-city-popup" onClick={(e) => e.stopPropagation()}>
        <div className="first-city-popup__handle" />
        <div className="first-city-popup__body">
          <div className="first-city-popup__header">
            <h2 className="first-city-popup__title">{t('city_your_city_question', { city: city.name })}</h2>
            <button type="button" className="first-city-popup__close" onClick={onClose} aria-label={t('common_close')}>
              <Icon name="close" variant="round" />
            </button>
          </div>
          <div className="first-city-popup__actions">
            <button type="button" className="first-city-popup__button" onClick={pickAnother}>
              {t('city_select_another')}
            </button>
            <button type="button" className="first-city-popup__button" onClick={onAccept}>
              {t('settings_yes')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Ports main_widget.dart's _handleCitySelection geolocation + BLoC
// FindNearestCity flow: browser Geolocation API in place of Dart's location
// plugin, then the same find_nearest_city Postgres RPC via
// DynamicSupabaseService.instance.currentClient (cities_bloc.dart's
// _onFindNearestCity uses the same) — the per-company database once
// connected, not the plain bridge client.
export async function findNearestCity(): Promise<City | null> {
  const location = await getCurrentLocation()
  if (!location) return null

  const client = DynamicSupabaseService.instance.currentClient
  const { data, error } = await client.rpc('find_nearest_city', {
    user_lat: location.lat,
    user_lng: location.lng,
  })
  if (error || !data || !Array.isArray(data) || data.length === 0) {
    if (error) console.error('find_nearest_city RPC failed:', error)
    return null
  }
  const row = data[0]
  return {
    id: typeof row.id === 'number' ? row.id : 0,
    name: row.name ?? '',
    region: row.region ?? null,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
  }
}
