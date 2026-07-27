import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAppBack } from '../shared/useAppBack'
import { CartFloatingActionButton } from '../features/favourites/components/CartFloatingActionButton'
import { FavouritesAppBar } from '../features/favourites/components/FavouritesAppBar'
import { DEMO_SHOP } from '../features/favourites/demoData'
import { useAppState } from '../features/favourites/useAppState'
import { useFavouritesStore } from '../features/favourites/useFavouritesStore'
import { DEMO_USER_PHONE, useAuthStore } from '../features/auth/authStore'
import { getShopById } from '../features/main/api'
import { ProductCard } from '../features/products/components/ProductCard'
import { Snackbar } from '../features/products/components/Snackbar'
import { useCartState } from '../features/products/useCartState'
import { useSnackbar } from '../features/products/useSnackbar'
import type { Product } from '../features/products/types'
import type { Shop } from '../features/favourites/types'
import { FilterEmpty } from '../shared/FilterEmpty'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import './FavouritesPage.css'

// Ports lib/pages/favourites/favourites_widget.dart. The Dart source's
// FavouritesProductList reuses ProductComponentWidget directly (the same
// card used on the products/cart pages, with the quantity stepper and
// favourite heart) — so this page renders ProductCard, matching that 1:1.
//
// Shop context: Dart receives the shop as a route param (rowShop, serialized
// into query params by the shop bottom sheet) and renders
// 'favourites_shop_required' without it. Mirrored here: the sheet passes the
// full Shop via router state plus ?shopId= for refresh-resilience; on a cold
// load the shop is re-fetched by id (same pattern as CartPage). Demo users
// with no shop context keep the demo shop.
export function FavouritesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const goBack = useAppBack()
  const location = useLocation()
  const [params] = useSearchParams()
  const userId = useAuthStore((s) => s.userId)

  const stateShop = (location.state as { shop?: Shop } | null)?.shop ?? null
  const shopIdParam = Number(params.get('shopId')) || null
  const isDemoUser = userId === DEMO_USER_PHONE

  const [shop, setShop] = useState<Shop | null>(() => {
    if (stateShop) return stateShop
    if (shopIdParam === DEMO_SHOP.id) return DEMO_SHOP
    if (!shopIdParam && isDemoUser) return DEMO_SHOP
    return null
  })
  const [shopLoading, setShopLoading] = useState(() => shop === null && shopIdParam !== null)

  useEffect(() => {
    if (shop !== null || shopIdParam === null) return
    let cancelled = false
    getShopById(shopIdParam)
      .then((row) => {
        if (cancelled) return
        setShop(row)
        setShopLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setShop(null)
        setShopLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopIdParam])

  const { status, products, loadFavourites } = useFavouritesStore()
  const removeFavourite = useAppState((s) => s.removeFavourite)
  const cartCount = useCartState((s) => s.countForShop(shop?.id ?? DEMO_SHOP.id))
  const { snackbar, showSnackbar } = useSnackbar()
  const [showCartConfirm, setShowCartConfirm] = useState(false)

  useEffect(() => {
    if (shop) loadFavourites(shop.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop?.id])

  // favourites_widget.dart: `if (widget.rowShop == null)` -> centered
  // 'Информация о магазине обязательна' on a bare Scaffold.
  if (shop === null) {
    return (
      <div className="favourites-page">
        <main className="favourites-page__body">
          <div className="favourites-page__center">
            {shopLoading ? (
              <div className="favourites-page__spinner" aria-label={t('common_loading')} />
            ) : (
              <p className="favourites-page__error-text">{t('favourites_shop_required')}</p>
            )}
          </div>
        </main>
      </div>
    )
  }

  const handleUnfavourite = (productId: number) => {
    removeFavourite({ productId, shopId: shop.id })
    showSnackbar(t('product_removed_favorites'), 'error')
    loadFavourites(shop.id)
  }

  return (
    <div className="favourites-page">
      <FavouritesAppBar shop={shop} onBack={goBack} />

      <main className="favourites-page__body">
        {status === 'loading' && (
          <div className="favourites-page__center">
            <div className="favourites-page__spinner" aria-label={t('common_loading')} />
          </div>
        )}

        {/* Dart's FavouritesEmpty state renders FilterEmptyWidget() with its
            default 'Нет данных' message (favourites_product_list.dart). */}
        {status === 'empty' && <FilterEmpty />}

        {status === 'error' && (
          <div className="favourites-page__center">
            <p className="favourites-page__error-text">{t('favourites_load_error')}</p>
          </div>
        )}

        {status === 'loaded' && (
          <div className="favourites-page__list">
            {products.map((product) => (
              <FavouriteProductCard
                key={product.id}
                product={product}
                shopId={shop.id}
                onUnfavourite={() => handleUnfavourite(product.id)}
                showSnackbar={showSnackbar}
              />
            ))}
          </div>
        )}
      </main>

      <CartFloatingActionButton cartCount={cartCount} onClick={() => setShowCartConfirm(true)} />

      {showCartConfirm && (
        <ConfirmDialog
          message={t('favourites_go_to_cart')}
          cancelText={t('settings_no')}
          confirmText={t('settings_yes')}
          onCancel={() => setShowCartConfirm(false)}
          onConfirm={() => {
            setShowCartConfirm(false)
            navigate(`/cart?shopId=${shop.id}&pageType=favourites`)
          }}
        />
      )}

      {snackbar && <Snackbar key={snackbar.key} message={snackbar.message} tone={snackbar.tone} />}
    </div>
  )
}

// Subscribes to only this product's own quantity slice (rather than the page
// reading quantityFor for every product on every render) — same fix as
// features/products/components/ProductsList.tsx's ProductCardContainer, so a
// +/- tap on one card doesn't re-render the whole favourites list.
function FavouriteProductCard({
  product,
  shopId,
  onUnfavourite,
  showSnackbar,
}: {
  product: Product
  shopId: number
  onUnfavourite: () => void
  showSnackbar: (message: string, tone: 'success' | 'error') => void
}) {
  const { t } = useTranslation()
  const quantity = useCartState((s) => s.quantityFor(shopId, product.id))
  const setQuantity = useCartState((s) => s.setQuantity)

  return (
    <ProductCard
      product={product}
      quantity={quantity}
      isFavourite
      onToggleFavourite={onUnfavourite}
      onQuantityChange={(next) => {
        const wasEmpty = quantity === 0
        setQuantity(shopId, product.id, Math.max(0, next))
        if (next > 0 && wasEmpty) showSnackbar(t('product_added_cart'), 'success')
        else if (next === 0) showSnackbar(t('product_removed_cart'), 'error')
      }}
      onRemoveFromCart={() => showSnackbar(t('product_removed_cart'), 'error')}
    />
  )
}
