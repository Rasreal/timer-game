// Mirrors lib/backend/supabase/database/tables/main_orders_with_shop.dart
export interface MainOrderWithShop {
  mainOrderId: number
  mainOrderCreatedAt: string
  mainOrderNumber: number
  shopId: number
  orderTotalPrice: number
  orderStatus: string
  shopName: string
  streetShop: string
  houseShop: string
  createdAtDmy: string
  orderComment: string | null
  orderAgent: string
}

export function mapRow(row: Record<string, unknown>): MainOrderWithShop {
  return {
    mainOrderId: row.main_order_id as number,
    mainOrderCreatedAt: row.main_order_created_at as string,
    mainOrderNumber: row.main_order_number as number,
    shopId: row.shop_id as number,
    orderTotalPrice: row.order_total_price as number,
    orderStatus: row.order_status as string,
    shopName: row.shop_name as string,
    streetShop: row.street_shop as string,
    houseShop: row.house_shop as string,
    createdAtDmy: row.created_at_dmy as string,
    orderComment: (row.order_comment as string | null) ?? null,
    orderAgent: row.order_agent as string,
  }
}
