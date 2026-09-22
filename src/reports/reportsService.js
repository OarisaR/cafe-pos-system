// =========================================================================
// MODULE OWNER: Person 1 — Reporting & Profit (data layer)
// Route: /dashboard  (Overview & Reports)
//
// এই ফাইলটা কিছুই লেখে না — শুধু `bills` টেবিল পড়ে আর তার সাথে
// order → order_items → menu_items জোড়া লাগিয়ে হিসাব বানায়।
//
// টাকার ভাগ:
//   subtotal            = আইটেমের দাম যোগফল (VAT ছাড়া)
//   − discount          = ছাড়
//   + service charge    = সার্ভিস চার্জ
//   = net income        ← ক্যাফের নিজের আয়
//   + VAT               = সরকারকে দিতে হবে, তাই এটা আয় নয়
//   = total_amount      ← কাস্টমার যত টাকা দিয়েছে (collected)
//
//   cost   = Σ (quantity × unit_cost)   ← রেসিপি/BOM থেকে আসা কাঁচামালের খরচ
//   profit = net income − cost
//
// ⚠️ বাতিল হওয়া অর্ডার এই হিসাবে আসেই না — pay-last ক্যাফেতে বাতিল সবসময়
//    বিল হওয়ার আগে হয়, তাই ওগুলোর কোনো bills row ই তৈরি হয় না।
// =========================================================================
import { supabase } from '../shared/lib/supabase'

// বাংলাদেশ সব সময় UTC+6, কোনো daylight saving নেই — তাই offset টা fixed.
const DHAKA = 'Asia/Dhaka'
const DHAKA_OFFSET = '+06:00'

export class ReportsSchemaMissingError extends Error {
  constructor() {
    super('Billing tables are not installed in Supabase yet.')
    this.name = 'ReportsSchemaMissingError'
  }
}

const unwrap = ({ data, error }) => {
  if (!error) return data
  if (['PGRST205', '42P01', 'PGRST202'].includes(error.code)) throw new ReportsSchemaMissingError()
  if (error.code === '42501') throw new Error('You do not have permission to view reports.')
  throw new Error(error.message || 'Could not load the report.')
}

// ---------------------------------------------------------------- helpers

/** আজকের তারিখ ঢাকার হিসাবে, "YYYY-MM-DD" */
export const dhakaToday = () => new Date().toLocaleDateString('en-CA', { timeZone: DHAKA })
/** চলতি মাস, "YYYY-MM" */
export const dhakaThisMonth = () => dhakaToday().slice(0, 7)
/** চলতি বছর, "YYYY" */
export const dhakaThisYear = () => dhakaToday().slice(0, 4)

const atDhakaMidnight = (ymd) => new Date(`${ymd}T00:00:00${DHAKA_OFFSET}`)
const addDays = (d, n) => new Date(d.getTime() + n * 86400000)

/** ঢাকার সময় অনুযায়ী একটা মান থেকে তারিখ ও ঘণ্টা বের করা */
const dhakaParts = (value) => {
  const text = new Date(value).toLocaleString('sv-SE', { timeZone: DHAKA }) // "2026-09-21 14:35:07"
  return { ymd: text.slice(0, 10), hour: Number(text.slice(11, 13)) }
}

export const RANGE_TYPES = {
  DAILY: 'daily',
  DATE: 'date',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const prettyDate = (ymd) => {
  const [y, m, d] = ymd.split('-')
  return `${Number(d)} ${MONTH_NAMES[Number(m) - 1]} ${y}`
}

/**
 * ব্যবহারকারীর বাছাই থেকে সময়ের সীমা বানায়।
 * ফেরত দেয়: { fromIso, toIso, label, fileLabel, bucket, buckets[] }
 *   bucket = 'hour' | 'day' | 'month'  → গ্রাফের x-অক্ষ কীসের ভিত্তিতে হবে
 */
export const buildRange = ({ type, date, month, year }) => {
  if (type === RANGE_TYPES.MONTHLY) {
    const ym = month || dhakaThisMonth()
    const [y, m] = ym.split('-').map(Number)
    const start = atDhakaMidnight(`${ym}-01`)
    const nextYear = m === 12 ? y + 1 : y
    const nextMonth = m === 12 ? 1 : m + 1
    const end = atDhakaMidnight(`${nextYear}-${String(nextMonth).padStart(2, '0')}-01`)
    const dayCount = Math.round((end - start) / 86400000)

    return {
      fromIso: start.toISOString(),
      toIso: end.toISOString(),
      label: `${MONTH_NAMES[m - 1]} ${y}`,
      fileLabel: `monthly-${ym}`,
      bucket: 'day',
      buckets: Array.from({ length: dayCount }, (_, i) => ({
        key: `${ym}-${String(i + 1).padStart(2, '0')}`,
        label: String(i + 1),
      })),
    }
  }

  if (type === RANGE_TYPES.YEARLY) {
    const yy = year || dhakaThisYear()
    return {
      fromIso: atDhakaMidnight(`${yy}-01-01`).toISOString(),
      toIso: atDhakaMidnight(`${Number(yy) + 1}-01-01`).toISOString(),
      label: `Year ${yy}`,
      fileLabel: `yearly-${yy}`,
      bucket: 'month',
      buckets: MONTH_NAMES.map((name, i) => ({
        key: `${yy}-${String(i + 1).padStart(2, '0')}`,
        label: name,
      })),
    }
  }

  // DAILY (আজ) আর DATE (নির্দিষ্ট দিন) — দুটোই একদিনের রিপোর্ট
  const ymd = type === RANGE_TYPES.DAILY ? dhakaToday() : date || dhakaToday()
  const start = atDhakaMidnight(ymd)

  return {
    fromIso: start.toISOString(),
    toIso: addDays(start, 1).toISOString(),
    label: type === RANGE_TYPES.DAILY ? `Today · ${prettyDate(ymd)}` : prettyDate(ymd),
    fileLabel: `daily-${ymd}`,
    bucket: 'hour',
    // ক্যাফে সারা রাত খোলা থাকে না, তাই সকাল ৭টা–রাত ১১টা দেখালেই যথেষ্ট
    buckets: Array.from({ length: 17 }, (_, i) => {
      const h = i + 7
      return { key: String(h).padStart(2, '0'), label: h % 12 === 0 ? '12' : String(h % 12) }
    }),
  }
}

// ---------------------------------------------------------------- query

const SELECT = `
  bill_id, subtotal, discount_percent, discount_amount,
  service_charge_percent, service_charge_amount,
  vat_percent, vat_amount, total_amount, payment_method, paid_at,
  orders (
    order_id, order_number, order_type, created_at,
    restaurant_tables ( table_number ),
    profiles ( full_name, email ),
    order_items ( quantity, unit_price, unit_cost, subtotal, menu_items ( name ) )
  )
`

const round2 = (n) => Math.round(n * 100) / 100


/**
 * একটা সময়সীমার পুরো বিক্রির রিপোর্ট। সব হিসাব এখানেই হয়,
 * UI শুধু সাজিয়ে দেখায়।
 */
export const fetchSalesReport = async (range) => {
  const rows =
    unwrap(
      await supabase
        .from('bills')
        .select(SELECT)
        .gte('paid_at', range.fromIso)
        .lt('paid_at', range.toIso)
        .order('paid_at', { ascending: true })
    ) || []

  const totals = {
    grossSales: 0,      // আইটেমের মোট দাম
    discount: 0,
    serviceCharge: 0,
    vat: 0,
    collected: 0,       // কাস্টমার যত দিয়েছে
    netIncome: 0,       // VAT বাদে ক্যাফের আয়
    cost: 0,            // কাঁচামালের খরচ
    profit: 0,
    transactions: 0,
    itemsSold: 0,
    dineIn: 0,
    takeaway: 0,
  }

  const bucketMap = new Map(
    range.buckets.map((b) => [b.key, { ...b, revenue: 0, profit: 0, orders: 0 }])
  )
  const itemMap = new Map()
  const methodMap = new Map()
  const cashierMap = new Map()

  const transactions = rows.map((b) => {
    const order = b.orders || {}
    const items = order.order_items || []

    const subtotal = Number(b.subtotal) || 0
    const discount = Number(b.discount_amount) || 0
    const service = Number(b.service_charge_amount) || 0
    const vat = Number(b.vat_amount) || 0
    const collected = Number(b.total_amount) || 0
    const netIncome = round2(subtotal - discount + service)

    const cost = round2(items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_cost || 0), 0))
    const profit = round2(netIncome - cost)
    const qty = items.reduce((s, i) => s + Number(i.quantity), 0)

    totals.grossSales += subtotal
    totals.discount += discount
    totals.serviceCharge += service
    totals.vat += vat
    totals.collected += collected
    totals.netIncome += netIncome
    totals.cost += cost
    totals.profit += profit
    totals.transactions += 1
    totals.itemsSold += qty
    if (order.order_type === 'takeaway') totals.takeaway += 1
    else totals.dineIn += 1

    // ---- গ্রাফের বালতিতে ফেলা
    const { ymd, hour } = dhakaParts(b.paid_at)
    const key =
      range.bucket === 'hour'
        ? String(hour).padStart(2, '0')
        : range.bucket === 'day'
          ? ymd
          : ymd.slice(0, 7)

    const slot = bucketMap.get(key)
    if (slot) {
      slot.revenue += netIncome
      slot.profit += profit
      slot.orders += 1
    }

    // ---- কোন আইটেম কত বিক্রি হলো
    items.forEach((i) => {
      const name = i.menu_items?.name || 'Deleted item'
      const row = itemMap.get(name) || { name, quantity: 0, revenue: 0, profit: 0 }
      const lineRevenue = Number(i.subtotal) || 0
      const lineCost = Number(i.quantity) * Number(i.unit_cost || 0)
      row.quantity += Number(i.quantity)
      row.revenue += lineRevenue
      row.profit += lineRevenue - lineCost
      itemMap.set(name, row)
    })

    // ---- পেমেন্ট পদ্ধতি
    const method = b.payment_method || 'cash'
    const m = methodMap.get(method) || { method, count: 0, amount: 0 }
    m.count += 1
    m.amount += collected
    methodMap.set(method, m)

    // ---- কে অর্ডারটা নিয়েছিল
    const who = order.profiles?.full_name || order.profiles?.email || 'Unknown'
    const c = cashierMap.get(who) || { name: who, count: 0, amount: 0 }
    c.count += 1
    c.amount += collected
    cashierMap.set(who, c)

    return {
      billId: b.bill_id,
      orderNumber: order.order_number ?? null,
      paidAt: b.paid_at,
      type: order.order_type || 'dine-in',
      tableNumber: order.restaurant_tables?.table_number ?? null,
      takenBy: who,
      itemCount: qty,
      subtotal,
      discount,
      service,
      vat,
      collected,
      profit,
      paymentMethod: method,
    }
  })

  Object.keys(totals).forEach((k) => {
    totals[k] = round2(totals[k])
  })
  totals.avgTicket = totals.transactions ? round2(totals.collected / totals.transactions) : 0
  totals.margin = totals.netIncome ? round2((totals.profit / totals.netIncome) * 100) : 0
  // রেসিপি (BOM) বসানো না থাকলে unit_cost সব শূন্য থাকে — তখন profit আসলে আয়ই
  totals.costTracked = totals.cost > 0

  const series = Array.from(bucketMap.values()).map((s) => ({
    ...s,
    revenue: round2(s.revenue),
    profit: round2(s.profit),
  }))

  return {
    range,
    totals,
    series,
    transactions: transactions.reverse(), // নতুনগুলো আগে
    topItems: Array.from(itemMap.values()).sort((a, b) => b.revenue - a.revenue),
    byMethod: Array.from(methodMap.values()).sort((a, b) => b.amount - a.amount),
    byCashier: Array.from(cashierMap.values()).sort((a, b) => b.amount - a.amount),
  }
}

// ---------------------------------------------------------------- format

export const taka = (value) =>
  `৳ ${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** বড় সংখ্যা ছোট করে: 12500 → ৳ 12.5k */
export const takaShort = (value) => {
  const n = Number(value || 0)
  if (Math.abs(n) >= 100000) return `৳ ${(n / 100000).toFixed(2)}L`
  if (Math.abs(n) >= 1000) return `৳ ${(n / 1000).toFixed(1)}k`
  return `৳ ${n.toFixed(0)}`
}

export const clockTime = (value) =>
  new Date(value).toLocaleTimeString('en-GB', { timeZone: DHAKA, hour: '2-digit', minute: '2-digit' })

export const dateTime = (value) =>
  new Date(value).toLocaleString('en-GB', {
    timeZone: DHAKA,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

export const generatedStamp = () =>
  new Date().toLocaleString('en-GB', {
    timeZone: DHAKA,
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

export const METHOD_LABEL = { cash: 'Cash', card: 'Card', bkash: 'bKash', nagad: 'Nagad' }
