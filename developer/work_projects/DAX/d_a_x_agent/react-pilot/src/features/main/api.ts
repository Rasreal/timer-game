import { DynamicSupabaseService } from '../auth/dynamicSupabaseService'
import type { Shop } from '../favourites/types'

const INITIAL_LOAD_LIMIT = 100

export function mapShop(row: Record<string, unknown>): Shop {
  return {
    id: row.id as number,
    nameShop: (row.name_shop as string) ?? '',
    streetShop: (row.street_shop as string | null) ?? undefined,
    houseShop: (row.house_shop as string | null) ?? undefined,
    phoneNumberShop: (row.phone_number_shop as string | null) ?? null,
    codeShop: (row.code_shop as number | null) ?? undefined,
    priceTypesCode: (row.price_types_code as string[] | null) ?? undefined,
    categoryName: (row.category_name as string | null) ?? undefined,
    distanceMeters: (row.distance_meters as number | null) ?? undefined,
    codeCompany: (row.code_company as string | null) ?? undefined,
  }
}

// Resolves the (lat, lng) passed to search_shops_paginated exactly like
// functions.extractLatLong in paginated_shop_list.dart: prefer the live
// browser location if we have one and it isn't (0,0), otherwise fall back to
// the selected city's coordinates. This is what makes the RPC compute a real
// shops.distance_meters for each row — a plain `.select('*')` on the bare
// table (the previous implementation here) never returns that column at all.
function resolveLatLng(
  userLocation: { lat: number; lng: number } | null,
  cityCenter: { lat: number; lng: number } | null,
): { lat: number; lng: number } {
  const hasUserLocation = userLocation && !(userLocation.lat === 0 && userLocation.lng === 0)
  if (hasUserLocation) return userLocation
  return cityCenter ?? { lat: 0, lng: 0 }
}

// Ports lib/custom_code/actions/search_shops.dart's real-user branch: shops
// table filtered by name/street/house/company-code ilike (plus exact code_shop
// match for numeric queries) and an optional shops_category_code filter.
// Uses DynamicSupabaseService's current (per-company) client, not the bridge DB.
// search_shops.dart itself has no distance/city filter (that's paginated_shop_
// list.dart's RPC, ported separately below) — but shops.city_shop is a real
// column, so filtering the plain query by it is a reasonable addition on top.
export async function searchShops(
  query: string,
  selectedProductCategory?: string | null,
  cityName?: string | null,
): Promise<Shop[]> {
  const client = DynamicSupabaseService.instance.currentClient
  let builder = client.from('shops').select('*')

  const q = query.trim()
  if (q) {
    const qInt = Number.parseInt(q, 10)
    const conditions = [
      `name_shop.ilike.%${q}%`,
      `street_shop.ilike.%${q}%`,
      `house_shop.ilike.%${q}%`,
      `code_company.ilike.%${q}%`,
    ]
    if (!Number.isNaN(qInt) && String(qInt) === q) {
      conditions.push(`code_shop.eq.${qInt}`)
    }
    builder = builder.or(conditions.join(','))
  }

  if (selectedProductCategory && selectedProductCategory.trim()) {
    builder = builder.eq('shops_category_code', selectedProductCategory.trim())
  }

  if (cityName && cityName.trim()) {
    builder = builder.eq('city_shop', cityName.trim())
  }

  const { data, error } = await builder
  if (error) throw error
  return (data ?? []).map(mapShop)
}

// Fetches a single shop by id — used by the products/cart/order flow, which
// only has a shopId (from the route) and needs the full row (name/address/
// codeCompany) for the order-confirmation screen's "Информация о заказе" card.
export async function getShopById(shopId: number): Promise<Shop | null> {
  const client = DynamicSupabaseService.instance.currentClient
  const { data, error } = await client.from('shops').select('*').eq('id', shopId).maybeSingle()
  if (error) throw error
  return data ? mapShop(data) : null
}

// Ports lib/pages/main/components/paginated_shop_list.dart's RPC call
// (search_shops_paginated) for the non-coverage main-page list: computes a
// real shops.distance_meters per row from (lat, lon), same as coverage mode's
// nearby_shops_for_user. A plain table select can't do this — distance is
// only ever present in RPC responses, never a stored column.
export async function loadInitialShops(
  cityName?: string | null,
  userLocation?: { lat: number; lng: number } | null,
  cityCenter?: { lat: number; lng: number } | null,
): Promise<Shop[]> {
  const client = DynamicSupabaseService.instance.currentClient
  const { lat, lng } = resolveLatLng(userLocation ?? null, cityCenter ?? null)
  const { data, error } = await client.rpc('search_shops_paginated', {
    lat,
    lon: lng,
    p_limit: INITIAL_LOAD_LIMIT,
    p_offset: 0,
    p_city: cityName ?? '',
  })
  if (error) throw error
  if (!Array.isArray(data)) return []
  return (data as Record<string, unknown>[]).map(mapShop)
}

// Ports lib/custom_code/actions/get_near_by_shops_smart.dart's real-user
// branch (the coverage-mode loader behind ShopsBloc.LoadNearbyShops): primary
// path is the nearby_shops_for_user RPC (radius passed effectively unlimited,
// as Dart does for coverage), falling back to the same direct query Dart
// falls back to — shops whose day-of-week column (an array of assigned agent
// user UUIDs, e.g. shops.monday) contains this user's per-company id.
export async function loadCoverageShops(
  userId: string,
  dayField: string,
  center: { lat: number; lng: number } | null,
): Promise<Shop[]> {
  const client = DynamicSupabaseService.instance.currentClient
  try {
    const { data, error } = await client.rpc('nearby_shops_for_user', {
      lat: center?.lat ?? 0,
      lon: center?.lng ?? 0,
      user_id: userId,
      day_field: dayField,
      radius: 999999999,
    })
    if (error) throw error
    if (Array.isArray(data)) return (data as Record<string, unknown>[]).map(mapShop)
  } catch (e) {
    console.warn('nearby_shops_for_user failed, falling back to contains query:', e)
  }
  const { data, error } = await client
    .from('shops')
    .select('*')
    .contains(dayField, [userId])
    .limit(100)
  if (error) throw error
  return (data ?? []).map(mapShop)
}
