import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../features/auth/authStore'
import { OrderCard } from '../features/orders/components/OrderCard'
import { OrderDetailsSheet } from '../features/orders/components/OrderDetailsSheet'
import { OrdersDatePicker } from '../features/orders/components/OrdersDatePicker'
import { OrdersResultsCount } from '../features/orders/components/OrdersResultsCount'
import { OrdersSearchField } from '../features/orders/components/OrdersSearchField'
import { useOrdersStore } from '../features/orders/useOrdersStore'
import type { MainOrderWithShop } from '../features/orders/types'
import { formatDDMMYYYY } from '../lib/dateFormat'
import { FilterEmpty } from '../shared/FilterEmpty'
import { Icon } from '../shared/Icon'
import './OrdersPage.css'

// Ports lib/pages/orders/orders_widget.dart
export function OrdersPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const userInfo = useAuthStore((s) => s.userInfo)
  const userRoleId = userInfo?.userRoleId ?? 0
  const userId = userInfo?.id != null ? String(userInfo.id) : null

  const { status, orders, isSearchResult, errorMessage, loadOrders, search, clearSearch, changeDate } =
    useOrdersStore()

  const [selectedDate, setSelectedDate] = useState(new Date())
  const [query, setQuery] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<MainOrderWithShop | null>(null)

  useEffect(() => {
    loadOrders({ selectedDate, userRoleId, userId })
    // Initial load only; date/search changes are triggered by their own handlers below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const performSearch = (nextQuery: string) => {
    if (nextQuery.trim() === '') {
      clearSearch({ selectedDate, userRoleId, userId })
    } else {
      search({ searchQuery: nextQuery.trim(), selectedDate, userRoleId, userId })
    }
  }

  const handleQueryChange = (next: string) => {
    setQuery(next)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => performSearch(next), 300)
  }

  const handleClear = () => {
    setQuery('')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    clearSearch({ selectedDate, userRoleId, userId })
  }

  const handleDateChanged = (newDate: Date) => {
    setSelectedDate(newDate)
    changeDate({ newDate, userRoleId, userId, currentSearchQuery: query.trim() || undefined })
  }

  return (
    <div className="orders-page">
      <header className="orders-page__app-bar">
        <button
          type="button"
          className="orders-page__back"
          aria-label={t('common_back')}
          onClick={() => navigate(-1)}
        >
          {/* Icons.arrow_back_ios_new */}
          <Icon name="arrow_back_ios_new" />
        </button>
        <div className="orders-page__title-group">
          <h1 className="orders-page__title">{t('orders_all')}</h1>
          <span className="orders-page__subtitle">{formatDDMMYYYY(selectedDate)}</span>
        </div>
        <OrdersDatePicker selectedDate={selectedDate} onDateChanged={handleDateChanged} />
      </header>

      <div className="orders-page__search-row">
        <OrdersSearchField value={query} onChange={handleQueryChange} onClear={handleClear} />
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
              <OrderCard key={order.mainOrderId} order={order} onClick={() => setSelectedOrder(order)} />
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
