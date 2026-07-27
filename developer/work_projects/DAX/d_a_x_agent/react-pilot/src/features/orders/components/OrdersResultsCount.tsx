import { useTranslation } from 'react-i18next'
import './OrdersResultsCount.css'

export function OrdersResultsCount({ count, isVisible }: { count: number; isVisible: boolean }) {
  const { t } = useTranslation()
  if (!isVisible) return null
  return (
    <div className="orders-results-count">
      <span>
        {t('products_found')} [ {count} ]
      </span>
    </div>
  )
}
