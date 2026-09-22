// =========================================================================
// MODULE: Order Cancellation — data layer
//
// একটা অর্ডার বাতিল করার নিয়ম রান্নাঘরের টিকিটের অবস্থার উপর নির্ভর করে:
//
//   কিছুই পাঠানো হয়নি / queued  →  cashier নিজেই বাতিল করবে
//   preparing                    →  কেউ পারবে না (রান্না চলছে)
//   ready / served               →  Manager এর অনুমোদন লাগবে
//   বিল হয়ে গেছে (paid)          →  আর বাতিল হবে না
//
// ⚠️ pay-last ক্যাফে: গেস্ট শেষে টাকা দেন, তাই বাতিল সবসময় টাকা নেওয়ার
//    আগেই হয় — refund এর কোনো ধাপ নেই। Manager শুধু বার্তা লেখেন।
//
// নিয়মটা ডেটাবেজেও আছে (order_cancel_stage + orders_guard_status), তাই
// এখানকার হিসাব শুধু UI ঠিক দেখানোর জন্য — নিরাপত্তা ডেটাবেজেই।
// সব SQL supabase/patches/supabase_order_cancellations.sql এ।
// =========================================================================
import { supabase } from '../shared/lib/supabase'
import { KITCHEN_STATUS } from '../kitchen/kitchenService'
import { ORDER_STATUS } from './orderService'

export const CANCEL_STAGE = {
  FREE: 'free',        // cashier নিজেই পারবে
  LOCKED: 'locked',    // রান্না চলছে — কেউ পারবে না
  REQUEST: 'request',  // Manager এর অনুমোদন লাগবে
  SETTLED: 'settled',  // বিল হয়ে গেছে — আর বাতিল হবে না
  CLOSED: 'closed',    // আগেই বাতিল হয়ে গেছে
}

export const REQUEST_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
}

export class CancellationSchemaMissingError extends Error {
  constructor() {
    super('Cancellation tables are not installed in Supabase yet.')
    this.name = 'CancellationSchemaMissingError'
  }
}

const unwrap = ({ data, error }) => {
  if (!error) return data
  if (['PGRST205', 'PGRST202', '42P01', '42703'].includes(error.code)) {
    throw new CancellationSchemaMissingError()
  }
  throw new Error(error.message || 'Could not reach the cancellation desk.')
}

/**
 * order + তার item গুলো দেখে কোন ধাপে আছে বলে দেয়।
 * ডেটাবেজের order_cancel_stage() ফাংশনের হুবহু একই নিয়ম।
 *
 * @param order      orders row (status লাগবে)
 * @param orderItems order_items rows (sent_at, kitchen_status লাগবে)
 */
export const resolveCancelStage = (order, orderItems = []) => {
  if (!order) return CANCEL_STAGE.CLOSED
  if (order.status === ORDER_STATUS.CANCELLED) return CANCEL_STAGE.CLOSED

  // টাকা নেওয়া হয়ে গেছে — pay-last ক্যাফেতে এটাই শেষ ধাপ
  if (order.status === ORDER_STATUS.PAID) return CANCEL_STAGE.SETTLED

  const sent = (orderItems || []).filter((i) => i.sent_at)

  // রান্না শুরু হয়ে গেছে — কাঁচামাল খরচ হয়ে গেছে, এখন থামানো যাবে না
  if (sent.some((i) => i.kitchen_status === KITCHEN_STATUS.PREPARING)) {
    return CANCEL_STAGE.LOCKED
  }

  const reachedGuest = sent.some(
    (i) =>
      i.kitchen_status === KITCHEN_STATUS.READY ||
      i.kitchen_status === KITCHEN_STATUS.SERVED
  )

  if (reachedGuest) return CANCEL_STAGE.REQUEST

  return CANCEL_STAGE.FREE
}

/** প্রতিটা ধাপে cashier কে কী বার্তা দেখানো হবে */
export const STAGE_MESSAGE = {
  [CANCEL_STAGE.FREE]:
    'Nothing has reached the guest yet, so you can cancel this order yourself.',
  [CANCEL_STAGE.LOCKED]:
    'The kitchen has started cooking this order. It cannot be cancelled until the ticket is marked Ready.',
  [CANCEL_STAGE.REQUEST]:
    'This order has already reached the guest, so a Manager has to approve the cancellation.',
  [CANCEL_STAGE.SETTLED]:
    'The bill is already settled, so this order can no longer be cancelled.',
  [CANCEL_STAGE.CLOSED]: 'This order is already cancelled.',
}

/** cashier → Manager: বাতিলের অনুরোধ পাঠানো */
export const requestCancellation = async (orderId, reason) =>
  unwrap(
    await supabase.rpc('request_order_cancellation', {
      p_order_id: orderId,
      p_reason: reason,
    })
  )

const SELECT = `
  request_id, order_id, reason, stage, status,
  manager_message, requested_by, reviewed_by, reviewed_at, created_at,
  orders (
    order_number, token_number, order_type, status, created_at,
    restaurant_tables ( table_number ),
    order_items ( quantity, unit_price, subtotal, menu_items ( name ) )
  )
`

/** একটা row কে UI এর জন্য সহজ আকারে সাজানো */
const shape = (row, staffById = {}) => {
  const order = row.orders || {}
  const items = order.order_items || []

  return {
    id: row.request_id,
    orderId: row.order_id,
    orderNumber: order.order_number ?? null,
    token: order.token_number ?? null,
    orderType: order.order_type || 'dine-in',
    tableNumber: order.restaurant_tables?.table_number ?? null,
    placedAt: order.created_at || row.created_at,

    reason: row.reason,
    stage: row.stage,
    status: row.status,
    requestedAt: row.created_at,
    requestedBy: staffById[row.requested_by] || 'Unknown',

    managerMessage: row.manager_message || '',
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by ? staffById[row.reviewed_by] || 'Manager' : null,

    // অর্ডারটার মোট দাম — Manager কে প্রেক্ষাপট বোঝানোর জন্য
    itemTotal: items.reduce((sum, i) => sum + (Number(i.subtotal) || 0), 0),
    items: items.map((i) => ({
      name: i.menu_items?.name || 'Deleted item',
      quantity: Number(i.quantity) || 0,
      subtotal: Number(i.subtotal) || 0,
    })),
  }
}

/**
 * Manager এর পর্দার জন্য সব অনুরোধ।
 * নাম গুলো profiles থেকে আলাদা করে আনা হয় — order_cancellation_requests
 * এ profiles এর দুটো FK আছে, একটা join এ দুটোই আনা যায় না।
 */
export const fetchCancellationRequests = async (statusFilter = null) => {
  let query = supabase
    .from('order_cancellation_requests')
    .select(SELECT)
    .order('created_at', { ascending: false })

  if (statusFilter) query = query.eq('status', statusFilter)

  const rows = unwrap(await query) || []

  const ids = [
    ...new Set(rows.flatMap((r) => [r.requested_by, r.reviewed_by]).filter(Boolean)),
  ]

  const staffById = {}
  if (ids.length) {
    const { data: people } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', ids)

    ;(people || []).forEach((p) => {
      staffById[p.id] = p.full_name || p.email || 'Unknown'
    })
  }

  return rows.map((r) => shape(r, staffById))
}

/** একটা অর্ডারের সর্বশেষ অনুরোধ — cashier কে অবস্থা দেখানোর জন্য */
export const fetchRequestForOrder = async (orderId) => {
  const rows = unwrap(
    await supabase
      .from('order_cancellation_requests')
      .select('request_id, status, reason, manager_message, created_at, reviewed_at')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1)
  )

  return rows?.[0] || null
}

/** Manager এর সিদ্ধান্ত — বার্তা বাধ্যতামূলক */
export const resolveCancellation = async (requestId, { approve, message }) =>
  unwrap(
    await supabase.rpc('resolve_order_cancellation', {
      p_request_id: requestId,
      p_approve: approve,
      p_message: message,
    })
  )
