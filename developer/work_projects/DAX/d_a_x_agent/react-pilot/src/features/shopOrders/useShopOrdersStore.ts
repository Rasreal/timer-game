import { create } from 'zustand'
import i18n from '../../i18n'
import { loadOrdersForShop, searchOrdersForShop } from '../orders/api'
import { getDummyOrdersForShop, searchDummyOrders } from '../orders/demoData'
import type { MainOrderWithShop } from '../orders/types'

// Ports lib/bloc/shop_orders/{shop_orders_bloc,shop_orders_state}.dart.
type ShopOrdersStatus = 'initial' | 'loading' | 'loaded' | 'empty' | 'error'

const DEMO_SHOP_ID = 9999

interface ShopOrdersState {
  status: ShopOrdersStatus
  orders: MainOrderWithShop[]
  isSearchResult: boolean
  searchQuery: string
  errorMessage: string | null

  loadShopOrders: (shopId: number) => Promise<void>
  search: (shopId: number, searchQuery: string) => Promise<void>
  clearSearch: (shopId: number) => Promise<void>
}

export const useShopOrdersStore = create<ShopOrdersState>((set, get) => ({
  status: 'initial',
  orders: [],
  isSearchResult: false,
  searchQuery: '',
  errorMessage: null,

  loadShopOrders: async (shopId) => {
    set({ status: 'loading' })
    try {
      const orders =
        shopId === DEMO_SHOP_ID ? getDummyOrdersForShop(shopId) : await loadOrdersForShop(shopId)
      set(
        orders.length === 0
          ? { status: 'empty', orders: [], isSearchResult: false, searchQuery: '' }
          : { status: 'loaded', orders, isSearchResult: false, searchQuery: '' },
      )
    } catch (e) {
      set({ status: 'error', errorMessage: i18n.t('shop_orders_load_error', { error: String(e) }) })
    }
  },

  search: async (shopId, searchQuery) => {
    if (searchQuery === '') {
      await get().loadShopOrders(shopId)
      return
    }

    set({ status: 'loading' })
    try {
      const results =
        shopId === DEMO_SHOP_ID
          ? searchDummyOrders(getDummyOrdersForShop(shopId), searchQuery)
          : await searchOrdersForShop(searchQuery, shopId)
      set(
        results.length === 0
          ? { status: 'empty', orders: [], isSearchResult: true, searchQuery }
          : { status: 'loaded', orders: results, isSearchResult: true, searchQuery },
      )
    } catch (e) {
      set({ status: 'error', errorMessage: i18n.t('shop_orders_search_error', { error: String(e) }) })
    }
  },

  clearSearch: async (shopId) => {
    await get().loadShopOrders(shopId)
  },
}))
