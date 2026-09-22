// =========================================================================
// MODULE: Orders — Register (read-only) data layer
// Owner / Manager শুধু দেখবেন: কে, কী, কখন, কোন টেবিলে, কোন cashier নিয়েছে।
//
// ⚠️ এই ফাইলটা কিছুই লেখে না — শুধু পড়ে। অর্ডার নেওয়ার সব কাজ
//    orderService.js এ (Person 2 এর), সেখানে হাত দেওয়া হয়নি।
// =========================================================================
import { supabase } from '../shared/lib/supabase'

const BASE = `
  order_id, order_number, order_type, status, note, created_at,
  restaurant_tables ( table_number ),
  profiles ( full_name, email ),
  order_items ( order_item_id, quantity, unit_price, subtotal, note, menu_items ( name ) ),
  bills ( total_amount, payment_method, paid_at )
`

// token_number কলামটা supabase_order_flow.sql চালানোর পর আসে।
// না থাকলেও পেজ চলবে — শুধু টোকেন দেখাবে না।
let tokenSupported = true
export const isTokenSupported = () => tokenSupported

export class OrdersSchemaMissingError extends Error {
  constructor() {
    super('Order tables are not installed in Supabase yet.')
    this.name = 'OrdersSchemaMissingError'
  }
}

const unwrap = ({ data, error }) => {
  if (!error) return data
  if (['PGRST205', '42P01', 'PGRST202'].includes(error.code)) throw new OrdersSchemaMissingError()
  if (error.code === '42501') throw new Error('You do not have permission to view orders.')
  throw new Error(error.message || 'Could not load orders.')
}

/** সব অর্ডার, নতুনগুলো আগে। আইটেম, টেবিল, cashier ও বিল একসাথে। */
export const fetchOrderRegister = async ({ limit = 200 } = {}) => {
  const run = (columns) =>
    supabase.from('orders').select(columns).order('created_at', { ascending: false }).limit(limit)

  let result
  if (tokenSupported) {
    result = await run(`token_number, ${BASE}`)
    if (result.error?.code === '42703') {
      tokenSupported = false
      result = await run(BASE)
    }
  } else {
    result = await run(BASE)
  }

  return (unwrap(result) || []).map((row) => {
    const items = row.order_items || []
    const bill = (row.bills || [])[0] || null

    return {
      orderId: row.order_id,
      orderNumber: row.order_number,
      token: row.token_number ?? null,
      type: row.order_type,
      status: row.status,
      note: row.note,
      createdAt: row.created_at,
      tableNumber: row.restaurant_tables?.table_number ?? null,
      // কোন cashier অর্ডারটি নিয়েছে
      takenBy: row.profiles?.full_name || row.profiles?.email || 'Unknown',
      items: items.map((i) => ({
        id: i.order_item_id,
        name: i.menu_items?.name || 'Deleted item',
        quantity: i.quantity,
        unitPrice: Number(i.unit_price),
        subtotal: Number(i.subtotal),
        note: i.note,
      })),
      itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
      // বিল হয়ে থাকলে আসল টাকা, নাহলে আইটেমের যোগফল (VAT ছাড়া)
      amount: bill ? Number(bill.total_amount) : items.reduce((s, i) => s + Number(i.subtotal), 0),
      isBilled: Boolean(bill),
      paymentMethod: bill?.payment_method || null,
      paidAt: bill?.paid_at || null,
    }
  })
}

export const formatTaka = (value) =>
  `৳ ${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

/** "20 Sep 2026, 12:27 AM" (Asia/Dhaka) */
export const formatDateTime = (value) => {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-GB', {
    timeZone: 'Asia/Dhaka',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** "5 min ago" ধরনের ছোট লেখা */
export const formatRelative = (value) => {
  if (!value) return ''
  const diff = Date.now() - new Date(value).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hr ago`
  return `${Math.floor(hours / 24)} d ago`
}

/** Asia/Dhaka অনুযায়ী আজকের তারিখ কিনা */
export const isToday = (value) => {
  if (!value) return false
  const fmt = (d) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' })
  return fmt(new Date(value)) === fmt(new Date())
}
