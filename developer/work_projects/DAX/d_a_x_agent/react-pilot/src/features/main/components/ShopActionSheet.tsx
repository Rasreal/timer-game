import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '../../favourites/useAppState'
import { getDummyOrdersForShop } from '../../orders/demoData'
import { useCartState } from '../../products/useCartState'
import { formatNumberWithSpace } from '../../orders/formatNumber'
import type { Shop } from '../../favourites/types'
import { Icon } from '../../../shared/Icon'
import { FFIcon } from '../../../shared/FFIcon'
import './ShopActionSheet.css'

// Ports lib/administration/main/shop_botton_sheet/shop_botton_sheet_widget.dart
// (header subset from shop_item_botton_sheet_widget.dart). Three card groups,
// matching the Dart source's border-radius grouping exactly:
//   1. "Создать заказ" alone
//   2. Избранное / Корзина / Заказы / Отчет за период (disabled, grayed out)
//   3. Задолженность / Найти на карте / Позвонить
// Report period is a disabled row in the Dart source too (shows a "not
// available in your subscription" message on tap, never actually
// implemented), replicated as-is. Debt (report_debt) reads shop.companyDept —
// the real value comes from a per-company companies_with_shop query
// unreachable from this pilot's shared client, so demoData.ts stubs a
// nonzero placeholder (76755) to keep the red-amount UI path visible; the
// row is hidden entirely when companyDept is falsy/0, matching the Dart
// source's `if (companyDept != null)` guard.
export function ShopActionSheet({
  shop,
  onClose,
  // main_widget.dart opens this sheet at screen * 0.93 (Constants.
  // modalHeightRatio); map_widget.dart's bottomSheetAction uses 0.9.
  heightRatio = 0.93,
}: {
  shop: Shop
  onClose: () => void
  heightRatio?: number
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const favourites = useAppState((s) => s.favourites)
  const cartCount = useCartState((s) => s.countForShop(shop.id))

  const favouritesCount = favourites.filter((f) => f.shopId === shop.id).length
  const ordersCount = getDummyOrdersForShop(shop.id).length
  const hasPriceTypes = (shop.priceTypesCode?.length ?? 0) > 0
  // shop_item_botton_sheet_widget.dart: valueOrDefault(shopTable?.categoryName, 'С')
  // — the CATEGORY letter (Н/С/В), NOT the shop name's first letter (see
  // screenshots/new2/incorrect_shop_btton_sheet.png for the wrong variant).
  const initial = shop.categoryName?.trim() || 'С'

  const goTo = (path: string, state?: unknown) => {
    onClose()
    navigate(path, state === undefined ? undefined : { state })
  }

  return (
    <div className="shop-action-sheet-backdrop" onClick={onClose}>
      <div
        className="shop-action-sheet"
        style={{ height: `${heightRatio * 100}dvh` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* shop_botton_sheet_widget.dart: the 106px white header Container holds
            BOTH the drag handle row and the shop name/address/avatar row. */}
        <div className="shop-action-sheet__header-card">
          <div className="shop-action-sheet__handle" />
          <div className="shop-action-sheet__header">
            <div className="shop-action-sheet__header-text">
              <span className="shop-action-sheet__name">{shop.nameShop}</span>
              <span className="shop-action-sheet__address">
                {t('shop_street_abbr')} {shop.streetShop ?? '-'} {shop.houseShop ?? '-'}
              </span>
            </div>
            <div className="shop-action-sheet__avatar">{initial}</div>
          </div>
        </div>

        {/* Card 1: Создать заказ */}
        <div className="shop-action-sheet__card">
          <button
            type="button"
            className="shop-action-sheet__row"
            onClick={() => {
              if (hasPriceTypes) {
                goTo(`/products/${shop.id}?shopName=${encodeURIComponent(shop.nameShop)}`)
              } else {
                window.alert(t('product_prices_not_set'))
              }
            }}
          >
            <span>{t('shop_create_order')}</span>
            {/* Icons.add_circle_outline_sharp, color #FF6300 */}
            <Icon name="add_circle_outline" variant="sharp" color="#FF6300" />
          </button>
        </div>

        {/* Card 2: Избранное / Корзина / Заказы / Отчет за период */}
        <div className="shop-action-sheet__card">
          {/* favourites_widget.dart requires rowShop as a route param — pass the
              shop via router state (+ shopId for refresh-resilience). */}
          <button
            type="button"
            className="shop-action-sheet__row"
            onClick={() => goTo(`/favourites?shopId=${shop.id}`, { shop })}
          >
            <span>{t('favourites_title')}</span>
            <span className="shop-action-sheet__row-right">
              {favouritesCount > 0 && <span className="shop-action-sheet__badge">{favouritesCount}</span>}
              {/* Icons.favorite_border */}
              <Icon name="favorite_border" filled />
            </span>
          </button>

          <button
            type="button"
            className="shop-action-sheet__row"
            onClick={() => goTo(`/cart?shopId=${shop.id}&pageType=cart`)}
          >
            <span>{t('cart_title')}</span>
            <span className="shop-action-sheet__row-right">
              {cartCount > 0 && <span className="shop-action-sheet__badge">{cartCount}</span>}
              {/* FFIcons.kshoppingCart */}
              <FFIcon name="shoppingCart" />
            </span>
          </button>

          <button
            type="button"
            className="shop-action-sheet__row"
            onClick={() =>
              goTo(`/shopOrders/${shop.id}?shopName=${encodeURIComponent(shop.nameShop)}`)
            }
          >
            <span>{t('order_orders')}</span>
            <span className="shop-action-sheet__row-right">
              {ordersCount > 0 && <span className="shop-action-sheet__badge">{ordersCount}</span>}
              {/* Icons.receipt_outlined */}
              <Icon name="receipt" />
            </span>
          </button>

          <button
            type="button"
            className="shop-action-sheet__row shop-action-sheet__row--disabled"
            onClick={() => {
              onClose()
              window.alert(t('report_unavailable'))
            }}
          >
            <span>{t('report_period')}</span>
            {/* Icons.bar_chart, color #DEDEDE */}
            <Icon name="bar_chart" filled color="#DEDEDE" />
          </button>
        </div>

        {/* Card 3: Задолженность / Найти на карте / Позвонить */}
        <div className="shop-action-sheet__card">
          <div className="shop-action-sheet__row">
            <span>{t('report_debt')}</span>
            <span className="shop-action-sheet__row-right">
              {!!shop.companyDept && (
                <span className="shop-action-sheet__debt">{formatNumberWithSpace(shop.companyDept)} ₸</span>
              )}
              {/* Icons.payment */}
              <Icon name="payment" filled />
            </span>
          </div>

          <button type="button" className="shop-action-sheet__row" onClick={() => goTo(`/map?shopId=${shop.id}`)}>
            <span>{t('shop_find_on_map')}</span>
            <span className="shop-action-sheet__row-right">
              <span className="shop-action-sheet__muted">{shop.codeShop ?? shop.id}</span>
              {/* Icons.map_outlined */}
              <Icon name="map" />
            </span>
          </button>

          <div className="shop-action-sheet__row">
            <span>{t('shop_call')}</span>
            <span className="shop-action-sheet__row-right">
              <span className="shop-action-sheet__muted">
                {shop.phoneNumberShop ?? t('shop_phone_not_specified')}
              </span>
              {/* Icons.phone_enabled_outlined */}
              <Icon name="phone_enabled" />
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
