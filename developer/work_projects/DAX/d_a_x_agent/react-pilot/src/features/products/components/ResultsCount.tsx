import { useTranslation } from 'react-i18next'
import './ResultsCount.css'

// Ports lib/pages/products/components/results_count_widget.dart (the "Найдено [ N ]"
// row; localized here via the Flutter table's products_found key).
export function ResultsCount({ count, isVisible }: { count: number; isVisible: boolean }) {
  const { t } = useTranslation()
  if (!isVisible) return null

  return (
    <div className="products-results-count">
      <span>
        {t('products_found')} [ {count} ]
      </span>
    </div>
  )
}
