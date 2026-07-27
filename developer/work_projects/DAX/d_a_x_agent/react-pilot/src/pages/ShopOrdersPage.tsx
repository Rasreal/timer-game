import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useSearchParams } from 'react-router-dom'
import { useAppBack } from '../shared/useAppBack'
import { OrderCard } from '../features/orders/components/OrderCard'
import { OrderDetailsSheet } from '../features/orders/components/OrderDetailsSheet'
import { OrdersResultsCount } from '../features/orders/components/OrdersResultsCount'
import { OrdersSearchField } from '../features/orders/components/OrdersSearchField'
import { useShopOrdersStore } from '../features/shopOrders/useShopOrdersStore'
import type { MainOrderWithShop } from '../features/orders/types'
import { FilterEmpty } from '../shared/FilterEmpty'
import { Icon } from '../shared/Icon'
import './OrdersPage.css'

// Ports lib/pages/shop_orders/shop_orders_widget.dart. Shares the orders-feature's
// OrderCard/OrdersSearchField/OrdersResultsCount since the Dart originals are
// near-identical widgets duplicated across the two pages.
export function ShopOrdersPage() {
  const { t } = useTranslation()
  const goBack = useAppBack()
  const { shopId: shopIdParam } = useParams()
  const [searchParams] = useSearchParams()
  const shopId = Number(shopIdParam)
  const shopName = searchParams.get('shopName') ?? t('shop_unknown')

  const { status, orders, isSearchResult, errorMessage, loadShopOrders, search, clearSearch } =
    useShopOrdersStore()

  const [query, setQuery] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<MainOrderWithShop | null>(null)

  useEffect(() => {
    loadShopOrders(shopId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId])

  const handleQueryChange = (next: string) => {
    setQuery(next)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(shopId, next.trim()), 300)
  }

  const handleClear = () => {
    setQuery('')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    clearSearch(shopId)
  }

  return (
    <div className="orders-page">
      <header className="orders-page__app-bar">
        <button
          type="button"
          className="orders-page__back"
          aria-label={t('common_back')}
          onClick={goBack}
        >
          {/* Icons.arrow_back_ios_new */}
          <Icon name="arrow_back_ios_new" />
        </button>
        <div className="orders-page__title-group">
          <h1 className="orders-page__title">{t('order_orders')}</h1>
          <span className="orders-page__subtitle">{shopName}</span>
        </div>
        <div style={{ width: 54 }} />
      </header>

      <div className="orders-page__search-row">
        <OrdersSearchField
          value={query}
          onChange={handleQueryChange}
          onClear={handleClear}
          hintText={t('common_search')}
        />
        <OrdersResultsCount count={orders.length} isVisible={status === 'loaded' && isSearchResult} />
      </div>

      <main className="orders-page__body">
        {status === 'loading' && (
          <div className="orders-page__center">
            <div className="orders-page__spinner" aria-label={t('common_loading')} />
          </div>
        )}

        {status === 'empty' && <FilterEmpty />}

        {status === 'error' && (
          <div className="orders-page__center">
            <p className="orders-page__error-text">{errorMessage}</p>
          </div>
        )}

        {status === 'loaded' && (
          <div className="orders-page__list">
            {orders.map((order) => (
              <OrderCard
                key={order.mainOrderId}
                order={order}
                onClick={() => setSelectedOrder(order)}
                showShopName={false}
              />
            ))}
          </div>
        )}
      </main>

      {selectedOrder && (
        <OrderDetailsSheet order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
    </div>
  )
}
