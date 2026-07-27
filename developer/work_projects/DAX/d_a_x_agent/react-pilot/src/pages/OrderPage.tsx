import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { DEMO_PRODUCTS } from '../features/products/demoData'
import { fetchProductsByIds } from '../features/products/api'
import { useCartState } from '../features/products/useCartState'
import { useAuthStore, DEMO_USER_PHONE } from '../features/auth/authStore'
import { getShopById } from '../features/main/api'
import { createOrder, type CreateOrderCartItem } from '../features/orders/api'
import { formatNumberWithSpace } from '../features/orders/formatNumber'
import { DEMO_SHOP } from '../features/favourites/demoData'
import type { Product } from '../features/products/types'
import type { Shop } from '../features/favourites/types'
import { Icon } from '../shared/Icon'
import { AlertDialog } from '../shared/AlertDialog'
import './OrderPage.css'

// Ports lib/administration/main/order/order_widget.dart. Only the live
// "Оформить заказ" button is ported (the legacy direct-insert button is
// unreachable in the Dart source too — see its responsiveVisibility guard,
// which always evaluates false); this calls the same `create_order` Postgres
// RPC the live button calls. The comment field's "save draft on back" dialog
// isn't ported (a secondary interaction on top of an already-secondary
// screen) — the comment is only actually used when submitting here.
export function OrderPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const shopId = Number(params.get('shopId')) || DEMO_SHOP.id
  const userId = useAuthStore((s) => s.userId)
  const isDemo = userId === DEMO_USER_PHONE || shopId === DEMO_SHOP.id

  const cart = useCartState((s) => s.cart)
  const setQuantity = useCartState((s) => s.setQuantity)
  const shopCartItems = useMemo(() => cart.filter((c) => c.shopId === shopId), [cart, shopId])

  const [shop, setShop] = useState<Shop | null>(isDemo ? DEMO_SHOP : null)
  const [products, setProducts] = useState<Product[]>(isDemo ? DEMO_PRODUCTS : [])
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isDemo) {
      setShop(DEMO_SHOP)
      setProducts(DEMO_PRODUCTS)
      return
    }
    let cancelled = false
    getShopById(shopId).then((row) => {
      if (!cancelled) setShop(row)
    })
    const ids = shopCartItems.map((c) => c.productId)
    if (ids.length > 0) {
      fetchProductsByIds(ids).then((rows) => {
        if (!cancelled) setProducts(rows)
      })
    }
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo, shopId])

  const lineItems = useMemo(
    () =>
      shopCartItems
        .map((item) => ({ item, product: products.find((p) => p.id === item.productId) }))
        .filter((x): x is { item: (typeof shopCartItems)[number]; product: Product } => Boolean(x.product)),
    [shopCartItems, products],
  )

  const totalSum = lineItems.reduce((sum, { item, product }) => sum + (product.priceProduct ?? 0) * item.quantity, 0)

  const handleBack = () => navigate(-1)

  const handlePlaceOrder = async () => {
    if (lineItems.length === 0 || isSubmitting) return
    setIsSubmitting(true)
    setError(null)
    try {
      if (isDemo || !userId) {
        // No real create_order RPC target for the demo shop/company — fall
        // back to a locally-numbered confirmation, matching this pilot's
        // demo-data convention used elsewhere (see features/orders/demoData.ts).
        const orderNumber = Math.floor(Math.random() * 9000) + 100
        shopCartItems.forEach((item) => setQuantity(shopId, item.productId, 0))
        navigate(`/confirmedOrder?shopId=${shopId}&orderNumber=${orderNumber}`)
        return
      }

      const cartItemsPayload: CreateOrderCartItem[] = lineItems.map(({ item, product }) => ({
        shopId,
        codeCompany: shop?.codeCompany ?? null,
        productId: item.productId,
        codeProduct: product.codeProduct ?? null,
        price: product.priceProduct ?? 0,
        quantity: item.quantity,
        productName: product.nameProduct,
        codePriceType: product.codePriceType ?? null,
        totalPrice: (product.priceProduct ?? 0) * item.quantity,
      }))

      const result = await createOrder(shopId, cartItemsPayload, comment, userId)
      if (!result.success) {
        // Dart: AlertDialog(title: common_error, content: order_error_admin)
        setError(t('order_error_admin'))
        return
      }

      shopCartItems.forEach((item) => setQuantity(shopId, item.productId, 0))
      navigate(`/confirmedOrder?shopId=${shopId}&orderNumber=${result.orderNumber ?? ''}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const address = shop?.streetShop
    ? `${t('shop_street_abbr')} ${shop.streetShop}${shop.houseShop ? `, ${shop.houseShop}` : ''}`
    : ''

  return (
    <div className="order-page">
      <header className="order-page__app-bar">
        <button type="button" className="order-page__back" aria-label={t('common_back')} onClick={handleBack}>
          <Icon name="arrow_back_ios_new" color="#FF6300" />
        </button>
        <h1 className="order-page__title">{t('order_title')}</h1>
        <div className="order-page__spacer" />
      </header>

      <main className="order-page__body">
        <h2 className="order-page__section-title">{t('order_details_info_section')}</h2>
        <div className="order-page__card">
          <div className="order-page__info-row">
            <div className="order-page__info-labels">
              <span>{t('trading_point')}</span>
              <span>{t('address')}</span>
            </div>
            <div className="order-page__info-values">
              <span>{shop?.nameShop ?? ''}</span>
              <span>{address}</span>
            </div>
          </div>
          <hr />
          <div className="order-page__sum-row">
            <span>{t('sum')}</span>
            <span className="order-page__sum-value">{formatNumberWithSpace(totalSum)} ₸</span>
          </div>
        </div>

        <h2 className="order-page__section-title">{t('order_content')}</h2>
        <div className="order-page__items">
          {lineItems.map(({ item, product }) => (
            <div key={product.id} className="order-page__item">
              <div className="order-page__item-info">
                <span className="order-page__item-name">{product.nameProduct}</span>
                <span className="order-page__item-qty">
                  {item.quantity} × {formatNumberWithSpace(product.priceProduct ?? 0)} ₸
                </span>
              </div>
              <span className="order-page__item-total">
                {formatNumberWithSpace((product.priceProduct ?? 0) * item.quantity)} ₸
              </span>
            </div>
          ))}
        </div>

        <h2 className="order-page__section-title">{t('order_comment')}</h2>
        <textarea
          className="order-page__comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
        />
      </main>

      <div className="order-page__footer">
        <button
          type="button"
          className={`order-page__submit ${isSubmitting ? 'order-page__submit--loading' : ''}`}
          onClick={handlePlaceOrder}
          disabled={lineItems.length === 0 || isSubmitting}
        >
          {isSubmitting ? (
            <span className="order-page__spinner" aria-label={t('common_loading')} />
          ) : (
            t('order_place_order')
          )}
        </button>
      </div>

      {/* Dart hardcodes the dismiss TextButton's label as the literal 'Ok';
          localized here via common_ok. */}
      {error && <AlertDialog title={t('common_error')} message={error} buttonText={t('common_ok')} onClose={() => setError(null)} />}
    </div>
  )
}
