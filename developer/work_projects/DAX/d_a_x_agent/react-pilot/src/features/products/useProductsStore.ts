import { create } from 'zustand'
import i18n from '../../i18n'
import { fetchPriceTypesWithCategories, searchProducts } from './api'
import { DEMO_PRICE_TYPES, DEMO_SHOP_ID, searchDemoProducts } from './demoData'
import { useCartState } from './useCartState'
import type { Category, PriceType, Product } from './types'

// Ports lib/pages/products/products_list_model.dart + the data-loading portion of
// lib/pages/products/products_list_widget.dart's initState/_performSearch.
type ProductsStatus = 'initial' | 'loading' | 'loaded' | 'empty' | 'error'

interface ProductsState {
  status: ProductsStatus
  products: Product[]
  priceTypes: PriceType[]
  selectedPriceType: string | null
  selectedCategory: string | null
  errorMessage: string | null

  loadInitial: (shopId: number) => Promise<void>
  search: (shopId: number, query: string) => Promise<void>
  selectCategory: (shopId: number, categoryCode: string | null, query: string) => Promise<void>
  selectPriceType: (shopId: number, priceType: PriceType, query: string) => Promise<void>

  selectedPriceTypeData: () => PriceType | undefined
  categoriesForSelectedPriceType: () => Category[]
}

async function runSearch(shopId: number, query: string, category: string | null, priceType: string | null) {
  return shopId === DEMO_SHOP_ID
    ? searchDemoProducts(query, category, priceType)
    : searchProducts(query, category, priceType)
}

export const useProductsStore = create<ProductsState>((set, get) => ({
  status: 'initial',
  products: [],
  priceTypes: [],
  selectedPriceType: null,
  selectedCategory: null,
  errorMessage: null,

  // Ports ProductsListWidget.initState: load price types/categories, restore the
  // last-selected price type/category from app state, then run the first search.
  loadInitial: async (shopId) => {
    set({ status: 'loading' })
    try {
      const priceTypes =
        shopId === DEMO_SHOP_ID ? DEMO_PRICE_TYPES : await fetchPriceTypesWithCategories(shopId)

      const cartState = useCartState.getState()
      let selectedPriceType: string | null = null
      if (priceTypes.length > 0) {
        const remembered = priceTypes.find((pt) => pt.codePriceType === cartState.lastSelectedPriceType)
        selectedPriceType = (remembered ?? priceTypes[0]).codePriceType
      }

      let selectedCategory: string | null = null
      const savedCategory = cartState.lastSelectedCategory
      if (savedCategory && selectedPriceType) {
        const priceTypeData = priceTypes.find((pt) => pt.codePriceType === selectedPriceType)
        if (priceTypeData?.categories.some((c) => c.codeCategory === savedCategory)) {
          selectedCategory = savedCategory
        }
      }

      const products = await runSearch(shopId, '', selectedCategory, selectedPriceType)

      set({
        status: products.length === 0 ? 'empty' : 'loaded',
        products,
        priceTypes,
        selectedPriceType,
        selectedCategory,
      })
    } catch (e) {
      set({ status: 'error', errorMessage: i18n.t('products_load_error', { error: String(e) }) })
    }
  },

  // Ports ProductsListWidget._performSearch.
  search: async (shopId, query) => {
    const { selectedCategory, selectedPriceType } = get()
    try {
      const products = await runSearch(shopId, query, selectedCategory, selectedPriceType)
      set({ status: products.length === 0 ? 'empty' : 'loaded', products })
    } catch {
      set({ status: 'loaded', products: [] })
    }
  },

  // Ports ProductsListWidget._onCategorySelected.
  selectCategory: async (shopId, categoryCode, query) => {
    useCartState.getState().setLastSelectedCategory(categoryCode ?? '')
    set({ selectedCategory: categoryCode })
    await get().search(shopId, query)
  },

  // Ports ProductsListWidget._onPriceTypeSelected.
  selectPriceType: async (shopId, priceType, query) => {
    const { selectedCategory, priceTypes } = get()
    let nextCategory = selectedCategory
    if (selectedCategory) {
      const categoryExists = priceType.categories.some((c) => c.codeCategory === selectedCategory)
      if (!categoryExists) {
        nextCategory = null
        useCartState.getState().setLastSelectedCategory('')
      }
    }
    useCartState.getState().setLastSelectedPriceType(priceType.codePriceType)
    set({ selectedPriceType: priceType.codePriceType, selectedCategory: nextCategory, priceTypes })
    await get().search(shopId, query)
  },

  selectedPriceTypeData: () => get().priceTypes.find((pt) => pt.codePriceType === get().selectedPriceType),
  categoriesForSelectedPriceType: () => get().selectedPriceTypeData()?.categories ?? [],
}))
