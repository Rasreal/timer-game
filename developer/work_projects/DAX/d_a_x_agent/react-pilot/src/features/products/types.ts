// Mirrors lib/backend/supabase/database/tables/products.dart
export interface Product {
  id: number
  nameProduct: string
  codeProduct?: string | null
  codeProductsCategory?: string | null
  codePriceType?: string | null
  priceProduct: number | null
  inventoryProduct: number | null
}

// Mirrors lib/backend/schema/structs/categories_struct.dart (CategoriesStruct)
export interface Category {
  codeCategory: string
  nameCategory: string
  productsCount: number
}

// Mirrors lib/backend/schema/structs/price_type_struct.dart (PriceTypeStruct)
export interface PriceType {
  codePriceType: string
  namePriceType: string
  categories: Category[]
}

// Mirrors lib/backend/supabase/database/tables/shops.dart (subset used here)
export interface Shop {
  id: number
  nameShop: string
}

// Mirrors the `cart` field of lib/app_state.dart (FFAppState) — CartItemStruct.
export interface CartItem {
  shopId: number
  productId: number
  quantity: number
}
