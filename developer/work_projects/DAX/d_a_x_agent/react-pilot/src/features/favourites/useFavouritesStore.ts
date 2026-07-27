import { create } from 'zustand'
import { fetchProductsByIds } from './api'
import { DEMO_PRODUCTS, DEMO_SHOP } from './demoData'
import { useAppState } from './useAppState'
import type { Product } from './types'

// Ports lib/bloc/favourites/{favourites_bloc,favourites_state}.dart.
type FavouritesStatus = 'initial' | 'loading' | 'loaded' | 'empty' | 'error'

interface FavouritesStoreState {
  status: FavouritesStatus
  products: Product[]
  shopId: number | null
  errorMessage: string | null
  loadFavourites: (shopId: number) => Promise<void>
}

export const useFavouritesStore = create<FavouritesStoreState>((set) => ({
  status: 'initial',
  products: [],
  shopId: null,
  errorMessage: null,

  loadFavourites: async (shopId) => {
    set({ status: 'loading', shopId })
    try {
      const favouriteProductIds = useAppState
        .getState()
        .favourites.filter((f) => f.shopId === shopId)
        .map((f) => f.productId)

      if (favouriteProductIds.length === 0) {
        set({ status: 'empty', products: [] })
        return
      }

      const products =
        shopId === DEMO_SHOP.id
          ? DEMO_PRODUCTS.filter((p) => favouriteProductIds.includes(p.id))
          : await fetchProductsByIds(favouriteProductIds)

      set(products.length > 0 ? { status: 'loaded', products } : { status: 'empty', products: [] })
    } catch (e) {
      set({ status: 'error', errorMessage: `Failed to load favourites: ${e}` })
    }
  },
}))
