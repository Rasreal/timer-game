import { DynamicSupabaseService } from '../auth/dynamicSupabaseService'
import type { Product } from './types'

function mapProduct(row: Record<string, unknown>): Product {
  return {
    id: row.id as number,
    nameProduct: row.name_product as string,
    codeProduct: (row.code_product as string | null) ?? null,
    priceProduct: (row.price_product as number | null) ?? null,
    inventoryProduct: (row.inventory_product as number | null) ?? null,
  }
}

// Ports FavouritesBloc._onLoadFavourites' Supabase query: ProductsTable().queryRows(
// queryFn: (q) => q.inFilterOrNull('id', favouriteProductIds))
export async function fetchProductsByIds(ids: number[]): Promise<Product[]> {
  if (ids.length === 0) return []
  const supabase = DynamicSupabaseService.instance.currentClient
  const { data, error } = await supabase.from('products').select('*').in('id', ids)
  if (error) throw error
  return (data ?? []).map(mapProduct)
}
