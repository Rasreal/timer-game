import { useTranslation } from 'react-i18next'
import { formatDDMMYYYYDots, formatHMS } from '../../../lib/dateFormat'
import { formatNumberWithSpace } from '../formatNumber'
import type { MainOrderWithShop } from '../types'
import './OrderCard.css'

// Ports lib/administration/main/current_main_order_with_shop/current_main_order_with_shop_widget.dart.
// With showShopName={false} it instead ports lib/pages/shop_orders/components/order_card.dart,
// which differs in two ways: no "Торговая точка" row (redundant inside a single
// shop's orders list) and no 2px .divide() gaps between the info rows.
export function OrderCard({
  order,
  onClick,
  showShopName = true,
}: {
  order: MainOrderWithShop
  onClick: () => void
  showShopName?: boolean
}) {
  const { t } = useTranslation()
  const createdAt = new Date(order.mainOrderCreatedAt)
  const isAccepted = order.orderStatus === '1'
  const isProcessing = order.orderStatus === '0'

  return (
    <div
      className={`order-card ${showShopName ? '' : 'order-card--shop'}`}
      role="button"
      tabIndex={0}
      onClick={onClick}
    >
      <div className="order-card__header">
        <span className="order-card__number">№ {order.mainOrderNumber}</span>
        {isAccepted && (
          <span className="order-card__badge order-card__badge--accepted">
            {t('order_status_received')}
          </span>
        )}
        {isProcessing && (
          <span className="order-card__badge order-card__badge--processing">
            {t('order_status_processing')}
          </span>
        )}
      </div>
      <div className="order-card__row">
        <span className="order-card__label">{t('sum')}</span>
        <span className="order-card__value order-card__value--strong">
          {formatNumberWithSpace(order.orderTotalPrice ?? 0)} ₸
        </span>
      </div>
      {showShopName && (
        <div className="order-card__row">
          <span className="order-card__label">{t('trading_point')}</span>
          <span className="order-card__value">{order.shopName ?? 'null'}</span>
        </div>
      )}
      <div className="order-card__row">
        <span className="order-card__label">{t('date')}</span>
        <span className="order-card__value order-card__value--muted">{formatDDMMYYYYDots(createdAt)}</span>
      </div>
      <div className="order-card__row">
        <span className="order-card__label">{t('time')}</span>
        {/* dateTimeFormat("jms") in current_main_order_with_shop_widget.dart — HH:mm:ss */}
        <span className="order-card__value order-card__value--muted">{formatHMS(createdAt)}</span>
      </div>
    </div>
  )
}
