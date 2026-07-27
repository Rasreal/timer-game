import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import ru from './locales/ru.json'
import kk from './locales/kk.json'

// Boot with the language the user picked in Настройки → Язык. The selection
// is persisted by features/settings/useSettingsStore (zustand persist, key
// 'ff_settings_state') — read it straight from localStorage here to avoid an
// import cycle at i18n init time. Mirrors FFLocalizations.storeLocale /
// getStoredLocale in the Dart app (default 'ru').
function getStoredLanguage(): 'ru' | 'kk' | 'en' {
  try {
    const raw = localStorage.getItem('ff_settings_state')
    if (raw) {
      const lang: unknown = JSON.parse(raw)?.state?.language
      if (lang === 'ru' || lang === 'kk' || lang === 'en') return lang
    }
  } catch {
    // Corrupt/unavailable storage — fall back to the default locale.
  }
  return 'ru'
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ru: { translation: ru },
    kk: { translation: kk },
  },
  lng: getStoredLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export default i18n
