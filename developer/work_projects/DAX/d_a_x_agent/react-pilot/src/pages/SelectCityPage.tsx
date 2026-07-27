import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useCitiesQuery } from '../features/city/useCitiesQuery'
import { useCityStore } from '../features/city/useCityStore'
import { FFIcon } from '../shared/FFIcon'
import { Icon } from '../shared/Icon'
import './SelectCityPage.css'

// Ports lib/administration/city/select_city_page/select_city_page_widget.dart:
// cities grouped under a bold A-Я section header per first Cyrillic letter
// (Dart buckets by the `first_letter` DB column; falls back to deriving it
// from name.charAt(0) if a row's column is empty). Within a letter, all
// cities render as ONE continuous list — a single rounded card with thin
// dividers between rows, matching select_city_page_widget.dart's per-letter
// Container (not individually-rounded per-city cards).
export function SelectCityPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const setSelectedCity = useCityStore((s) => s.selectedCity)
  const setCity = useCityStore((s) => s.setSelectedCity)
  const { cities, status } = useCitiesQuery()
  const [query, setQuery] = useState('')

  const results = query.trim()
    ? cities.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()))
    : cities

  const groups = useMemo(() => {
    const byLetter = new Map<string, typeof results>()
    for (const city of results) {
      const letter = (city.first_letter || city.name.charAt(0)).toUpperCase()
      const bucket = byLetter.get(letter)
      if (bucket) {
        bucket.push(city)
      } else {
        byLetter.set(letter, [city])
      }
    }
    const searching = query.trim().length > 0
    return Array.from(byLetter.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'ru'))
      .map(([letter, cities]) => ({
        letter,
        // select_city_page_widget.dart: the default (non-search) branch sorts
        // each letter group with sortedList(keyOf: name, desc: true) —
        // DESCENDING by name (see cities2.png: Красный Яр → Кокшетау →
        // Кишкенеколь). The search branch keeps match order unsorted.
        cities: searching
          ? cities
          : [...cities].sort((a, b) => b.name.localeCompare(a.name, 'ru')),
      }))
  }, [results, query])

  const handleSelect = (cityId: number) => {
    const city = cities.find((c) => c.id === cityId)
    if (!city) return
    setCity(city)
    navigate('/main')
  }

  return (
    <div className="select-city-page">
      <header className="select-city-page__app-bar">
        <button
          type="button"
          className="select-city-page__back"
          aria-label={t('common_back')}
          onClick={() => navigate('/main')}
        >
          {/* Icons.arrow_back_ios_new, color #FF6300 */}
          <Icon name="arrow_back_ios_new" color="#FF6300" />
        </button>
        <h1 className="select-city-page__title">{t('city_select')}</h1>
        <div style={{ width: 54 }} />
      </header>

      <div className="select-city-page__search-row">
        <div className="select-city-page__search">
          {/* FFIcons.kicons8Search */}
          <FFIcon name="icons8Search" size={24} color="#C9C9C9" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('common_search')} />
          {query.length > 0 && (
            <button type="button" aria-label={t('common_clear')} onClick={() => setQuery('')}>
              {/* Icons.clear, color #FF6633 (not the theme's #FF6300 primary) */}
              <Icon name="clear" color="#FF6633" />
            </button>
          )}
        </div>
      </div>

      <main className="select-city-page__body">
        {status === 'loading' ? (
          <div className="select-city-page__center">
            <div className="select-city-page__spinner" aria-label={t('common_loading')} />
          </div>
        ) : results.length === 0 ? (
          <p className="select-city-page__empty">{t('city_not_found')}</p>
        ) : (
          groups.map((group) => (
            <section key={group.letter} className="select-city-page__group">
              <h2
                className={`select-city-page__group-letter ${
                  query.trim() ? 'select-city-page__group-letter--search' : ''
                }`}
              >
                {group.letter}
              </h2>
              <div className="select-city-page__list">
                {group.cities.map((city, index) => (
                  <div key={city.id}>
                    <button
                      type="button"
                      className={`select-city-page__item ${
                        setSelectedCity?.id === city.id ? 'select-city-page__item--selected' : ''
                      }`}
                      onClick={() => handleSelect(city.id)}
                    >
                      <span>{city.name}</span>
                      {setSelectedCity?.id === city.id && <Icon name="check" color="var(--color-primary)" />}
                    </button>
                    {index < group.cities.length - 1 && <div className="select-city-page__divider" />}
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  )
}
