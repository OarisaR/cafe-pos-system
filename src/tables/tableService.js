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