import { useTranslation } from 'react-i18next'
import { FFIcon } from '../../../shared/FFIcon'
import { Icon } from '../../../shared/Icon'
import './ProductsSearchBar.css'

// Ports lib/pages/products/components/products_search_bar.dart. The 200ms
// EasyDebounce.debounce in the Dart source is handled by the caller (ProductsPage),
// matching the 300ms debounce convention used by OrdersSearchField.
export function ProductsSearchBar({
  value,
  onChange,
  onClear,
}: {
  value: string
  onChange: (value: string) => void
  onClear: () => void
}) {
  const { t } = useTranslation()

  return (
    <div className="products-search-bar">
      {/* FFIcons.kicons8Search custom glyph */}
      <FFIcon name="icons8Search" size={24} color="#C9C9C9" className="products-search-bar__icon" />
      <input
        className="products-search-bar__input"
        value={value}
        placeholder={t('common_search')}
        onChange={(e) => onChange(e.target.value)}
      />
      {value.length > 0 && (
        <button
          type="button"
          className="products-search-bar__clear"
          aria-label={t('common_clear')}
          onClick={onClear}
        >
          {/* Icons.clear, color #FF6633, size 22 in the Dart source */}
          <Icon name="clear" color="#FF6633" size={22} />
        </button>
      )}
    </div>
  )
}
