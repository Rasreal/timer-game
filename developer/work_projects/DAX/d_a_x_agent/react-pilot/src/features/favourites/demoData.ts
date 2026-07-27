import type { Product, Shop } from './types'

// Standalone demo catalog used when the per-company product database isn't
// reachable from this pilot (see note in features/auth/authStore.ts).
export const DEMO_SHOP: Shop = {
  id: 9999,
  nameShop: 'Demo Supermarket Plaza',
  streetShop: 'Абая проспект',
  houseShop: '150',
  phoneNumberShop: '+7 727 123 4567',
  codeShop: 9999,
  priceTypesCode: ['retail', 'wholesale'],
  // Demo-only debt value: the real amount comes from a per-company
  // companies_with_shop query (company_dept > 0) unreachable from this
  // pilot's shared client. A nonzero placeholder keeps the debt row's UI
  // path (red amount before the card icon) visible/testable — see
  // ShopActionSheet.tsx.
  companyDept: 76755,
}

export const DEMO_PRODUCTS: Product[] = [
  { id: 1, nameProduct: 'Молоко 3.2% 1л', codeProduct: 'P-001', priceProduct: 650, inventoryProduct: 42 },
  { id: 2, nameProduct: 'Хлеб белый', codeProduct: 'P-002', priceProduct: 250, inventoryProduct: 120 },
  { id: 3, nameProduct: 'Яйца С1 10шт', codeProduct: 'P-003', priceProduct: 890, inventoryProduct: 30 },
  { id: 4, nameProduct: 'Сахар 1кг', codeProduct: 'P-004', priceProduct: 480, inventoryProduct: 75 },
  { id: 5, nameProduct: 'Масло сливочное 200г', codeProduct: 'P-005', priceProduct: 1200, inventoryProduct: 18 },
]
