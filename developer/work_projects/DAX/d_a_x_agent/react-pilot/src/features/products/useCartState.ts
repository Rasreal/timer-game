import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem } from './types'

// Mirrors the `cart` field of lib/app_state.dart (FFAppState) plus its
// productSelectedCategory/productSelectedPriceType persisted preferences.
// A separate store from favourites/useAppState.ts's cart (which only tracks
// shopId/productId for counting) because product cards here need quantities.
interface CartState {
  cart: CartItem[]
  lastSelectedCategory: string
  lastSelectedPriceType: string
  quantityFor: (shopId: number, productId: number) => number
  setQuantity: (shopId: number, productId: number, quantity: number) => void
  countForShop: (shopId: number) => number
  setLastSelectedCategory: (code: string) => void
  setLastSelectedPriceType: (code: string) => void
}

export const useCartState = create<CartState>()(
  persist(
    (set, get) => ({
      cart: [],
      lastSelectedCategory: '',
      lastSelectedPriceType: '',

      quantityFor: (shopId, productId) =>
        get().cart.find((c) => c.shopId === shopId && c.productId === productId)?.quantity ?? 0,

      setQuantity: (shopId, productId, quantity) =>
        set((s) => {
          // Update in place — filter-and-append moved the item to the end of
          // the array, visibly reordering the cart list on every +/- tap.
          const idx = s.cart.findIndex((c) => c.shopId === shopId && c.productId === productId)
          if (idx === -1) {
            return quantity > 0 ? { cart: [...s.cart, { shopId, productId, quantity }] } : s
          }
          if (quantity > 0) {
            const cart = s.cart.slice()
            cart[idx] = { shopId, productId, quantity }
            return { cart }
          }
          return { cart: s.cart.filter((_, i) => i !== idx) }
        }),

      countForShop: (shopId) => get().cart.filter((c) => c.shopId === shopId).length,

      setLastSelectedCategory: (code) => set({ lastSelectedCategory: code }),
      setLastSelectedPriceType: (code) => set({ lastSelectedPriceType: code }),
    }),
    { name: 'ff_products_cart_state' },
  ),
)
