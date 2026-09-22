// =========================================================================
// MODULE: Kitchen Display — data layer
//
// রান্নাঘরের পর্দা "টিকিট" দেখায়। একটা টিকিট = এক অর্ডারের এক রাউন্ড
// (cashier একবার "Send to kitchen" চাপলে যতগুলো আইটেম গেল)।
//
// টিকিটের পথ:  queued → preparing → ready → served
// সব বদল হয় set_round_kitchen_status() RPC দিয়ে, যাতে নিয়ম ডেটাবেজেই থাকে।
// =========================================================================
import { supabase } from '../shared/lib/supabase'

export const KITCHEN_STATUS = {
  QUEUED: 'queued',
  PREPARING: 'preparing',
  READY: 'ready',
  SERVED: 'served',
}

// মেনুতে prep time না বসানো থাকলে ধরে নেওয়া গড় সময়
const DEFAULT_PREP_MIN = 4

export class KitchenSchemaMissingError extends Error {
  constructor() {
    super('Kitchen columns are not installed in Supabase yet.')
    this.name = 'KitchenSchemaMissingError'
  }
}

const unwrap = ({ data, error }) => {
  if (!error) return data
  if (['PGRST205', '42P01', 'PGRST202', '42703'].includes(error.code)) {
    throw new KitchenSchemaMissingError()
  }
  if (error.code === '42501') throw new Error(error.message)
  throw new Error(error.message || 'Could not talk to the kitchen board.')
}

/**
 * এখনো হাতে দেওয়া হয়নি এমন সব টিকিট (queued / preparing / ready)।
 * order_items সারি গুলোকে (order, round) ধরে টিকিটে জড়ো করা হয়।
 */
export const fetchKitchenTickets = async () => {
  const rows = unwrap(
    await supabase
      .from('order_items')
      .select(`
        order_item_id, order_id, round_no, quantity, note, sent_at, kitchen_status,
        menu_items ( name, prep_time_minutes ),
        orders ( token_number, order_type, note, restaurant_tables ( table_number ) )
      `)
      .not('sent_at', 'is', null)
      .in('kitchen_status', [KITCHEN_STATUS.QUEUED, KITCHEN_STATUS.PREPARING, KITCHEN_STATUS.READY])
      .order('sent_at', { ascending: true })
  )

  const tickets = new Map()

  for (const row of rows || []) {
    const key = `${row.order_id}::${row.round_no}`

    if (!tickets.has(key)) {
      tickets.set(key, {
        key,
        orderId: row.order_id,
        round: row.round_no,
        status: row.kitchen_status,
        sentAt: row.sent_at,
        token: row.orders?.token_number ?? null,
        orderType: row.orders?.order_type || 'dine-in',
        tableNumber: row.orders?.restaurant_tables?.table_number ?? null,
        orderNote: row.orders?.note || null,
        items: [],
        estMinutes: 0,
      })
    }

    const ticket = tickets.get(key)

    ticket.items.push({
      id: row.order_item_id,
      name: row.menu_items?.name || 'Unknown item',
      quantity: row.quantity,
      note: row.note,
    })

    // আনুমানিক সময় = সব আইটেমের (বানানোর সময় × সংখ্যা) যোগফল
    const prep = Number(row.menu_items?.prep_time_minutes)
    ticket.estMinutes += (Number.isFinite(prep) && prep > 0 ? prep : DEFAULT_PREP_MIN) * row.quantity
  }

  // পুরনো টিকিট আগে — রাঁধুনি যেন সবচেয়ে বেশি অপেক্ষা করাটা আগে দেখেন
  return [...tickets.values()].sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt))
}

export const setTicketStatus = async (orderId, roundNo, status) =>
  unwrap(
    await supabase.rpc('set_round_kitchen_status', {
      p_order_id: orderId,
      p_round_no: roundNo,
      p_status: status,
    })
  )

/** কত মিনিট ধরে অপেক্ষা করছে */
export const waitingMinutes = (sentAt) => {
  if (!sentAt) return 0
  return Math.max(0, Math.floor((Date.now() - new Date(sentAt).getTime()) / 60000))
}

export const formatClock = (value) => {
  if (!value) return '—'
  return new Date(value).toLocaleTimeString('en-US', {
    timeZone: 'Asia/Dhaka',
    hour: '2-digit',
    minute: '2-digit',
  })
}
