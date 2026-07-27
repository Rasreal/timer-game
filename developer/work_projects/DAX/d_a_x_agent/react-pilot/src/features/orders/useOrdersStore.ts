import { create } from 'zustand'
import i18n from '../../i18n'
import { formatDMY } from '../../lib/dateFormat'
import { DEMO_USER_PHONE } from '../auth/authStore'
import { loadOrders, searchOrders } from './api'
import { getDummyOrders, searchDummyOrders } from './demoData'
import type { MainOrderWithShop } from './types'

// Ports lib/bloc/all_orders/{all_orders_bloc,all_orders_state}.dart as a single
// Zustand store: `status` plays the role of the sealed AllOrdersState subclasses.
type OrdersStatus = 'initial' | 'loading' | 'loaded' | 'empty' | 'error'

interface OrdersState {
  status: OrdersStatus
  orders: MainOrderWithShop[]
  selectedDate: Date
  isSearchResult: boolean
  searchQuery: string | null
  errorMessage: string | null

  loadOrders: (args: { selectedDate: Date; userRoleId: number; userId: string | null }) => Promise<void>
  search: (args: {
    searchQuery: string
    selectedDate: Date
    userRoleId: number
    userId: string | null
  }) => Promise<void>
  clearSearch: (args: { selectedDate: Date; userRoleId: number; userId: string | null }) => Promise<void>
  changeDate: (args: {
    newDate: Date
    userRoleId: number
    userId: string | null
    currentSearchQuery?: string
  }) => Promise<void>
}

export const useOrdersStore = create<OrdersState>((set, get) => ({
  status: 'initial',
  orders: [],
  selectedDate: new Date(),
  isSearchResult: false,
  searchQuery: null,
  errorMessage: null,

  loadOrders: async ({ selectedDate, userRoleId, userId }) => {
    set({ status: 'loading', selectedDate })
    try {
      if (userId === DEMO_USER_PHONE) {
        const demoOrders = getDummyOrders(selectedDate)
        set(
          demoOrders.length === 0
            ? { status: 'empty', orders: [], isSearchResult: false, searchQuery: null }
            : { status: 'loaded', orders: demoOrders, isSearchResult: false, searchQuery: null },
        )
        return
      }

      const dateString = formatDMY(selectedDate)
      const orders = await loadOrders(dateString, userRoleId, userId)
      set(
        orders.length === 0
          ? { status: 'empty', orders: [], isSearchResult: false, searchQuery: null }
          : { status: 'loaded', orders, isSearchResult: false, searchQuery: null },
      )
    } catch (e) {
      set({ status: 'error', errorMessage: i18n.t('orders_load_error', { error: String(e) }) })
    }
  },

  search: async ({ searchQuery, selectedDate, userRoleId, userId }) => {
    set({ status: 'loading', selectedDate })
    try {
      if (userId === DEMO_USER_PHONE) {
        const demoOrders = getDummyOrders(selectedDate)
        const results = searchDummyOrders(demoOrders, searchQuery)
        set(
          results.length === 0
            ? { status: 'empty', orders: [], isSearchResult: true, searchQuery }
            : { status: 'loaded', orders: results, isSearchResult: true, searchQuery },
        )
        return
      }

      const dateString = formatDMY(selectedDate)
      const agentFilter = userRoleId === 1 ? '' : userId ?? ''
      const results = await searchOrders(searchQuery, dateString, agentFilter)
      set(
        results.length === 0
          ? { status: 'empty', orders: [], isSearchResult: true, searchQuery }
          : { status: 'loaded', orders: results, isSearchResult: true, searchQuery },
      )
    } catch (e) {
      set({ status: 'error', errorMessage: i18n.t('orders_search_error', { error: String(e) }) })
    }
  },

  clearSearch: async ({ selectedDate, userRoleId, userId }) => {
    await get().loadOrders({ selectedDate, userRoleId, userId })
  },

  changeDate: async ({ newDate, userRoleId, userId, currentSearchQuery }) => {
    if (currentSearchQuery && currentSearchQuery.length > 0) {
      await get().search({ searchQuery: currentSearchQuery, selectedDate: newDate, userRoleId, userId })
    } else {
      await get().loadOrders({ selectedDate: newDate, userRoleId, userId })
    }
  },
}))
