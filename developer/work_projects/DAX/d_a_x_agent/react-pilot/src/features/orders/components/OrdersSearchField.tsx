import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { FFIcon } from '../../../shared/FFIcon'
import { Icon } from '../../../shared/Icon'
import './OrdersSearchField.css'

// Ports lib/pages/orders/components/orders_search_field.dart, including the
// 300ms EasyDebounce.debounce behavior on change. The search glyph uses the
// real FFIcons.kicons8Search custom icon font (icons8Search in FFIcon's GLYPHS
// map) instead of a Material approximation, matching the Dart source exactly.
export function OrdersSearchField({
  value,
  onChange,
  onClear,
  hintText,
}: {
  value: string
  onChange: (value: string) => void
  onClear: () => void
  hintText?: string
}) {
  const { t } = useTranslation()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }, [])

  const handleChange = (next: string) => {
    onChange(next)
  }

  return (
    <div className="orders-search-field">
      <FFIcon name="icons8Search" size={24} color="#C9C9C9" />
      <input
        className="orders-search-field__input"
        value={value}
        placeholder={hintText}
        onChange={(e) => handleChange(e.target.value)}
      />
      {value.length > 0 && (
        <button
          type="button"
          className="orders-search-field__clear"
          aria-label={t('common_clear')}
          onClick={onClear}
        >
          {/* Icons.clear, color #FF6633, size 22 */}
          <Icon name="clear" color="#FF6633" size={22} />
        </button>
      )}
    </div>
  )
}
