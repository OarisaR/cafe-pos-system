// =========================================================================
// MODULE OWNER: Person 3 — Ingredient Inventory (data layer)
//
// Inventory সংক্রান্ত সব Supabase call এই এক ফাইলে।
// টেবিল: ingredients (supabase/supabase_pos_schema.sql)
//
// RLS: owner / manager / staff পড়তে ও লিখতে পারে; cashier কিছুই না।
// =========================================================================
import { supabase } from '../shared/lib/supabase'

export const UNITS = [
  { value: 'g', label: 'Grams (g)' },
  { value: 'ml', label: 'Millilitres (ml)' },
  { value: 'pcs', label: 'Pieces (pcs)' },
]

/** টেবিল এখনো তৈরি হয়নি (schema SQL চালানো হয়নি) */
export class InventorySchemaMissingError extends Error {
  constructor() {
    super('Inventory tables are not installed in Supabase yet.')
    this.name = 'InventorySchemaMissingError'
  }
}

const unwrap = ({ data, error }, messages = {}) => {
  if (!error) return data

  if (['PGRST205', '42P01', 'PGRST202'].includes(error.code)) {
    throw new InventorySchemaMissingError()
  }

  const friendly = {
    '23505': 'An ingredient with that name already exists.',
    '23503': messages.inUse || 'This ingredient is still used by a menu recipe.',
    '42501': 'You do not have permission to change the inventory.',
    '23514': 'One of the values is not allowed (for example a negative cost).',
  }[error.code]

  throw new Error(friendly || error.message || 'Something went wrong while talking to the database.')
}

// -------------------------------------------------------------------------
// Read
// -------------------------------------------------------------------------

/**
 * সব ingredient, সাথে কোন কোন মেনু আইটেমে ব্যবহার হয় (embedded join)।
 * usedIn: ['Spanish Latte', 'Caramel Macchiato']
 */
export const fetchIngredientsWithUsage = async () => {
  const rows = unwrap(
    await supabase
      .from('ingredients')
      .select(
        'ingredient_id, name, unit, cost_per_unit, stock_level, restock_threshold, updated_at, menu_item_ingredients ( menu_items ( name ) )'
      )
      .order('name', { ascending: true })
  )

  return rows.map(({ menu_item_ingredients: usage, ...ing }) => ({
    ...ing,
    cost_per_unit: Number(ing.cost_per_unit),
    stock_level: Number(ing.stock_level),
    restock_threshold: Number(ing.restock_threshold),
    usedIn: (usage || [])
      .map((u) => u.menu_items?.name)
      .filter(Boolean)
      .sort(),
  }))
}

// -------------------------------------------------------------------------
// Write
// -------------------------------------------------------------------------

export const createIngredient = async ({ name, unit, costPerUnit, stockLevel, restockThreshold }) =>
  unwrap(
    await supabase
      .from('ingredients')
      .insert({
        name: name.trim(),
        unit,
        cost_per_unit: Number(costPerUnit),
        stock_level: Number(stockLevel || 0),
        restock_threshold: Number(restockThreshold || 0),
      })
      .select()
      .single()
  )

/** stock_level এখানে বদলানো হয় না — তার জন্য restock / setStockCount */
export const updateIngredient = async (ingredientId, { name, unit, costPerUnit, restockThreshold }) =>
  unwrap(
    await supabase
      .from('ingredients')
      .update({
        name: name.trim(),
        unit,
        cost_per_unit: Number(costPerUnit),
        restock_threshold: Number(restockThreshold || 0),
      })
      .eq('ingredient_id', ingredientId)
      .select()
      .single()
  )

export const deleteIngredient = async (ingredientId, usedIn = []) =>
  unwrap(await supabase.from('ingredients').delete().eq('ingredient_id', ingredientId), {
    inUse: usedIn.length
      ? `Used in: ${usedIn.join(', ')}. Remove it from those recipes first.`
      : 'This ingredient is still used by a menu recipe. Remove it from the recipe first.',
  })

/** নতুন মাল এলে: বর্তমান stock এর সাথে যোগ হয় (ডেটাবেজে এক ধাপে) */
export const restockIngredient = async (ingredientId, quantity) =>
  unwrap(
    await supabase.rpc('restock_ingredient', {
      p_ingredient_id: ingredientId,
      p_quantity: Number(quantity),
    })
  )

/** গুনে দেখা আসল সংখ্যা বসানো (নষ্ট হওয়া, হিসাবের গরমিল ঠিক করা) */
export const setStockCount = async (ingredientId, count) =>
  unwrap(
    await supabase
      .from('ingredients')
      .update({ stock_level: Number(count) })
      .eq('ingredient_id', ingredientId)
      .select('ingredient_id, stock_level')
      .single()
  )

// -------------------------------------------------------------------------
// Display helpers
// -------------------------------------------------------------------------

/** 'out' (0 বা কম) | 'low' (সীমার সমান বা নিচে) | 'ok' */
export const getStockStatus = (ing) => {
  if (ing.stock_level <= 0) return 'out'
  if (ing.stock_level <= ing.restock_threshold) return 'low'
  return 'ok'
}

/** 8400 g → "8,400 g (8.4 kg)"; 2500 ml → "2,500 ml (2.5 L)" */
export const formatQuantity = (value, unit) => {
  const n = Number(value || 0)
  const base = `${n.toLocaleString('en-US', { maximumFractionDigits: 3 })} ${unit}`
  if (Math.abs(n) >= 1000 && (unit === 'g' || unit === 'ml')) {
    const big = (n / 1000).toLocaleString('en-US', { maximumFractionDigits: 2 })
    return `${base} (${big} ${unit === 'g' ? 'kg' : 'L'})`
  }
  return base
}

export const formatTaka = (value, maxDigits = 2) =>
  `৳ ${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: maxDigits })}`
