import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FavouriteEntry } from './types'

// Mirrors the `favourites` subset of lib/app_state.dart (FFAppState) — a plain
// locally-persisted list, not Supabase-backed. Cart state lives in
// features/products/useCartState.ts (the one real FFAppState().cart list) —
// read that directly rather than duplicating a second cart list here.
interface AppState {
  favourites: FavouriteEntry[]
  addFavourite: (entry: FavouriteEntry) => void
  removeFavourite: (entry: FavouriteEntry) => void
  isFavourite: (productId: number, shopId: number) => boolean
}

export const useAppState = create<AppState>()(
  persist(
    (set, get) => ({
      favourites: [],
      addFavourite: (entry) => set((s) => ({ favourites: [...s.favourites, entry] })),
      removeFavourite: (entry) =>
        set((s) => ({
          favourites: s.favourites.filter(
            (f) => !(f.productId === entry.productId && f.shopId === entry.shopId),
          ),
        })),
      isFavourite: (productId, shopId) =>
        get().favourites.some((f) => f.productId === productId && f.shopId === shopId),
    }),
    { name: 'ff_app_state' },
  ),
)
