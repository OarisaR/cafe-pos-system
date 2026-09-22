// tableservice.js
import { supabase } from '../shared/lib/supabase'

const TABLE = 'restaurant_tables'

export const TABLE_STATUS = {
  EMPTY: 'empty',
  OCCUPIED: 'occupied',
  NEEDS_CLEANING: 'cleaning',
}

export async function getAllTables() {
  const { data, error } = await supabase
    .from(TABLE)
    .select(
      'table_id, table_number, capacity, status',
    )
    .order('table_number', {
      ascending: true,
    })

  if (error) throw error

  return data
}

export async function getTableById(tableId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select(
      'table_id, table_number, capacity, status',
    )
    .eq('table_id', tableId)
    .single()

  if (error) throw error

  return data
}

// Single choke point — every table status
// change goes through this function.
async function setTableStatus(
  tableId,
  status,
) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('table_id', tableId)
    .select()
    .single()

  if (error) throw error

  return data
}

// EMPTY → OCCUPIED
// Cashier confirms that a customer has taken the table.
export function claimTable(tableId) {
  return setTableStatus(
    tableId,
    TABLE_STATUS.OCCUPIED,
  )
}

// OCCUPIED → NEEDS_CLEANING
// This is MANUAL.
// Payment does NOT call this automatically.
export function markNeedsCleaning(tableId) {
  return setTableStatus(
    tableId,
    TABLE_STATUS.NEEDS_CLEANING,
  )
}

// NEEDS_CLEANING → EMPTY
// Cashier confirms that the table has actually
// been cleaned and can be used again.
export function markEmpty(tableId) {
  return setTableStatus(
    tableId,
    TABLE_STATUS.EMPTY,
  )
}
// -------------------------------------------------------------------------
// Floor setup — owner/manager নতুন টেবিল বসাতে বা সরাতে পারেন।
// ডেটাবেজেও ঠিক এই নিয়ম: `tables_admin` RLS policy শুধু owner আর
// manager কে INSERT/DELETE করতে দেয়।
// -------------------------------------------------------------------------

// কয় সিটের টেবিল বসানো যাবে
export const SEAT_OPTIONS = [2, 3, 4, 6]

// ছবি আছে শুধু ২-সিট আর ৪-সিটের। ৩ বা তার বেশি হলে ৪-সিটের ছবিই
// ব্যবহার হয়, তাই নতুন টেবিল হুবহু পুরনোগুলোর মতোই দেখাবে।
export const getTableArtCapacity = (capacity) => (Number(capacity) <= 2 ? 2 : 4)

// তালিকার সবচেয়ে বড় নম্বরের পরেরটা — ফর্মে আগে থেকে বসানো থাকে
export const nextFreeTableNumber = (tables = []) =>
  tables.reduce((max, t) => Math.max(max, Number(t.table_number) || 0), 0) + 1

export async function createTable({ tableNumber, capacity }) {
  const number = Number(tableNumber)
  const seats = Number(capacity)

  if (!Number.isInteger(number) || number < 1) {
    throw new Error('Table number must be a whole number above 0.')
  }
  if (!Number.isInteger(seats) || seats < 1) {
    throw new Error('Seat count must be a whole number above 0.')
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      table_number: number,
      capacity: seats,
      status: TABLE_STATUS.EMPTY,
    })
    .select('table_id, table_number, capacity, status')
    .single()

  if (error) {
    // 23505 = unique violation — ওই নম্বরের টেবিল আগে থেকেই আছে
    if (error.code === '23505') {
      throw new Error(`Table ${number} already exists. Pick a different number.`)
    }
    if (error.code === '42501') {
      throw new Error('Only the owner or a manager can add a table.')
    }
    throw error
  }

  return data
}

export async function deleteTable(tableId) {
  const { error } = await supabase.from(TABLE).delete().eq('table_id', tableId)

  if (error) {
    // 23503 = foreign key — এই টেবিলে অর্ডারের ইতিহাস আছে, মোছা যাবে না
    if (error.code === '23503') {
      throw new Error(
        'This table has orders on record, so it cannot be removed. Its history would be lost.'
      )
    }
    if (error.code === '42501') {
      throw new Error('Only the owner or a manager can remove a table.')
    }
    throw error
  }
}
