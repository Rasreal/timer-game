import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAppBack } from '../shared/useAppBack'
import { ProductCard } from '../features/products/components/ProductCard'
import { Snackbar } from '../features/products/components/Snackbar'
import { DEMO_PRODUCTS } from '../features/products/demoData'
import { fetchProductsByIds } from '../features/products/api'
import { useCartState } from '../features/products/useCartState'
import { useSnackbar } from '../features/products/useSnackbar'
import { useAppState } from '../features/favourites/useAppState'
import { formatNumberWithSpace } from '../features/orders/formatNumber'
import { DEMO_SHOP } from '../features/favourites/demoData'
import { DEMO_USER_PHONE } from '../features/auth/authStore'
import { useAuthStore } from '../features/auth/authStore'
import { getShopById } from '../features/main/api'
import type { Product } from '../features/products/types'
import { FilterEmpty } from '../shared/FilterEmpty'
import { Icon } from '../shared/Icon'
import { AlertDialog } from '../shared/AlertDialog'
import './CartPage.css'

// Language-aware pluralization key for "товар/товара/товаров" (cart_widget.dart
// picks between the same three localized strings). Russian follows the
// standard three-form rule (1/21/31 → singular, 2-4/22-24 → genitive, else
// plural); Kazakh nouns don't inflect after numerals (all three kk values are
// 'тауар'); English is a simple singular/plural split.
function pluralizeTovarKey(count: number, language: string): string {
  if (language.startsWith('en')) {
    return count === 1 ? 'cart_product_singular' : 'cart_products_plural'
  }
  if (language.startsWith('kk')) {
    return 'cart_product_singular'
  }
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return 'cart_product_singular'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'cart_products_genitive'
  return 'cart_products_plural'
}

// Ports lib/archived_pages/cart/cart_widget.dart. Cart line items only carry
// {shopId, productId, quantity} (see useCartState), so the actual Product
// data (name/price/stock) has to be re-resolved here — from DEMO_PRODUCTS for
// the demo shop, or a real `products` table lookup (fetchProductsByIds) for
// everyone else, matching how ProductsList/ProductsPage resolve products for
// the same shop. "Confirm order" replicates the Dart version's per-item
// inventory check, then navigates to /order (see pages/OrderPage.tsx).
//
// App-bar cart/trolley icon: Dart's `_model.total` bool (cart_model.dart)
// toggles Icons.trolley between FlutterFlowTheme.alternate (gray/inactive)
// and #FF6300 (orange/active) — ported here as `showTotals`, which also
// gates the "Выбрано"/"Итого к оплате" summary card, matching the Dart
// source's `if (_model.total)` guard around that same Container.
//
// Confirm button: the Dart source only renders "Подтвердить заказ" at all
// when cart.length > 0. The new ground-truth screenshot instead shows it
// always visible, so it's rendered unconditionally here with a disabled/muted
// state when the cart is empty (common pattern for this kind of primary CTA,
// and avoids the button popping in/out of the layout). A local `isSubmitting`
// flag drives the loading spinner while the inventory recheck runs, since
// cart_model.dart has no loading flag of its own to port from.
export function CartPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const shopId = Number(params.get('shopId')) || DEMO_SHOP.id
  const userId = useAuthStore((s) => s.userId)
  const isDemo = userId === DEMO_USER_PHONE || shopId === DEMO_SHOP.id

  const cart = useCartState((s) => s.cart)
  const setQuantity = useCartState((s) => s.setQuantity)
  const favourites = useAppState((s) => s.favourites)
  const addFavourite = useAppState((s) => s.addFavourite)
  const removeFavourite = useAppState((s) => s.removeFavourite)
  const { snackbar, showSnackbar } = useSnackbar()

  const [showTotals, setShowTotals] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [outOfStockName, setOutOfStockName] = useState<string | null>(null)
  const [shopProducts, setShopProducts] = useState<Product[]>(isDemo ? DEMO_PRODUCTS : [])
  const [shopName, setShopName] = useState(isDemo ? DEMO_SHOP.nameShop : '')

  useEffect(() => {
    if (isDemo) {
      setShopName(DEMO_SHOP.nameShop)
      return
    }
    let cancelled = false
    getShopById(shopId)
      .then((shop) => {
        if (!cancelled) setShopName(shop?.nameShop ?? '')
      })
      .catch(() => {
        if (!cancelled) setShopName('')
      })
    return () => {
      cancelled = true
    }
  }, [isDemo, shopId])

  const shopCartItems = useMemo(() => cart.filter((c) => c.shopId === shopId), [cart, shopId])

  // Real (non-demo) shops: cart items only carry productId, so re-fetch the
  // current Product rows (name/price/stock) for whatever's in this shop's cart.
  useEffect(() => {
    if (isDemo) {
      setShopProducts(DEMO_PRODUCTS)
      return
    }
    const ids = cart.filter((c) => c.shopId === shopId).map((c) => c.productId)
    if (ids.length === 0) {
      setShopProducts([])
      return
    }
    let cancelled = false
    fetchProductsByIds(ids)
      .then((products) => {
        if (!cancelled) setShopProducts(products)
      })
      .catch(() => {
        if (!cancelled) setShopProducts([])
      })
    return () => {
      cancelled = true
    }
    // Re-fetch whenever the set of product ids in this shop's cart changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo, shopId, JSON.stringify(shopCartItems.map((c) => c.productId).sort())])

  const cartProducts = useMemo(
    () =>
      shopCartItems
        .map((item) => ({ item, product: shopProducts.find((p) => p.id === item.productId) }))
        .filter((x): x is { item: (typeof shopCartItems)[number]; product: Product } => Boolean(x.product)),
    [shopCartItems, shopProducts],
  )

  const totalCount = shopCartItems.length
  const totalPrice = cartProducts.reduce((sum, { item, product }) => sum + (product.priceProduct ?? 0) * item.quantity, 0)

  // Pop, never push: the old pageType branches pushed /products or
  // /favourites on every back tap, growing history into an inescapable
  // products <-> cart loop. The pusher (products/favourites/shop sheet) is
  // already the previous history entry.
  const handleBack = useAppBack()

  const handleConfirmOrder = async () => {
    if (totalCount === 0 || isSubmitting) return

    setIsSubmitting(true)
    try {
      // Mirrors the Dart source's per-item inventory recheck loop before
      // pushing to the order screen. Re-fetches fresh stock for real shops
      // (products may have sold out since the products list was last loaded);
      // demo data is static so a short simulated delay stands in instead.
      let freshProducts = shopProducts
      if (!isDemo) {
        freshProducts = await fetchProductsByIds(shopCartItems.map((c) => c.productId))
      } else {
        await new Promise((resolve) => setTimeout(resolve, 400))
      }

      const outOfStock = shopCartItems
        .map((item) => ({ item, product: freshProducts.find((p) => p.id === item.productId) }))
        .find(({ item, product }) => (product?.inventoryProduct ?? 0) < item.quantity)
      if (outOfStock?.product) {
        setOutOfStockName(outOfStock.product.nameProduct)
        return
      }
      navigate(`/order?shopId=${shopId}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="cart-page">
      <header className="cart-page__app-bar">
        <button type="button" className="cart-page__back" aria-label={t('common_back')} onClick={handleBack}>
          {/* Icons.arrow_back_ios_new, color #FF6300 */}
          <Icon name="arrow_back_ios_new" color="#FF6300" />
        </button>
        <div className="cart-page__title-group">
          <h1 className="cart-page__title">{t('cart_title')}</h1>
          {/* Ground-truth screenshot shows the shop name here (cart_widget.dart's
              title Column: 'Корзина' + widget.rowShop.nameShop), not pageType —
              pageType is only used for the back-button destination above. */}
          <span className="cart-page__subtitle">{shopName}</span>
        </div>
        <button
          type="button"
          className={`cart-page__totals-toggle ${showTotals ? 'cart-page__totals-toggle--active' : ''}`}
          aria-label={t('cart_total_pay')}
          onClick={() => setShowTotals((v) => !v)}
        >
          {/* Icons.trolley — the flatbed-cart glyph seen in the ground-truth
              screenshots. Classic Material Icons (the icon font this port uses)
              never shipped it, so the exact Material Symbols path is inlined
              here; fill:currentColor keeps the gray/orange toggle in CSS.
              Gray/inactive by default, orange when showTotals (_model.total). */}
          <svg
            className="cart-page__trolley-icon"
            xmlns="http://www.w3.org/2000/svg"
            height="24"
            width="24"
            viewBox="0 -960 960 960"
            aria-hidden
          >
            <path
              fill="currentColor"
              d="M160-280v-480H80v-80h160v480h600v80H160Zm80 200q-33 0-56.5-23.5T160-160q0-33 23.5-56.5T240-240q33 0 56.5 23.5T320-160q0 33-23.5 56.5T240-80Zm40-320v-240h240v240H280Zm80-80h80v-80h-80v80Zm200 80v-240h240v240H560Zm80-80h80v-80h-80v80ZM760-80q-33 0-56.5-23.5T680-160q0-33 23.5-56.5T760-240q33 0 56.5 23.5T840-160q0 33-23.5 56.5T760-80ZM360-480h80-80Zm280 0h80-80Z"
            />
          </svg>
        </button>
      </header>

      <main className="cart-page__body">
        {/* Dart: the body Column is spaceBetween with the ListView inside an
            Expanded — only the list scrolls; the dotted divider + summary card
            below it stay pinned above the confirm button (ground-truth
            screenshot 20.24.30 shows the summary at the bottom even with a
            single cart item). */}
        <div className="cart-page__scroll">
          {cartProducts.length === 0 ? (
            // Dart renders FilterEmptyWidget() with its default 'Нет данных'
            // message here (cart_widget.dart line ~254), not a cart-specific one.
            <FilterEmpty />
          ) : (
            <div className="cart-page__list">
              {cartProducts.map(({ item, product }) => (
              <ProductCard
                key={product.id}
                product={product}
                quantity={item.quantity}
                isFavourite={favourites.some((f) => f.productId === product.id && f.shopId === shopId)}
                onToggleFavourite={() => {
                  const entry = { productId: product.id, shopId }
                  const isFav = favourites.some((f) => f.productId === product.id && f.shopId === shopId)
                  if (isFav) {
                    removeFavourite(entry)
                    showSnackbar(t('product_removed_favorites'), 'error')
                  } else {
                    addFavourite(entry)
                    showSnackbar(t('product_added_favorites'), 'success')
                  }
                }}
                onQuantityChange={(next) => {
                  setQuantity(shopId, product.id, next)
                  if (next === 0) showSnackbar(t('product_removed_cart'), 'error')
                }}
                onRemoveFromCart={() => showSnackbar(t('product_removed_cart'), 'error')}
              />
              ))}
            </div>
          )}
        </div>

        {totalCount > 0 && showTotals && <div className="cart-page__dotted-divider" />}

        {totalCount > 0 && showTotals && (
          <div className="cart-page__summary">
            <div className="cart-page__summary-row">
              <span>{t('cart_selected')}</span>
              <span className="cart-page__summary-highlight">
                {totalCount} {t(pluralizeTovarKey(totalCount, i18n.language))}
              </span>
            </div>
            <hr />
            <div className="cart-page__summary-row">
              <span>{t('cart_total_pay')}</span>
              <span>{formatNumberWithSpace(totalPrice)} ₸</span>
            </div>
          </div>
        )}
      </main>

      <div className="cart-page__footer">
        <button
          type="button"
          className={`cart-page__confirm ${isSubmitting ? 'cart-page__confirm--loading' : ''}`}
          onClick={handleConfirmOrder}
          disabled={totalCount === 0 || isSubmitting}
        >
          {isSubmitting ? (
            <span className="cart-page__confirm-spinner" aria-label={t('common_loading')} />
          ) : (
            t('order_confirm_order')
          )}
        </button>
      </div>

      {outOfStockName && (
        <AlertDialog
          message={`${outOfStockName} ${t('product_out_of_stock_suffix')}`}
          buttonText={t('common_close')}
          onClose={() => setOutOfStockName(null)}
        />
      )}

      {snackbar && <Snackbar key={snackbar.key} message={snackbar.message} tone={snackbar.tone} />}
    </div>
  )
}
