import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatDDMMYYYYDots, formatHMS } from '../../../lib/dateFormat'
import { formatNumberWithSpace } from '../formatNumber'
import { fetchOrderItems, type OrderLineItem } from '../api'
import { DEMO_USER_PHONE, useAuthStore } from '../../auth/authStore'
import type { MainOrderWithShop } from '../types'
import { Icon } from '../../../shared/Icon'
import './OrderDetailsSheet.css'

// Ports lib/administration/main/order_details/order_details_widget.dart:
// a bottom sheet (drag handle + title + close button) showing the full
// order breakdown reached by tapping an OrderCard. Three stacked white
// cards under gray section labels — "Информация о заказе" (number/status,
// date/time, trading point/address, total), "Состав заказа" (line items),
// "Комментарий" (free-text comment) — then a full-width orange close button.
//
// Line items: ports OrderDetailsWidget's FutureBuilder over the per-company
// `orders` table (one row per line item, matched by order_number) — see
// fetchOrderItems in ../api.ts. Demo users have no per-company DB, so they
// (and any fetch failure) fall back to a single synthesized line item that
// reconciles with the order's total (qty 1 @ orderTotalPrice).
export function OrderDetailsSheet({
  order,
  onClose,
}: {
  order: MainOrderWithShop
  onClose: () => void
}) {
  const { t } = useTranslation()
  const userId = useAuthStore((s) => s.userId)
  const createdAt = new Date(order.mainOrderCreatedAt)
  const isAccepted = order.orderStatus === '1'
  const isProcessing = order.orderStatus === '0'
  const totalFormatted = `${formatNumberWithSpace(order.orderTotalPrice ?? 0)} ₸`
  const hasComment = !!order.orderComment && order.orderComment.trim() !== ''

  // null = still loading (Dart's !snapshot.hasData -> SpinKitPulse).
  const [items, setItems] = useState<OrderLineItem[] | null>(null)
  useEffect(() => {
    const fallback: OrderLineItem[] = [
      {
        productName: t('order_item_placeholder'),
        quantity: 1,
        price: order.orderTotalPrice ?? 0,
        totalPrice: order.orderTotalPrice ?? 0,
      },
    ]
    if (userId === DEMO_USER_PHONE || order.mainOrderNumber == null) {
      setItems(fallback)
      return
    }
    let cancelled = false
    fetchOrderItems(order.mainOrderNumber)
      .then((rows) => {
        if (!cancelled) setItems(rows.length > 0 ? rows : fallback)
      })
      .catch(() => {
        if (!cancelled) setItems(fallback)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.mainOrderNumber])

  return (
    <div className="order-details-backdrop" onClick={onClose}>
      <div className="order-details-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="order-details-sheet__handle" />

        <div className="order-details-sheet__header">
          <div className="order-details-sheet__header-text">
            <h1 className="order-details-sheet__title">{t('order_details_title')}</h1>
            <p className="order-details-sheet__helper">
              {t('order_details_synced_1c')} <span className="order-details-sheet__asterisk">*</span>
            </p>
          </div>
          <button
            type="button"
            className="order-details-sheet__close"
            onClick={onClose}
            aria-label={t('common_close')}
          >
            <Icon name="close" variant="round" size={24} />
          </button>
        </div>

        <div className="order-details-sheet__body">
          <p className="order-details-sheet__section-label">{t('order_details_info_section')}</p>
          <div className="order-details-sheet__card">
            <div className="order-details-sheet__row order-details-sheet__row--head">
              <span className="order-details-sheet__number">№ {order.mainOrderNumber}</span>
              {isAccepted && (
                <span className="order-details-sheet__badge order-details-sheet__badge--accepted">
                  {t('order_status_received')}
                </span>
              )}
              {isProcessing && (
                <span className="order-details-sheet__badge order-details-sheet__badge--processing">
                  {t('order_status_processing')}
                </span>
              )}
            </div>

            <div className="order-details-sheet__pair">
              <div className="order-details-sheet__row">
                <span className="order-details-sheet__label">{t('date')}</span>
                <span className="order-details-sheet__value">{formatDDMMYYYYDots(createdAt)}</span>
              </div>
              <div className="order-details-sheet__row">
                <span className="order-details-sheet__label">{t('time')}</span>
                <span className="order-details-sheet__value">{formatHMS(createdAt)}</span>
              </div>
            </div>

            <div className="order-details-sheet__divider" />

            <div className="order-details-sheet__pair">
              <div className="order-details-sheet__row">
                <span className="order-details-sheet__label">{t('trading_point')}</span>
                <span className="order-details-sheet__value">{order.shopName ?? 'null'}</span>
              </div>
              <div className="order-details-sheet__row">
                <span className="order-details-sheet__label">{t('address')}</span>
                <span className="order-details-sheet__value">
                  {t('shop_street_abbr')} {order.streetShop}, {order.houseShop}
                </span>
              </div>
            </div>

            <div className="order-details-sheet__divider" />

            <div className="order-details-sheet__row">
              <span className="order-details-sheet__label">{t('sum')}</span>
              <span className="order-details-sheet__value order-details-sheet__value--strong">
                {totalFormatted}
              </span>
            </div>
          </div>

          <p className="order-details-sheet__section-label">{t('order_content')}</p>
          <div className="order-details-sheet__card order-details-sheet__card--items">
            {items === null ? (
              // Dart: Center(SpinKitPulse(color: 0xFFFF6300, size: 30))
              <div className="order-details-sheet__items-loading">
                <div className="order-details-sheet__items-spinner" aria-label={t('common_loading')} />
              </div>
            ) : (
              items.map((item, i) => (
                <div className="order-details-sheet__line-item" key={i}>
                  <div className="order-details-sheet__line-item-info">
                    <span className="order-details-sheet__line-item-name">
                      {/* valueOrDefault(orderProductName, 'null') */}
                      {item.productName ?? 'null'}
                    </span>
                    <span className="order-details-sheet__line-item-qty">
                      {/* Dart: '${qty} x ${price} ₸ ' */}
                      {formatNumberWithSpace(item.quantity)} x {formatNumberWithSpace(item.price)} ₸
                    </span>
                  </div>
                  <span className="order-details-sheet__line-item-price">
                    {formatNumberWithSpace(item.totalPrice)} ₸
                  </span>
                </div>
              ))
            )}
          </div>

          {hasComment && (
            <>
              <p className="order-details-sheet__section-label">{t('order_comment')}</p>
              <div className="order-details-sheet__card order-details-sheet__card--comment">
                {order.orderComment}
              </div>
            </>
          )}
        </div>

        <div className="order-details-sheet__footer">
          <button type="button" className="order-details-sheet__close-button" onClick={onClose}>
            {t('common_close')}
          </button>
        </div>
      </div>
    </div>
  )
}
