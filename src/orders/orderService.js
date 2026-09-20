// =========================================================================
// MODULE: Orders — Data layer
// Owner: Person 2 (Oarisa)
//
// This file owns ONLY orders / order_items. Menu browsing (categories,
// items) is Person 3's territory — import fetchCategories/fetchMenuItems
// straight from '../menu/menuService' wherever this page needs the menu,
// don't re-implement menu reads here. Keeps one source of truth for menu
// shape, so if Person 3 changes a column, this page doesn't quietly drift.
//
// Confirmed from menuService.js: shared client lives at
// '../shared/lib/supabase', and menu_items.status is 'available'
// 'unavailable' (not 'active' — earlier guess, now corrected).
//
// These values intentionally match supabase_pos_schema.sql exactly.
// The database has no separate preparing/ready states, so the frontend must
// not invent values that the orders.status CHECK constraint will reject.
// =========================================================================

import { supabase } from '../shared/lib/supabase'

export const ORDER_STATUS = {
  OPEN: 'open',             // cashier is building or can still edit the order
  PAID: 'paid',             // customer has paid; waiting to be served
  SERVED: 'served',         // this specific order is completed permanently
  CANCELLED: 'cancelled',
}

// Find the current unfinished order for a table.
//
// IMPORTANT:
// SERVED orders are completed and must NOT be reused.
// A table can have many served orders over time, but only one current
// unfinished order should be continued.
export async function getOpenOrderForTable(tableId) {
  const { data, error } = await supabase
    .from('orders')
    .select(
      'order_id, order_number, table_id, order_type, status, note, created_at'
    )
    .eq('table_id', tableId)
    .in('status', [ORDER_STATUS.OPEN, ORDER_STATUS.PAID])
    .maybeSingle()

  if (error) throw error
  return data
}

// FR-ORD-01: create a new order (Dine-in / Takeaway / Delivery)
export async function createOrder({ tableId, orderType, userId }) {
  // Do not send user_id when it is missing: the database default uses
  // auth.uid(), preventing a null/undefined UUID from being inserted.
  const orderPayload = {
    table_id: tableId,
    order_type: orderType,
    status: ORDER_STATUS.OPEN,
  }

  if (userId) orderPayload.user_id = userId

  const { data, error } = await supabase
    .from('orders')
    .insert(orderPayload)
    .select()
    .single()

  if (error) throw error
  return data
}

// Customer instructions belong to the parent order (orders.note), not to a
// menu line. Empty notes are stored as NULL so the database stays clean.
export async function updateOrderNote(orderId, note) {
  const { data, error } = await supabase
    .from('orders')
    .update({ note: note?.trim() || null })
    .eq('order_id', orderId)
    .select('order_id, note')
    .single()

  if (error) throw error
  return data
}

// Item-specific customer instructions belong in order_items.note. Keep this
// separate from orders.note so "more ice" can apply only to one drink.
export async function updateOrderItemNote(orderItemId, note) {
  const { data, error } = await supabase
    .from('order_items')
    .update({ note: note?.trim() || null })
    .eq('order_item_id', orderItemId)
    .select('order_item_id, note')
    .single()

  if (error) throw error
  return data
}

export async function getOrderItems(orderId) {
  const { data, error } = await supabase
    .from('order_items')
    .select(
      'order_item_id, menu_item_id, quantity, unit_price, subtotal, note'
    )
    .eq('order_id', orderId)

  if (error) throw error
  return data
}

// FR-ORD-02 / FR-ORD-03: add a menu item line, or merge into an existing one
export async function addOrderItem(
  orderId,
  { menuItemId, quantity, unitPrice, note }
) {
  const { data, error } = await supabase
    .from('order_items')
    .insert({
      order_id: orderId,
      menu_item_id: menuItemId,
      quantity,
      unit_price: unitPrice,
      note: note || null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// FR-ORD-04: edit quantity before the order is sent to the kitchen
export async function updateOrderItemQuantity(
  orderItemId,
  quantity,
  unitPrice
) {
  const { data, error } = await supabase
    .from('order_items')
    // subtotal is GENERATED ALWAYS in the schema; changing quantity makes
    // PostgreSQL recalculate it automatically.
    .update({ quantity })
    .eq('order_item_id', orderItemId)
    .select()
    .single()

  if (error) throw error
  return data
}

// FR-ORD-04 / FR-ORD-08: remove/void a single line before it's finalized
export async function removeOrderItem(orderItemId) {
  const { error } = await supabase
    .from('order_items')
    .delete()
    .eq('order_item_id', orderItemId)

  if (error) throw error
}

// FR-ORD-08: cancel an unfinished order.
// Allowed from OPEN (before payment) or PAID (paid, not yet served).
// SERVED / already-CANCELLED orders cannot be cancelled.
// NOTE: refund of a PAID order is handled by Pritam (Billing).
export async function cancelOrder(orderId) {
  const { data, error } = await supabase
    .from('orders')
    .update({ status: ORDER_STATUS.CANCELLED })
    .eq('order_id', orderId)
    .in('status', [ORDER_STATUS.OPEN, ORDER_STATUS.PAID])
    .select('order_id, status')
    .single()

  if (error) throw error
  return data
}

// Change a PAID order to SERVED.
//
// SERVED means this particular order is completed permanently.
// The table itself is NOT changed here.
export async function markOrderServed(orderId) {
  const { data, error } = await supabase
    .from('orders')
    .update({ status: ORDER_STATUS.SERVED })
    .eq('order_id', orderId)
    .eq('status', ORDER_STATUS.PAID)
    .select()
    .single()

  if (error) throw error
  return data
}

// FR-ORD-09: orders to show on the active-order tracker.
//
// Only unfinished orders are active:
// OPEN = still being worked on
// PAID = paid but not yet served
//
// SERVED orders are intentionally excluded because they are completed.
export async function getActiveOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select(
      'order_id, order_number, table_id, order_type, status, created_at'
    )
    .in('status', [ORDER_STATUS.OPEN, ORDER_STATUS.PAID])
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

// Orders of ALL statuses (open, paid, served, cancelled), newest first.
// Used only by the Orders panel so it shows each order's live status.
// Do not use this to find a table's current order (use getActiveOrders).
export async function getRecentOrders(limit = 30) {
  const { data, error } = await supabase
    .from('orders')
    .select(
      'order_id, order_number, table_id, order_type, status, created_at'
    )
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

// Dine In / Take Away toggle in the order header.
// the two order types this cafe actually supports.
export async function updateOrderType(orderId, orderType) {
  const { data, error } = await supabase
    .from('orders')
    .update({ order_type: orderType })
    .eq('order_id', orderId)
    .select('order_id, order_type')
    .single()

  if (error) throw error
  return data
}