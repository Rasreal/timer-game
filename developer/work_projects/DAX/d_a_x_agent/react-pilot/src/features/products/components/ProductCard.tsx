import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatNumberWithSpace } from '../../orders/formatNumber'
import type { Product } from '../types'
import { Icon } from '../../../shared/Icon'
import { AlertDialog } from '../../../shared/AlertDialog'
import './ProductCard.css'

// Port of lib/administration/main/product_component/product_component_widget.dart
// (~1245 lines shared across the products/cart/favourites pages). Row 1: product
// code (gray) + favourite heart toggle. Row 2: product name. Row 3: warehouse
// glyph + stock, price, and — when the item isn't in the cart yet — a plain
// gray cart icon inline. When quantity > 0 a divider + stepper row appears
// instead: −/+ circular buttons around a bordered quantity box, a light-gray
// price-total pill, and an orange "remove from cart" icon
// (Icons.remove_shopping_cart_outlined).
export function ProductCard({
  product,
  quantity,
  isFavourite,
  onToggleFavourite,
  onQuantityChange,
  onRemoveFromCart,
}: {
  product: Product
  quantity: number
  isFavourite: boolean
  onToggleFavourite: () => void
  onQuantityChange: (nextQuantity: number) => void
  onRemoveFromCart?: () => void
}) {
  const { t } = useTranslation()
  const outOfStock = (product.inventoryProduct ?? 0) === 0
  const inCart = quantity > 0
  const lineTotal = quantity * (product.priceProduct ?? 0)
  const [limitAlertOpen, setLimitAlertOpen] = useState(false)

  return (
    <div className="product-card">
      <div className="product-card__header">
        <span className="product-card__code">{product.codeProduct ?? 'null'}</span>
        <button
          type="button"
          className={`product-card__fav${isFavourite ? ' product-card__fav--active' : ''}`}
          aria-label={isFavourite ? t('product_remove_from_favorites') : t('product_add_to_favorites')}
          onClick={onToggleFavourite}
        >
          {/* Icons.favorite_border in Dart, for both states — only the color
              (alternate vs primary, via the --active class) signals state. */}
          <Icon name="favorite_border" filled size={24} />
        </button>
      </div>

      <div className="product-card__name">{product.nameProduct}</div>

      <div className="product-card__meta">
        <Icon name="warehouse" size={24} className="product-card__stock-icon" />
        <span className={`product-card__stock${outOfStock ? ' product-card__stock--out' : ''}`}>
          {outOfStock
            ? t('product_out_of_stock')
            : `${formatNumberWithSpace(product.inventoryProduct ?? 0)} ${t('product_unit_pcs')}`}
        </span>
        <span className="product-card__price">{formatNumberWithSpace(product.priceProduct ?? 0)} ₸</span>
        {!inCart && (
          <button
            type="button"
            className="product-card__cart-icon-btn"
            aria-label={t('product_add_to_cart')}
            onClick={() => onQuantityChange(1)}
          >
            {/* Icons.shopping_cart_outlined — Dart never disables this button
                (out-of-stock items can still be added; inventory is validated
                later at order-confirm time), so no disabled state here. */}
            <Icon name="shopping_cart" size={24} />
          </button>
        )}
        {/* Dart: when the item is in the cart, a 12x40 white Container stands in
            where the cart button was, keeping the price 12px off the row end. */}
        {inCart && <span className="product-card__meta-spacer" />}
      </div>

      {inCart && (
        <>
          <div className="product-card__divider" />
          <div className="product-card__stepper-row">
            <div className="product-card__stepper">
              <button
                type="button"
                className="product-card__step-btn"
                aria-label={t('product_decrease_qty')}
                onClick={() => onQuantityChange(quantity - 1)}
              >
                <Icon name="remove" size={18} />
              </button>
              {/* Dart: quantity box border turns theme.error when count exceeds
                  inventoryProduct (e.g. item went out of stock after being
                  added to cart) — visible in the cart ground-truth screenshot
                  as a red outline around the qty box. */}
              <div
                className={`product-card__step-count${
                  quantity > (product.inventoryProduct ?? 0) ? ' product-card__step-count--error' : ''
                }`}
              >
                {quantity}
              </div>
              <button
                type="button"
                className="product-card__step-btn"
                aria-label={t('product_increase_qty')}
                /* Dart keeps the + button visually enabled (orange) even at the
                   inventory cap — incrementing past it shows the
                   product_quantity_exceeded alert (see new2/limit_items.png)
                   instead of disabling. */
                onClick={() => {
                  if (quantity < (product.inventoryProduct ?? Infinity)) {
                    onQuantityChange(quantity + 1)
                  } else {
                    setLimitAlertOpen(true)
                  }
                }}
              >
                <Icon name="add" size={18} />
              </button>
            </div>
            <span className="product-card__total-pill">{formatNumberWithSpace(lineTotal)} ₸</span>
            <button
              type="button"
              className="product-card__remove-btn"
              aria-label={t('product_remove_from_cart')}
              onClick={() => {
                onQuantityChange(0)
                onRemoveFromCart?.()
              }}
            >
              {/* Icons.remove_shopping_cart_outlined */}
              <Icon name="remove_shopping_cart" size={24} />
            </button>
          </div>
        </>
      )}

      {limitAlertOpen && (
        <AlertDialog
          message={t('product_quantity_exceeded')}
          onClose={() => setLimitAlertOpen(false)}
        />
      )}
    </div>
  )
}
