import { DynamicSupabaseService } from '../auth/dynamicSupabaseService'
import { mapRow, type MainOrderWithShop } from './types'

const TABLE = 'main_orders_with_shop'
const supabase = () => DynamicSupabaseService.instance.currentClient

export interface CreateOrderCartItem {
  shopId: number
  codeCompany: string | null
  productId: number
  codeProduct: string | null
  price: number
  quantity: number
  productName: string
  codePriceType: string | null
  totalPrice: number
}

export interface CreateOrderResult {
  success: boolean
  orderNumber?: number
  error?: string
}

// Ports order_widget.dart's live "Оформить заказ" handler: calls the
// create_order Postgres RPC (SupabaseGroup.rpcCreateOrderCall) with the cart
// items for this shop, a comment, and the current agent's id. The RPC's SQL
// isn't in this repo (server-side function on each company's Supabase
// project) — this ports the client call and response shape only, confirmed
// live against a real company project (returns {success, error, errorCode}
// on failure; {success, orderNumber} is inferred from order_widget.dart's
// getJsonField($.orderNumber) read on success, unverified against a real
// success response since submitting a live test order would create real data).
export async function createOrder(
  shopId: number,
  cartItems: CreateOrderCartItem[],
  comment: string,
  agentId: string,
): Promise<CreateOrderResult> {
  const { data, error } = await supabase().rpc('create_order', {
    p_shop_id: shopId,
    p_cart_items: cartItems.map((item) => ({
      shop_id: item.shopId,
      code_company: item.codeCompany,
      product_id: item.productId,
      code_product: item.codeProduct,
      price: item.price,
      quantity: item.quantity,
      product_name: item.productName,
      code_price_type: item.codePriceType,
      total_price: item.totalPrice,
    })),
    p_comment: comment,
    p_agent_id: agentId,
  })

  if (error) return { success: false, error: error.message }

  const result = data as { success?: boolean; orderNumber?: number; error?: string } | null
  return {
    success: Boolean(result?.success),
    orderNumber: result?.orderNumber,
    error: result?.error,
  }
}

/**
 * Ports the AllOrdersBloc._onLoadAllOrders query:
 * admins (userRoleId === 1) see all orders for the date; agents see only their own.
 */
export async function loadOrders(
  selectedDateDmy: string,
  userRoleId: number,
  userId: string | null,
): Promise<MainOrderWithShop[]> {
  let query = supabase().from(TABLE).select('*').eq('created_at_dmy', selectedDateDmy)

  if (userRoleId !== 1) {
    query = query.eq('order_agent', userId ?? '')
  }

  const { data, error } = await query.order('main_order_created_at')
  if (error) throw error
  return (data ?? []).map(mapRow)
}

/**
 * Ports lib/custom_code/actions/search_main_orders_with_shop.dart:
 * numeric search terms match order number / total price (eq) or shop name (ilike);
 * non-numeric terms only match shop name (ilike). Date and agent are exact filters.
 */
export async function searchOrders(
  searchQuery: string,
  selectedDateDmy: string,
  orderAgentId: string,
): Promise<MainOrderWithShop[]> {
  let query = supabase().from(TABLE).select('*')

  const q = searchQuery.trim()
  if (q) {
    const qInt = Number.parseInt(q, 10)
    if (!Number.isNaN(qInt) && String(qInt) === q) {
      query = query.or(
        `main_order_number.eq.${qInt},order_total_price.eq.${qInt},shop_name.ilike.%${q}%`,
      )
    } else {
      query = query.ilike('shop_name', `%${q}%`)
    }
  }

  if (selectedDateDmy.trim()) {
    query = query.eq('created_at_dmy', selectedDateDmy.trim())
  }
  if (orderAgentId.trim()) {
    query = query.eq('order_agent', orderAgentId.trim())
  }

  const { data, error } = await query
  if (error) {
    console.error('searchOrders error:', error)
    return []
  }
  return (data ?? []).map(mapRow)
}

// Ports AllOrdersBloc/ShopOrdersBloc load-by-shop query: MainOrdersWithShopTable().queryRows(
// queryFn: (q) => q.eqOrNull('shop_id', shopId).order('main_order_created_at'))
export async function loadOrdersForShop(shopId: number): Promise<MainOrderWithShop[]> {
  const { data, error } = await supabase()
    .from(TABLE)
    .select('*')
    .eq('shop_id', shopId)
    .order('main_order_created_at')
  if (error) throw error
  return (data ?? []).map(mapRow)
}

/**
 * Ports lib/custom_code/actions/search_main_orders_with_shop_copy.dart: same
 * numeric-vs-text search semantics as searchOrders, but filtered by shop_id
 * instead of date/agent.
 */
export async function searchOrdersForShop(
  searchQuery: string,
  shopId: number,
): Promise<MainOrderWithShop[]> {
  let query = supabase().from(TABLE).select('*')

  const q = searchQuery.trim()
  if (q) {
    const qInt = Number.parseInt(q, 10)
    if (!Number.isNaN(qInt) && String(qInt) === q) {
      query = query.or(
        `main_order_number.eq.${qInt},order_total_price.eq.${qInt},shop_name.ilike.%${q}%`,
      )
    } else {
      query = query.ilike('shop_name', `%${q}%`)
    }
  }

  query = query.eq('shop_id', shopId)

  const { data, error } = await query
  if (error) {
    console.error('searchOrdersForShop error:', error)
    return []
  }
  return (data ?? []).map(mapRow)
}

export interface OrderLineItem {
  productName: string | null
  quantity: number
  price: number
  totalPrice: number
}

// Ports order_details_widget.dart's FutureBuilder: OrdersTable().queryRows(
// q.eqOrNull('order_number', mainOrderNumber)) — the per-company `orders`
// table holds one row per line item of a main order.
export async function fetchOrderItems(orderNumber: number): Promise<OrderLineItem[]> {
  const { data, error } = await supabase()
    .from('orders')
    .select('order_product_name, order_quantity, order_price, order_total_price')
    .eq('order_number', orderNumber)
  if (error) throw error
  return (data ?? []).map((row) => ({
    productName: (row.order_product_name as string | null) ?? null,
    quantity: Number(row.order_quantity ?? 0),
    price: Number(row.order_price ?? 0),
    totalPrice: Number(row.order_total_price ?? 0),
  }))
}
