import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Shop } from '../../favourites/types'
import { FFIcon } from '../../../shared/FFIcon'
import { Icon } from '../../../shared/Icon'
import { useMainDashboardStore } from '../useMainDashboardStore'
import { DEMO_USER_PHONE, useAuthStore } from '../../auth/authStore'
import { loadCoverageEnabled, useSettingsStore } from '../../settings/useSettingsStore'
import { weekdayField } from '../../map/api'
import { useCityStore } from '../../city/useCityStore'
import { FirstCityPopup, findNearestCity } from '../../city/FirstCityPopup'
import type { City } from '../../city/types'
import { getCurrentLocation } from '../../../lib/geolocation'
import { FilterEmpty } from '../../../shared/FilterEmpty'
import { CalendarFilter } from './CalendarFilter'
import { MainAppBar } from './MainAppBar'
import { ShopActionSheet } from './ShopActionSheet'
import { ShopCard } from './ShopCard'
import './MainDashboard.css'

// Ports the shop-list dashboard subset of lib/pages/main/main_widget.dart +
// lib/pages/main/components/{main_app_bar,calendar_filter,main_body}.dart.
// Coverage mode IS ported for real users: the coverage flag is read from the
// company settings table (settings_service.dart), and the calendar's selected
// day drives loadCoverage — shops whose day-of-week assignment array contains
// this agent's per-company user id (get_near_by_shops_smart.dart, via the
// nearby_shops_for_user RPC with a .contains fallback). First-launch city
// detection/confirmation is ported too (_handleCitySelection: browser
// Geolocation + find_nearest_city RPC). Not ported: PWA install prompt and
// MainPageType2's infinite-scroll pagination (native-only / server-side
// pieces this pilot doesn't reach).
export function MainDashboard() {
  const { t } = useTranslation()
  const { shops, searchShops, searchActive, loadShops, loadCoverage, search, clearSearch } =
    useMainDashboardStore()
  const userId = useAuthStore((s) => s.userId)
  const coverageEnabled = useSettingsStore((s) => s.coverageEnabled)
  const selectedCity = useCityStore((s) => s.selectedCity)
  const setSelectedCity = useCityStore((s) => s.setSelectedCity)
  const [query, setQuery] = useState('')
  const [activeShop, setActiveShop] = useState<Shop | null>(null)
  const [calendarOpen, setCalendarOpen] = useState(false)
  // main_model.dart's calendarSelectedDay: the day the coverage calendar has
  // selected, defaulting to today (FFAppState().selectedDate on init).
  const [selectedDay, setSelectedDay] = useState(() => new Date())
  const [nearestCity, setNearestCity] = useState<City | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // _initializeAppState in main_widget.dart: read the coverage flag from
    // the company settings table on main-page init (mainPageType1).
    if (userId && userId !== DEMO_USER_PHONE) loadCoverageEnabled()
  }, [userId])

  useEffect(() => {
    const cityCenter =
      selectedCity?.latitude != null && selectedCity?.longitude != null
        ? { lat: selectedCity.latitude, lng: selectedCity.longitude }
        : null

    if (coverageEnabled) {
      // Coverage mode (MainPageType1): only shops assigned to this agent for
      // the calendar-selected weekday — _onCalendarDateChanged fires
      // LoadNearbyShops(day: functions.date(selectedDay), enableCoverage) in
      // main_widget.dart, backed by get_near_by_shops_smart.dart.
      loadCoverage(userId, weekdayField(selectedDay), cityCenter)
    } else {
      // Non-coverage (MainPageType2): search_shops_paginated RPC, which
      // computes shops.distance_meters from (lat, lon) — resolveLatLng in
      // main/api.ts prefers live browser geolocation over the city center,
      // same fallback order as functions.extractLatLong in Dart.
      let cancelled = false
      getCurrentLocation().then((userLocation) => {
        if (!cancelled) loadShops(userId, selectedCity?.name, userLocation, cityCenter)
      })
      return () => {
        cancelled = true
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, selectedCity?.name, coverageEnabled, selectedDay])

  useEffect(() => {
    if (selectedCity) return
    let cancelled = false
    findNearestCity().then((found) => {
      if (cancelled || !found) return
      // cities_bloc.dart's _onFindNearestCity commits FFAppState().selectedCity
      // as soon as the RPC resolves, before the popup even shows — the popup
      // is purely a confirmation surface at that point, not a gate on
      // whether the city gets set. Mirrored here: set immediately, then show
      // the popup so the user can still say "Выбрать другой" if it's wrong.
      setSelectedCity(found)
      setNearestCity(found)
    })
    return () => {
      cancelled = true
    }
    // Only re-run if the user ends up with no city again (e.g. cleared it);
    // deliberately excludes selectedCity from a would-be dependency array
    // beyond this guard so it doesn't re-geolocate on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCity])

  const handleQueryChange = (next: string) => {
    setQuery(next)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(next, userId, selectedCity?.name), 300)
  }

  const handleClear = () => {
    setQuery('')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    clearSearch()
  }

  const visibleShops = searchActive ? searchShops : shops

  return (
    <div className="main-dashboard">
      <MainAppBar
        showFilter={coverageEnabled}
        calendarOpen={calendarOpen}
        onToggleCalendar={() => setCalendarOpen((open) => !open)}
      />

      {coverageEnabled && calendarOpen && <CalendarFilter onDateChange={setSelectedDay} />}

      <div className="main-dashboard__search-row">
        <div className="main-dashboard__search">
          {/* FFIcons.kicons8Search */}
          <FFIcon name="icons8Search" size={24} color="#C9C9C9" />
          <input
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder={t('common_search')}
          />
          {query.length > 0 && (
            <button type="button" aria-label={t('common_clear')} onClick={handleClear}>
              <Icon name="clear" variant="round" />
            </button>
          )}
        </div>
        {/* main_page_type*.dart: count row shows whenever the field has text,
            and always counts model.searchShops (not the visible list). */}
        {query.length > 0 && (
          <span className="main-dashboard__results-count">
            {t('products_found')} [ {searchShops.length} ]
          </span>
        )}
      </div>

      <main className="main-dashboard__body">
        {visibleShops.length === 0 ? (
          <FilterEmpty />
        ) : (
          <div className="main-dashboard__list">
            {visibleShops.map((shop) => (
              <ShopCard key={shop.id} shop={shop} onClick={() => setActiveShop(shop)} />
            ))}
          </div>
        )}
      </main>

      {activeShop && <ShopActionSheet shop={activeShop} onClose={() => setActiveShop(null)} />}

      {nearestCity && (
        <FirstCityPopup city={nearestCity} onAccept={() => setNearestCity(null)} onClose={() => setNearestCity(null)} />
      )}
    </div>
  )
}
