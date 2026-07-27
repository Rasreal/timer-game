import { create } from 'zustand'
import type { Shop } from '../favourites/types'
import { DEMO_USER_PHONE } from '../auth/authStore'
import { DEMO_SHOPS } from './demoShops'
import { loadCoverageShops, loadInitialShops, searchShops as searchShopsApi } from './api'

// Ports the shop-list/search subset of lib/pages/main/main_widget.dart +
// lib/pages/main/main_model.dart. The real app branches between two dashboard
// variants based on FFAppState().mainPageType1 (coverage mode): a preloaded
// list with client-side text search (MainPageType1), or a paginated list with
// server-side search via the search_shops_paginated RPC (MainPageType2) —
// both real-user paths are reachable and wired here (see features/main/api.ts:
// loadInitialShops calls that same RPC for a real per-row distance_meters,
// loadCoverage calls nearby_shops_for_user). Demo users get the dummy list on
// every path, same as search_shops.dart's isDemoUser branch.
interface MainDashboardState {
  shops: Shop[]
  searchShops: Shop[]
  searchActive: boolean
  loadShops: (
    userId: string | null,
    cityName?: string | null,
    userLocation?: { lat: number; lng: number } | null,
    cityCenter?: { lat: number; lng: number } | null,
  ) => Promise<void>
  loadCoverage: (
    userId: string | null,
    dayField: string,
    center: { lat: number; lng: number } | null,
  ) => Promise<void>
  search: (query: string, userId: string | null, cityName?: string | null) => Promise<void>
  clearSearch: () => void
}

export const useMainDashboardStore = create<MainDashboardState>((set) => ({
  shops: [],
  searchShops: [],
  searchActive: false,

  loadShops: async (userId, cityName, userLocation, cityCenter) => {
    if (userId === DEMO_USER_PHONE) {
      set({ shops: DEMO_SHOPS })
      return
    }
    try {
      const shops = await loadInitialShops(cityName, userLocation, cityCenter)
      set({ shops })
    } catch (e) {
      console.error('loadShops error:', e)
      set({ shops: [] })
    }
  },

  // Coverage mode (FFAppState().mainPageType1 in Dart): only the shops the
  // admin assigned to this agent for the selected weekday — the calendar's
  // day selection drives dayField (see _onCalendarDateChanged in
  // main_widget.dart). Demo users get the full dummy list, same as
  // get_near_by_shops_smart.dart's demo branch which ignores the day.
  loadCoverage: async (userId, dayField, center) => {
    if (userId === DEMO_USER_PHONE) {
      set({ shops: DEMO_SHOPS })
      return
    }
    if (!userId) {
      set({ shops: [] })
      return
    }
    try {
      const shops = await loadCoverageShops(userId, dayField, center)
      set({ shops })
    } catch (e) {
      console.error('loadCoverage error:', e)
      set({ shops: [] })
    }
  },

  search: async (query, userId, cityName) => {
    const q = query.trim()
    if (!q) {
      set({ searchActive: false, searchShops: [] })
      return
    }

    if (userId === DEMO_USER_PHONE) {
      const results = DEMO_SHOPS.filter((shop) => shop.nameShop.toLowerCase().includes(q.toLowerCase()))
      set({ searchActive: true, searchShops: results })
      return
    }

    try {
      const results = await searchShopsApi(q, null, cityName)
      set({ searchActive: true, searchShops: results })
    } catch (e) {
      console.error('searchShops error:', e)
      set({ searchActive: true, searchShops: [] })
    }
  },

  clearSearch: () => set({ searchActive: false, searchShops: [] }),
}))
