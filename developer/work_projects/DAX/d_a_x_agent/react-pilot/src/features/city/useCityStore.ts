import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { City } from './types'

// Mirrors the selectedCity subset of lib/app_state.dart (FFAppState),
// persisted to secure storage under 'ff_selectedCity' in the Dart app.
// Starts unset (id 0 in Dart / null here) so main_widget.dart's
// _handleCitySelection first-launch flow (FirstCityPopup) actually has
// something to trigger on — a previous version of this store always
// defaulted to a demo city, which made that condition permanently false.
interface CityState {
  selectedCity: City | null
  setSelectedCity: (city: City) => void
}

export const useCityStore = create<CityState>()(
  persist(
    (set) => ({
      selectedCity: null,
      setSelectedCity: (city) => set({ selectedCity: city }),
    }),
    { name: 'ff_selected_city' },
  ),
)
