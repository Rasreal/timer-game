import { useEffect } from 'react'
import { useSettingsStore } from '../features/settings/useSettingsStore'

// Mirrors the Flutter app's theme wiring: FFAppState.themeMode ('system' when
// nothing persisted — FlutterFlowTheme.saveThemeMode removes the pref for
// system) feeds MaterialApp.themeMode, and ThemeMode.system defers to the OS
// brightness. Here the resolved theme is stamped on <html data-theme="...">,
// which drives the :root[data-theme='dark'] palette in theme.css and the
// color-scheme rules in index.css. index.html sets the attribute pre-hydration
// from the persisted ff_settings_state to avoid a light flash.

function applyResolvedTheme(dark: boolean) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
}

export function useThemeMode() {
  const themeMode = useSettingsStore((s) => s.themeMode)

  useEffect(() => {
    if (themeMode === 'system') {
      // Follow the OS live while in system mode, like ThemeMode.system.
      const media = window.matchMedia('(prefers-color-scheme: dark)')
      applyResolvedTheme(media.matches)
      const onChange = (e: MediaQueryListEvent) => applyResolvedTheme(e.matches)
      media.addEventListener('change', onChange)
      return () => media.removeEventListener('change', onChange)
    }
    applyResolvedTheme(themeMode === 'dark')
  }, [themeMode])
}
