// =========================================================================
// MODULE OWNER: Person 4 — Billing (data layer)
//
// বিল তৈরির সব হিসাব ডেটাবেজেই হয় (bills_before_write trigger):
//   subtotal → discount → service charge → VAT → total
// এখানকার হিসাবটা শুধু পর্দায় দেখানোর জন্য; সেভ হওয়া মান সব সময়
// ডেটাবেজ থেকে ফেরত আসা bill row থেকেই নেওয়া হয়।
// =========================================================================
import { supabase } from '../shared/lib/supabase'

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bkash', label: 'bKash' },
  { value: 'nagad', label: 'Nagad' },
]

export const VAT_PERCENT = 7.5

const unwrap = ({ data, error }) => {
  if (!error) return data
  if (error.code === '42501') throw new Error(error.message)
  throw new Error(error.message || 'Something went wrong while billing.')
}

/** বিল করার জন্য দরকারি সব তথ্য এক ডাকে */
export const fetchOrderForBilling = async (orderId) => {
  const row = unwrap(
    await supabase
      .from('orders')
      .select(`
        order_id, order_number, token_number, order_type, status, note, created_at,
        restaurant_tables ( table_number ),
        order_items (
          order_item_id, quantity, unit_price, subtotal, note, sent_at, kitchen_status,
          menu_items ( name )
        ),
        bills ( bill_id, subtotal, discount_percent, discount_amount,
                service_charge_percent, service_charge_amount,
                vat_percent, vat_amount, total_amount, payment_method, paid_at )
      `)
      .eq('order_id', orderId)
      .maybeSingle()
  )

  if (!row) throw new Error('That order could not be found.')

  const items = (row.order_items || []).map((i) => ({
    id: i.order_item_id,
    name: i.menu_items?.name || 'Item',
    quantity: i.quantity,
    unitPrice: Number(i.unit_price),
    subtotal: Number(i.subtotal),
    note: i.note,
    sent: Boolean(i.sent_at),
  }))

  return {
    orderId: row.order_id,
    orderNumber: row.order_number,
    token: row.token_number ?? null,
    type: row.order_type,
    status: row.status,
    note: row.note,
    createdAt: row.created_at,
    tableNumber: row.restaurant_tables?.table_number ?? null,
    items,
    itemCount: items.reduce((n, i) => n + i.quantity, 0),
    pendingCount: items.filter((i) => !i.sent).length,
    subtotal: items.reduce((n, i) => n + i.subtotal, 0),
    bill: (row.bills || [])[0] || null,
  }
}

/** বিল তৈরি — সফল হলে ডেটাবেজের হিসাব করা bill row ফেরত আসে */
export const createBill = async ({
  orderId,
  paymentMethod,
  discountPercent = 0,
  serviceChargePercent = 0,
}) =>
  unwrap(
    await supabase
      .from('bills')
      .insert({
        order_id: orderId,
        payment_method: paymentMethod,
        discount_percent: Number(discountPercent) || 0,
        service_charge_percent: Number(serviceChargePercent) || 0,
      })
      .select()
      .single()
  )

/** পর্দায় দেখানোর জন্য একই হিসাব (ডেটাবেজের সূত্র হুবহু) */
export const previewTotals = (subtotal, discountPercent = 0, serviceChargePercent = 0) => {
  const round2 = (n) => Math.round(n * 100) / 100
  const discount = round2((subtotal * (Number(discountPercent) || 0)) / 100)
  const afterDiscount = subtotal - discount
  const service = round2((afterDiscount * (Number(serviceChargePercent) || 0)) / 100)
  const vat = round2(((afterDiscount + service) * VAT_PERCENT) / 100)
  return { discount, afterDiscount, service, vat, total: afterDiscount + service + vat }
}

export const money = (value) =>
  Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const receiptDate = (value) => {
  const d = value ? new Date(value) : new Date()
  return d
    .toLocaleString('en-GB', {
      timeZone: 'Asia/Dhaka',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    .toUpperCase()
}
