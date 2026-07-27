import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAppBack } from '../shared/useAppBack'
import { useTranslation } from 'react-i18next'
import { CategoryFilterSection } from '../features/products/components/CategoryFilterSection'
import { PriceTypeFilterSection } from '../features/products/components/PriceTypeFilterSection'
import { ProductsCartFab } from '../features/products/components/ProductsCartFab'
import { ProductsList } from '../features/products/components/ProductsList'
import { ProductsSearchBar } from '../features/products/components/ProductsSearchBar'
import { ResultsCount } from '../features/products/components/ResultsCount'
import { Snackbar } from '../features/products/components/Snackbar'
import { useCartState } from '../features/products/useCartState'
import { useProductsStore } from '../features/products/useProductsStore'
import { useSnackbar } from '../features/products/useSnackbar'
import { Icon } from '../shared/Icon'
import './ProductsPage.css'

// Ports lib/pages/products/products_list_widget.dart. The route takes shopId/shopName
// the same way ShopOrdersPage does, standing in for the Dart page's `rowShop` param.
export function ProductsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const goBack = useAppBack()
  const { shopId: shopIdParam } = useParams()
  const [searchParams] = useSearchParams()
  const shopId = Number(shopIdParam)
  const shopName = searchParams.get('shopName') ?? t('shop_unknown')
  const shop = { id: shopId, nameShop: shopName }

  const {
    status,
    products,
    priceTypes,
    selectedPriceType,
    selectedCategory,
    errorMessage,
    loadInitial,
    search,
    selectCategory,
    selectPriceType,
    selectedPriceTypeData,
  } = useProductsStore()
  const countForShop = useCartState((s) => s.countForShop(shopId))
  const { snackbar, showSnackbar } = useSnackbar()

  const [filterOpen, setFilterOpen] = useState(true)
  const [query, setQuery] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    loadInitial(shopId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId])

  const handleQueryChange = (next: string) => {
    setQuery(next)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    // Ports products_search_bar.dart's EasyDebounce.debounce (200ms in Dart; kept at
    // the 300ms convention used elsewhere in this pilot for consistency).
    debounceRef.current = setTimeout(() => search(shopId, next), 300)
  }

  const handleClear = () => {
    setQuery('')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    search(shopId, '')
  }

  const categories = selectedPriceTypeData()?.categories ?? []

  return (
    <div className="products-page">
      <header className="products-page__app-bar">
        <button type="button" className="products-page__back" aria-label={t('common_back')} onClick={goBack}>
          {/* Icons.arrow_back_ios_new */}
          <Icon name="arrow_back_ios_new" />
        </button>
        <h1 className="products-page__title">{t('products_all')}</h1>
        <button
          type="button"
          className={`products-page__filter-toggle${filterOpen ? ' products-page__filter-toggle--active' : ''}`}
          aria-label={t('products_filters')}
          onClick={() => setFilterOpen((v) => !v)}
        >
          {/* Icons.filter_list */}
          <Icon name="filter_list" />
        </button>
      </header>

      {status === 'loading' && products.length === 0 && priceTypes.length === 0 ? (
        <div className="products-page__center">
          <div className="products-page__spinner" aria-label={t('common_loading')} />
        </div>
      ) : (
        <>
          {filterOpen && (
            <>
              {categories.length > 0 && (
                <CategoryFilterSection
                  categories={categories}
                  selectedCategory={selectedCategory}
                  onCategorySelected={(code) => selectCategory(shopId, code, query)}
                />
              )}
              {priceTypes.length > 0 && (
                <PriceTypeFilterSection
                  priceTypes={priceTypes}
                  selectedPriceType={selectedPriceType}
                  selectedCategory={selectedCategory}
                  onPriceTypeSelected={(pt) => selectPriceType(shopId, pt, query)}
                />
              )}
            </>
          )}

          <ProductsSearchBar value={query} onChange={handleQueryChange} onClear={handleClear} />
          <ResultsCount count={products.length} isVisible={query.length > 0} />

          <main className="products-page__body">
            {status === 'error' && (
              <div className="products-page__center">
                <p className="products-page__error-text">{errorMessage}</p>
              </div>
            )}
            {(status === 'loaded' || status === 'empty') && (
              <ProductsList products={products} shop={shop} onSnackbar={showSnackbar} />
            )}
          </main>
        </>
      )}

      <ProductsCartFab
        cartCount={countForShop}
        // pageType is a language-neutral token; the Dart original passes the
        // localized 'product_products' title here, which CartPage's back
        // button branches on — see CartPage.handleBack.
        onClick={() => navigate(`/cart?shopId=${shopId}&pageType=products`)}
      />

      {snackbar && <Snackbar key={snackbar.key} message={snackbar.message} tone={snackbar.tone} />}
    </div>
  )
}
