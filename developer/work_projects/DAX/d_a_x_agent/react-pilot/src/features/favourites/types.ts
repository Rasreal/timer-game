// Mirrors lib/backend/supabase/database/tables/products.dart
export interface Product {
  id: number
  nameProduct: string
  codeProduct?: string | null
  priceProduct: number | null
  inventoryProduct: number | null
}

// Mirrors lib/backend/supabase/database/tables/shops.dart (subset used here)
export interface Shop {
  id: number
  nameShop: string
  streetShop?: string
  houseShop?: string
  phoneNumberShop?: string | null
  codeShop?: number
  priceTypesCode?: string[]
  // Visual-only fields added for the ShopCard redesign (shop_item_main_widget.dart):
  categoryName?: string // avatar letter source; falls back to nameShop[0]
  distanceMeters?: number // Icons.social_distance row, formatted via functions.distance()
  codeCompany?: string // Icons.home_work_outlined row (warehouse code)
  companyDept?: number // Debt amount from companies_with_shop.company_dept (report_debt row)
}

// Mirrors lib/backend/schema/structs/favourites_struct.dart (FavouritesStruct)
export interface FavouriteEntry {
  shopId: number
  productId: number
}
