import type { Category, PriceType, Product, Shop } from './types'

// Standalone demo catalog used when the per-company product database isn't
// reachable from this pilot (see note in features/auth/authStore.ts).
export const DEMO_SHOP_ID = 9999
export const DEMO_SHOP: Shop = { id: DEMO_SHOP_ID, nameShop: 'Demo Supermarket Plaza' }

const CATEGORY_DAIRY: Category = { codeCategory: 'dairy', nameCategory: 'Молочные продукты', productsCount: 3 }
const CATEGORY_BAKERY: Category = { codeCategory: 'bakery', nameCategory: 'Хлебобулочные изделия', productsCount: 2 }
const CATEGORY_GROCERY: Category = { codeCategory: 'grocery', nameCategory: 'Бакалея', productsCount: 2 }

export const DEMO_PRICE_TYPES: PriceType[] = [
  {
    codePriceType: 'retail',
    namePriceType: 'Розничная',
    categories: [CATEGORY_DAIRY, CATEGORY_BAKERY, CATEGORY_GROCERY],
  },
  {
    codePriceType: 'wholesale',
    namePriceType: 'Оптовая',
    categories: [CATEGORY_DAIRY, CATEGORY_GROCERY],
  },
]

export const DEMO_PRODUCTS: Product[] = [
  {
    id: 1,
    nameProduct: 'Молоко 3.2% 1л',
    codeProduct: 'P-001',
    codeProductsCategory: 'dairy',
    codePriceType: 'retail',
    priceProduct: 650,
    inventoryProduct: 42,
  },
  {
    id: 2,
    nameProduct: 'Хлеб белый',
    codeProduct: 'P-002',
    codeProductsCategory: 'bakery',
    codePriceType: 'retail',
    priceProduct: 250,
    inventoryProduct: 120,
  },
  {
    id: 3,
    nameProduct: 'Яйца С1 10шт',
    codeProduct: 'P-003',
    codeProductsCategory: 'grocery',
    codePriceType: 'retail',
    priceProduct: 890,
    inventoryProduct: 30,
  },
  {
    id: 4,
    nameProduct: 'Сахар 1кг',
    codeProduct: 'P-004',
    codeProductsCategory: 'grocery',
    codePriceType: 'retail',
    priceProduct: 480,
    inventoryProduct: 75,
  },
  {
    id: 5,
    nameProduct: 'Масло сливочное 200г',
    codeProduct: 'P-005',
    codeProductsCategory: 'dairy',
    codePriceType: 'retail',
    priceProduct: 1200,
    inventoryProduct: 18,
  },
  {
    id: 6,
    nameProduct: 'Батон нарезной',
    codeProduct: 'P-006',
    codeProductsCategory: 'bakery',
    codePriceType: 'retail',
    priceProduct: 220,
    inventoryProduct: 60,
  },
  {
    id: 7,
    nameProduct: 'Сметана 20% 400г',
    codeProduct: 'P-007',
    codeProductsCategory: 'dairy',
    codePriceType: 'wholesale',
    priceProduct: 4800,
    inventoryProduct: 15,
  },
  {
    id: 8,
    nameProduct: 'Мука пшеничная 2кг (опт)',
    codeProduct: 'P-008',
    codeProductsCategory: 'grocery',
    codePriceType: 'wholesale',
    priceProduct: 3600,
    inventoryProduct: 25,
  },
  // Out of stock — should never surface in search results (matches search.dart's gt('inventory_product', 0)).
  {
    id: 9,
    nameProduct: 'Йогурт питьевой 0.5л',
    codeProduct: 'P-009',
    codeProductsCategory: 'dairy',
    codePriceType: 'retail',
    priceProduct: 350,
    inventoryProduct: 0,
  },
]

// Ports the filtering behavior of lib/custom_code/actions/search.dart against
// the local demo catalog: name/code match, in stock, priced, optional category/price-type.
export function searchDemoProducts(
  query: string | null,
  selectedCategory: string | null,
  selectedPriceType: string | null,
): Product[] {
  const q = (query ?? '').trim().toLowerCase()
  return DEMO_PRODUCTS.filter((p) => {
    if (q && !p.nameProduct.toLowerCase().includes(q) && !(p.codeProduct ?? '').toLowerCase().includes(q)) {
      return false
    }
    if ((p.inventoryProduct ?? 0) <= 0) return false
    if ((p.priceProduct ?? 0) <= 0) return false
    if (selectedCategory && p.codeProductsCategory !== selectedCategory) return false
    if (selectedPriceType && p.codePriceType !== selectedPriceType) return false
    return true
  })
}
