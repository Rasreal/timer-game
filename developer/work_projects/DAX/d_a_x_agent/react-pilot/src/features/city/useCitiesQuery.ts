import { useEffect, useState } from 'react'
import { DynamicSupabaseService } from '../auth/dynamicSupabaseService'
import type { City } from './types'

// Ports lib/backend/supabase/database/tables/cities.dart's CitiesTable,
// queried the same way lib/bloc/cities/cities_bloc.dart's LoadCities does
// (CitiesTable().queryRows(queryFn: (q) => q.order('name'))) — used by both
// SelectCityPage (select_city_page_widget.dart queries unordered, but the
// UI re-sorts client-side anyway) and the first-launch FirstCityPopup.
// table.dart's SupabaseTable._select() resolves via
// DynamicSupabaseService.instance.currentClient ?? SupaFlow.client — i.e.
// the per-company database once connected (see LoginCodeEnterPage's
// switchToCompanyDatabase call), falling back to the bridge DB only before
// that happens. `cities` lives on the company DB, same as shops/orders
// elsewhere in this app (features/main/api.ts, features/orders/api.ts) —
// querying the plain bridge client here was the original bug.
export function useCitiesQuery() {
  const [cities, setCities] = useState<City[]>([])
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading')

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    const client = DynamicSupabaseService.instance.currentClient
    client
      .from('cities')
      .select('id, name, region, latitude, longitude, first_letter')
      .order('name')
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error('Failed to load cities:', error)
          setCities([])
          setStatus('error')
          return
        }
        setCities(data ?? [])
        setStatus('loaded')
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { cities, status }
}
