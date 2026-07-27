import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DynamicSupabaseService } from '../auth/dynamicSupabaseService'

export type ThemeMode = 'system' | 'light' | 'dark'
export type LanguageCode = 'ru' | 'kk' | 'en'

// Mirrors the settings-related fields of lib/app_state.dart (FFAppState):
// mainPageType1 (coverage toggle), themeMode, plus the stored locale
// (FFLocalizations.storeLocale in the Dart app). Persisted locally like the
// Dart app persists to secure storage.
//
// themeMode is the single source of truth for the app's theme selection
// ('light' | 'dark' | 'system') — the settings UI only persists it here;
// applying the actual dark-theme CSS is wired globally elsewhere.
interface SettingsState {
  coverageEnabled: boolean
  themeMode: ThemeMode
  language: LanguageCode
  setCoverageEnabled: (enabled: boolean) => void
  setThemeMode: (mode: ThemeMode) => void
  setLanguage: (language: LanguageCode) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      coverageEnabled: false,
      themeMode: 'system',
      language: 'ru',
      setCoverageEnabled: (enabled) => set({ coverageEnabled: enabled }),
      setThemeMode: (mode) => set({ themeMode: mode }),
      setLanguage: (language) => set({ language }),
    }),
    { name: 'ff_settings_state' },
  ),
)

// Ports lib/backend/settings_service.dart's setCoverageEnabled: fire-and-forget
// sync to the `settings` table on the current per-company DB (kept faithful to
// the Dart original, which also just logs on failure and never reverts the
// already-updated UI state).
export async function syncCoverageEnabled(enabled: boolean) {
  const supabase = DynamicSupabaseService.instance.currentClient
  try {
    const { data: rows, error: selectError } = await supabase.from('settings').select('id').limit(1)
    if (selectError) throw selectError

    if (rows && rows.length > 0) {
      const { error } = await supabase.from('settings').update({ coverage: enabled }).eq('id', rows[0].id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('settings').insert({ coverage: enabled })
      if (error) throw error
    }
  } catch (e) {
    console.error('Failed to sync coverage to Supabase:', e)
  }
}

// Ports lib/backend/settings_service.dart's isCoverageEnabled (read on main
// page init in main_widget.dart's _initializeAppState -> mainPageType1): pull
// the coverage flag from the current per-company settings table so the app
// reflects what the admin configured, not just the last local toggle.
export async function loadCoverageEnabled(): Promise<void> {
  const supabase = DynamicSupabaseService.instance.currentClient
  try {
    const { data, error } = await supabase.from('settings').select('coverage').limit(1)
    if (error) throw error
    if (data && data.length > 0 && typeof data[0].coverage === 'boolean') {
      useSettingsStore.getState().setCoverageEnabled(data[0].coverage)
    }
  } catch (e) {
    console.error('Failed to load coverage setting:', e)
  }
}
