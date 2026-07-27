import { useTranslation } from 'react-i18next'
import { useAppState } from '../../favourites/useAppState'
import { useCartState } from '../useCartState'
import type { Product, Shop } from '../types'
import { ProductCard } from './ProductCard'
import { FilterEmpty } from '../../../shared/FilterEmpty'
import './ProductsList.css'

// Ports lib/pages/products/components/products_list_view.dart (FilterEmptyWidget's
// "Нет товаров" message included). ProductComponentWidget's favourite/cart wiring
// is threaded through useAppState/useCartState here rather than passed down as props,
// mirroring how ProductCard reads FFAppState() directly in the Dart original.
// onSnackbar mirrors the Dart source's per-action ScaffoldMessenger calls
// (product_added_favorites/product_removed_favorites/product_added_cart/product_removed_cart).
//
// Each row is a separate ProductCardContainer subscribing only to its own
// quantity/favourite slice (rather than ProductsList itself calling
// quantityFor/isFavourite for every product on every render) — otherwise a
// single +/- tap on one product re-renders the whole list, which is
// noticeably laggy once the catalog is real Supabase data (dozens+ of rows)
// instead of the small demo catalog.
export function ProductsList({
  products,
  shop,
  onSnackbar,
}: {
  products: Product[]
  shop: Shop
  onSnackbar?: (message: string, tone: 'success' | 'error') => void
}) {
  const { t } = useTranslation()
  if (products.length === 0) {
    // Dart: products_list_view.dart renders FilterEmptyWidget(message: 'Нет товаров')
    // (cloud icon + message), not bare text.
    return (
      <div className="products-list__empty">
        <FilterEmpty message={t('products_none')} />
      </div>
    )
  }

  return (
    <div className="products-list">
      {products.map((product) => (
        <ProductCardContainer key={product.id} product={product} shop={shop} onSnackbar={onSnackbar} />
      ))}
    </div>
  )
}

function ProductCardContainer({
  product,
  shop,
  onSnackbar,
}: {
  product: Product
  shop: Shop
  onSnackbar?: (message: string, tone: 'success' | 'error') => void
}) {
  const { t } = useTranslation()
  const favourite = useAppState((s) => s.isFavourite(product.id, shop.id))
  const addFavourite = useAppState((s) => s.addFavourite)
  const removeFavourite = useAppState((s) => s.removeFavourite)
  const quantity = useCartState((s) => s.quantityFor(shop.id, product.id))
  const setQuantity = useCartState((s) => s.setQuantity)

  return (
    <ProductCard
      product={product}
      quantity={quantity}
      isFavourite={favourite}
      onToggleFavourite={() => {
        if (favourite) {
          removeFavourite({ productId: product.id, shopId: shop.id })
          onSnackbar?.(t('product_removed_favorites'), 'error')
        } else {
          addFavourite({ productId: product.id, shopId: shop.id })
          onSnackbar?.(t('product_added_favorites'), 'success')
        }
      }}
      onQuantityChange={(next) => {
        const wasEmpty = quantity === 0
        setQuantity(shop.id, product.id, Math.max(0, next))
        if (next > 0 && wasEmpty) onSnackbar?.(t('product_added_cart'), 'success')
        else if (next === 0) onSnackbar?.(t('product_removed_cart'), 'error')
      }}
      onRemoveFromCart={() => onSnackbar?.(t('product_removed_cart'), 'error')}
    />
  )
}
