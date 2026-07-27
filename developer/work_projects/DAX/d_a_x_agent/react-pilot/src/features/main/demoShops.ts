import { DEMO_SHOP } from '../favourites/demoData'
import type { Shop } from '../favourites/types'

// Standalone demo shop list for the main dashboard, mirroring the single demo
// shop already used by favourites/orders/shop_orders in this pilot (real shop
// data lives in the per-company DB, unreachable from the shared client here).
// distanceMeters/codeCompany/categoryName are visual-only additions for the
// redesigned ShopCard (see shop_item_main_widget.dart).
export const DEMO_SHOPS: Shop[] = [
  {
    ...DEMO_SHOP,
    codeShop: 2170,
    streetShop: 'Кабанбай батыра',
    houseShop: '65',
    distanceMeters: 10093400,
    codeCompany: '000002967',
  },
  {
    id: 9998,
    nameShop: 'Demo Магазин "У дома"',
    streetShop: 'Кабанбай батыра',
    houseShop: '92',
    phoneNumberShop: '+7 727 234 5678',
    codeShop: 1945,
    priceTypesCode: ['retail'],
    distanceMeters: 10093700,
    codeCompany: '000001906',
  },
  {
    id: 9997,
    nameShop: 'Demo Market Freshmart',
    streetShop: 'Северное побережье',
    houseShop: '35',
    phoneNumberShop: null,
    codeShop: 2044,
    priceTypesCode: [],
    distanceMeters: 10737700,
    codeCompany: '000001856',
  },
]
