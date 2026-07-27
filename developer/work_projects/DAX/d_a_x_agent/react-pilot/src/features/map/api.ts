import { DynamicSupabaseService } from '../auth/dynamicSupabaseService'
import { mapShop } from '../main/api'
import type { Shop } from '../favourites/types'

// One map marker: a real shop row plus its decoded coordinates.
export interface ShopMapPin {
  shop: Shop
  lat: number
  lng: number
}

// Port of my_map.dart's wkbToLatLng: shops.location is PostGIS EWKB hex
// (e.g. "0101000020E6100000..."), longitude at byte offset 9 and latitude at
// 17, both little-endian float64.
export function wkbToLatLng(hex: string | null | undefined): { lat: number; lng: number } | null {
  if (!hex || hex.length < 34) return null
  try {
    const bytes = new Uint8Array(hex.length / 2)
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16)
    }
    const view = new DataView(bytes.buffer)
    return { lng: view.getFloat64(9, true), lat: view.getFloat64(17, true) }
  } catch {
    return null
  }
}

// functions.date(getCurrentTimestamp) in lib/flutter_flow/custom_functions.dart:
// lowercase english weekday name, used as the RPC's day_field.
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
export function weekdayField(date: Date): string {
  return WEEKDAYS[date.getDay()]
}
export function currentDayField(): string {
  return weekdayField(new Date())
}

// Ports my_map.dart's _loadShopsByBbox: the get_shops_in_bbox RPC on the
// current (per-company) client, called with the visible map bounds. user_id
// comes from the company client's auth session (null under this pilot's
// bridge-DB login, same as Dart when no company auth session exists).
//
// Weekend caveat (verified live against the real company DBs): the RPC's SQL
// references the day column dynamically, and several companies' shops tables
// have no `saturday`/`sunday` columns — passing those days 400s with Postgres
// 42703 "column does not exist" (the Dart app hits the same error and shows
// an empty map on weekends). When that specific error comes back, retry once
// with a weekday every DB has so the map still shows shops.
export async function fetchShopsInBbox(
  bounds: { south: number; west: number; north: number; east: number },
  isCoverage: boolean,
): Promise<ShopMapPin[]> {
  const client = DynamicSupabaseService.instance.currentClient
  const { data: sessionData } = await client.auth.getSession()
  const userId = sessionData?.session?.user?.id ?? null

  const call = (dayField: string) =>
    client.rpc('get_shops_in_bbox', {
      min_lng: bounds.west,
      min_lat: bounds.south,
      max_lng: bounds.east,
      max_lat: bounds.north,
      day_field: dayField,
      user_id: userId,
      is_coverage: isCoverage,
    })

  let { data, error } = await call(currentDayField())
  if (error && error.code === '42703') {
    console.warn(
      `get_shops_in_bbox: no "${currentDayField()}" column in this company DB, retrying with monday`,
    )
    ;({ data, error } = await call('monday'))
  }
  if (error) throw error
  if (!Array.isArray(data)) return []
  return (data as Record<string, unknown>[]).flatMap((row) => {
    const coords = wkbToLatLng(row.location as string | null)
    return coords ? [{ shop: mapShop(row), ...coords }] : []
  })
}
