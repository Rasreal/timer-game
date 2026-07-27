import { DynamicSupabaseService } from '../auth/dynamicSupabaseService'
import type { PriceType, Product } from './types'

const supabase = () => DynamicSupabaseService.instance.currentClient

function mapProduct(row: Record<string, unknown>): Product {
  return {
    id: row.id as number,
    nameProduct: (row.name_product as string) ?? 'Unknown Product',
    codeProduct: (row.code_product as string | null) ?? null,
    codeProductsCategory: (row.code_products_category as string | null) ?? null,
    codePriceType: (row.code_price_type as string | null) ?? null,
    priceProduct: (row.price_product as number | null) ?? null,
    inventoryProduct: (row.inventory_product as number | null) ?? null,
  }
}

// Ports lib/custom_code/actions/search.dart's search() custom action:
// filters by name/code (ilike), in-stock, priced > 0, and optional category/price-type.
export async function searchProducts(
  query: string | null,
  selectedCategory: string | null,
  selectedPriceType: string | null,
): Promise<Product[]> {
  let builder = supabase().from('products').select('*')

  if (query && query.length > 0) {
    const pattern = `%${query}%`
    builder = builder.or(`name_product.ilike.${pattern},code_product.ilike.${pattern}`)
  }

  builder = builder.gt('inventory_product', 0).gt('price_product', 0)

  if (selectedCategory) {
    builder = builder.eq('code_products_category', selectedCategory)
  }
  if (selectedPriceType) {
    builder = builder.eq('code_price_type', selectedPriceType)
  }

  const { data, error } = await builder
  if (error) throw error
  return (data ?? []).map(mapProduct)
}

// Ports CartWidget's product lookup for cart line items: ProductsTable().queryRows(
// queryFn: (q) => q.inFilterOrNull('id', cartProductIds)) — same pattern as
// favourites/api.ts's fetchProductsByIds, kept separate since this returns the
// full Product shape (category/price-type codes) cart line items don't need
// but the shared type requires.
export async function fetchProductsByIds(ids: number[]): Promise<Product[]> {
  if (ids.length === 0) return []
  const { data, error } = await supabase().from('products').select('*').in('id', ids)
  if (error) throw error
  return (data ?? []).map(mapProduct)
}

// Ports the `get_price_types_with_categories_by_shop` RPC call
// (GetPriceTypesWithCategoriesByShopsCall in lib/backend/api_requests/api_calls.dart).
export async function fetchPriceTypesWithCategories(shopId: number | undefined): Promise<PriceType[]> {
  const { data, error } = await supabase().rpc('get_price_types_with_categories_by_shop', {
    shop_id: shopId,
  })
  if (error) throw error

  const raw = (data ?? []) as Array<Record<string, unknown>>
  return raw
    .map((entry): PriceType => ({
      codePriceType: (entry.code_price_type as string) ?? '',
      namePriceType: (entry.name_price_type as string) ?? '',
      categories: ((entry.categories as Array<Record<string, unknown>>) ?? []).map((c) => ({
        codeCategory: (c.code_category as string) ?? '',
        nameCategory: (c.name_category as string) ?? '',
        productsCount: (c.products_count as number) ?? 0,
      })),
    }))
    // Ports the ProductsListWidget.initState filter: drop price types with no categories.
    .filter((pt) => pt.categories.length > 0)
}
