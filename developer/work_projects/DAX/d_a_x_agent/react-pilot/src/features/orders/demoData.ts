import { formatDMY, isSameDay } from '../../lib/dateFormat'
import { DEMO_USER_PHONE } from '../auth/authStore'
import type { MainOrderWithShop } from './types'

export { DEMO_USER_PHONE }

// Ports AllOrdersBloc._getDummyOrders: only shows orders for "today", demo mode only.
// orderStatus uses the real app's actual status codes ('1' = accepted/Принято,
// '0' = processing/В обработке — see OrderCard.tsx's isAccepted/isProcessing
// checks) rather than descriptive strings, since only those two exact values
// render a status badge.
export function getDummyOrders(selectedDate: Date): MainOrderWithShop[] {
  const now = new Date()
  if (!isSameDay(now, selectedDate)) return []

  const dateString = formatDMY(selectedDate)
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600_000).toISOString()

  const raw = [
    {
      mainOrderId: 99901,
      mainOrderCreatedAt: hoursAgo(2),
      mainOrderNumber: 12345,
      shopId: 9999,
      orderTotalPrice: 45600,
      orderStatus: '0',
      shopName: 'Demo Supermarket Plaza',
      streetShop: 'Абая проспект',
      houseShop: '150',
      createdAtDmy: dateString,
      orderComment: 'Пожалуйста, привезите до 14:00',
      orderAgent: DEMO_USER_PHONE,
    },
    {
      mainOrderId: 99902,
      mainOrderCreatedAt: hoursAgo(4),
      mainOrderNumber: 12344,
      shopId: 9998,
      orderTotalPrice: 23400,
      orderStatus: '1',
      shopName: 'Demo Магазин "У дома"',
      streetShop: 'Сатпаева улица',
      houseShop: '90А',
      createdAtDmy: dateString,
      orderComment: 'Срочный заказ',
      orderAgent: DEMO_USER_PHONE,
    },
    {
      mainOrderId: 99903,
      mainOrderCreatedAt: hoursAgo(6),
      mainOrderNumber: 12343,
      shopId: 9997,
      orderTotalPrice: 78900,
      orderStatus: '1',
      shopName: 'Demo Market Freshmart',
      streetShop: 'Розыбакиева улица',
      houseShop: '247',
      createdAtDmy: dateString,
      orderComment: null,
      orderAgent: DEMO_USER_PHONE,
    },
    {
      mainOrderId: 99904,
      mainOrderCreatedAt: hoursAgo(8),
      mainOrderNumber: 12342,
      shopId: 9996,
      orderTotalPrice: 15200,
      orderStatus: '0',
      shopName: 'Demo Продукты 24/7',
      streetShop: 'Аль-Фараби проспект',
      houseShop: '77',
      createdAtDmy: dateString,
      orderComment: 'Позвоните по прибытии',
      orderAgent: DEMO_USER_PHONE,
    },
    {
      mainOrderId: 99905,
      mainOrderCreatedAt: hoursAgo(10),
      mainOrderNumber: 12341,
      shopId: 9995,
      orderTotalPrice: 56700,
      orderStatus: '1',
      shopName: 'Demo Гастроном "Центральный"',
      streetShop: 'Достык проспект',
      houseShop: '200',
      createdAtDmy: dateString,
      orderComment: 'Большой заказ, подготовить заранее',
      orderAgent: DEMO_USER_PHONE,
    },
  ]

  return raw
}

export function getDummyOrdersForShop(shopId: number): MainOrderWithShop[] {
  return getDummyOrders(new Date()).filter((o) => o.shopId === shopId)
}

export function searchDummyOrders(orders: MainOrderWithShop[], query: string): MainOrderWithShop[] {
  const q = query.toLowerCase()
  return orders.filter((order) => {
    const shopName = order.shopName?.toLowerCase() ?? ''
    const orderNumber = order.mainOrderNumber?.toString() ?? ''
    const address = `${order.streetShop} ${order.houseShop}`.toLowerCase()
    return shopName.includes(q) || orderNumber.includes(q) || address.includes(q)
  })
}
