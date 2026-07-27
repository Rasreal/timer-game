import { DEMO_SHOPS } from '../main/demoShops'
import type { ShopMapPin } from './api'

// Demo-user fallback pin dataset for MapPage — real users get live pins from
// the get_shops_in_bbox RPC (see features/map/api.ts), same split as every
// other data source in this pilot (search_shops.dart's isDemoUser branch).
// Each pin carries a full DEMO_SHOPS row so tapping it opens the same
// ShopActionSheet as a real shop would.
const CENTER = { lat: 43.222, lng: 76.8512 }

export const MAP_CENTER = CENTER

// 9998/9997 sit ~110m apart: inside one 45px cluster radius at the initial
// zoom 14 (my_map.dart's _zoom), splitting into individual pins around zoom
// 16. 9999 is ~1km out and only merges with the others when zoomed far away.
const COORDS: Record<number, { lat: number; lng: number }> = {
  9999: { lat: CENTER.lat + 0.006, lng: CENTER.lng - 0.004 },
  9998: { lat: CENTER.lat - 0.0035, lng: CENTER.lng + 0.0042 },
  9997: { lat: CENTER.lat - 0.0043, lng: CENTER.lng + 0.005 },
}

export const DEMO_PINS: ShopMapPin[] = DEMO_SHOPS.filter((s) => COORDS[s.id]).map((s) => ({
  shop: s,
  ...COORDS[s.id],
}))
