import { useTranslation } from 'react-i18next'
import './FilterEmpty.css'

// Ports lib/components/filter_empty/filter_empty_widget.dart — the shared
// empty-state used across orders/favourites/shop_orders/products, which this
// pilot had been rendering as plain text everywhere instead of the real
// cloud-icon + message component. The Dart default message is the hardcoded
// 'Нет данных'; localized here via common_no_data.
export function FilterEmpty({ message }: { message?: string }) {
  const { t } = useTranslation()
  return (
    <div className="filter-empty">
      <img className="filter-empty__icon" src="/images/icons8-cloudy-100.png" alt="" width={96} height={96} />
      <p className="filter-empty__message">{message ?? t('common_no_data')}</p>
    </div>
  )
}
