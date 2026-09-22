// =========================================================================
// MODULE OWNER: Person 3 — Menu Management (data layer)
//
// Menu সংক্রান্ত সব Supabase call এই এক ফাইলে। UI component গুলো সরাসরি
// supabase ডাকে না — এখান থেকে function import করে।
//
// টেবিল (supabase/supabase_pos_schema.sql):
//   menu_categories, menu_items, menu_item_ingredients, ingredients
// =========================================================================
import { supabase } from '../shared/lib/supabase'

/** টেবিল এখনো তৈরি হয়নি (schema SQL চালানো হয়নি) — এই error দিয়ে চেনা যায় */
export class MenuSchemaMissingError extends Error {
  constructor() {
    super('Menu tables are not installed in Supabase yet.')
    this.name = 'MenuSchemaMissingError'
  }
}

const isSchemaMissing = (error) =>
  error?.code === 'PGRST205' || error?.code === '42P01' || error?.code === 'PGRST202'

/** Postgres error কে মানুষের পড়ার মতো মেসেজে বদলানো */
const toFriendlyError = (error, fallback) => {
  if (!error) return null
  if (isSchemaMissing(error)) return new MenuSchemaMissingError()

  switch (error.code) {
    case '23505': // unique_violation
      return new Error('That name is already used. Please choose a different name.')
    case '23503': // foreign_key_violation (ON DELETE RESTRICT)
      return new Error(fallback.inUse)
    case '42501': // RLS রিজেক্ট করেছে
      return new Error('You do not have permission to change the menu.')
    case '23514': // check_violation
      return new Error('One of the values is not allowed (for example a negative price).')
    default:
      return new Error(error.message || fallback.generic)
  }
}

const unwrap = ({ data, error }, fallback = {}) => {
  if (error) {
    throw toFriendlyError(error, {
      generic: fallback.generic || 'Something went wrong while talking to the database.',
      inUse: fallback.inUse || 'This record is still in use and cannot be deleted.',
    })
  }
  return data
}

// -------------------------------------------------------------------------
// Categories
// -------------------------------------------------------------------------

export const fetchCategories = async () =>
  unwrap(
    await supabase
      .from('menu_categories')
      .select('category_id, name, description, sort_order')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
  )

export const createCategory = async ({ name, description }) => {
  const existing = await fetchCategories()
  const nextOrder = existing.reduce((max, c) => Math.max(max, c.sort_order), 0) + 1

  return unwrap(
    await supabase
      .from('menu_categories')
      .insert({ name: name.trim(), description: description?.trim() || null, sort_order: nextOrder })
      .select()
      .single()
  )
}

export const updateCategory = async (categoryId, { name, description }) =>
  unwrap(
    await supabase
      .from('menu_categories')
      .update({ name: name.trim(), description: description?.trim() || null })
      .eq('category_id', categoryId)
      .select()
      .single()
  )

export const deleteCategory = async (categoryId) =>
  unwrap(await supabase.from('menu_categories').delete().eq('category_id', categoryId), {
    inUse: 'This category still has menu items. Move or delete those items first.',
  })

// -------------------------------------------------------------------------
// Menu items
// -------------------------------------------------------------------------

const BASE_ITEM_COLUMNS = 'menu_item_id, category_id, name, description, price, status, updated_at'
const CARD_COLUMNS = 'image_url, prep_time_minutes'

// image_url / prep_time_minutes কলাম আছে কিনা (supabase_menu_card_fields.sql চালানো হয়েছে কিনা)।
// না থাকলে মেনু পেজ ভাঙে না — শুধু ছবি ও সময় ছাড়া চলে।
let cardFieldsSupported = true
export const areCardFieldsSupported = () => cardFieldsSupported

export const fetchMenuItems = async () => {
  if (cardFieldsSupported) {
    const result = await supabase
      .from('menu_items')
      .select(`${BASE_ITEM_COLUMNS}, ${CARD_COLUMNS}`)
      .order('name', { ascending: true })

    if (result.error?.code !== '42703') return unwrap(result) // 42703 = কলাম নেই
    cardFieldsSupported = false
  }

  return unwrap(
    await supabase.from('menu_items').select(BASE_ITEM_COLUMNS).order('name', { ascending: true })
  )
}

const toItemRow = ({ categoryId, name, description, price, status, imageUrl, prepTime }) => ({
  category_id: categoryId,
  name: name.trim(),
  description: description?.trim() || null,
  price: Number(price),
  status,
  ...(cardFieldsSupported && {
    image_url: imageUrl?.trim() || null,
    prep_time_minutes: prepTime === '' || prepTime == null ? null : Number(prepTime),
  }),
})

export const createMenuItem = async (fields) =>
  unwrap(await supabase.from('menu_items').insert(toItemRow(fields)).select().single())

export const updateMenuItem = async (menuItemId, fields) =>
  unwrap(
    await supabase
      .from('menu_items')
      .update(toItemRow(fields))
      .eq('menu_item_id', menuItemId)
      .select()
      .single()
  )

export const setMenuItemStatus = async (menuItemId, status) =>
  unwrap(
    await supabase
      .from('menu_items')
      .update({ status })
      .eq('menu_item_id', menuItemId)
      .select('menu_item_id, status')
      .single()
  )

/** পুরনো অর্ডারে থাকলে ডেটাবেজ মুছতে দেবে না (ON DELETE RESTRICT) */
export const deleteMenuItem = async (menuItemId) =>
  unwrap(await supabase.from('menu_items').delete().eq('menu_item_id', menuItemId), {
    inUse: 'This item appears in past orders, so it cannot be deleted. Mark it as unavailable instead.',
  })

// -------------------------------------------------------------------------
// Ingredients & recipes (BOM)
//
// RLS: ingredients আর recipe শুধু owner / manager / staff পড়তে পারে।
// cashier এর জন্য এগুলো খালি আসবে — তাই cost কলাম শুধু editor দের দেখানো হয়।
// -------------------------------------------------------------------------

export const fetchIngredients = async () =>
  unwrap(
    await supabase
      .from('ingredients')
      .select('ingredient_id, name, unit, cost_per_unit, stock_level, restock_threshold')
      .order('name', { ascending: true })
  )

/** সব আইটেমের recipe, ingredient এর তথ্য সহ (embedded join) */
export const fetchAllRecipes = async () =>
  unwrap(
    await supabase
      .from('menu_item_ingredients')
      .select(
        'menu_item_id, quantity_required, ingredients ( ingredient_id, name, unit, cost_per_unit, stock_level, restock_threshold )'
      )
  )

// -------------------------------------------------------------------------
// Stock availability
//
// `menu_item_availability` view টা supabase_stock_guard.sql চালানোর পর আসে।
// এটা ইচ্ছাকৃতভাবে ingredients টেবিলের বদলে ব্যবহার করা হয় — cashier
// ingredients পড়তে পারে না, কিন্তু কাউন্টারে বসে তারই জানা দরকার কোন
// আইটেম এখন বানানো যাবে না। view এ দাম/খরচ নেই, শুধু নাম আর সংখ্যা।
//
// patch টা না চালানো থাকলে null ফেরত আসে, আর UI চুপচাপ আগের মতোই চলে।
// -------------------------------------------------------------------------
let availabilitySupported = true
export const isAvailabilitySupported = () => availabilitySupported

export const fetchMenuAvailability = async () => {
  if (!availabilitySupported) return null

  const { data, error } = await supabase
    .from('menu_item_availability')
    .select('menu_item_id, max_servings, in_stock, is_sellable, short_ingredients, low_ingredients')

  if (error) {
    if (['PGRST205', '42P01', 'PGRST202'].includes(error.code)) {
      availabilitySupported = false
      return null
    }
    throw new Error(error.message || 'Could not read stock availability.')
  }

  const byItem = {}
  for (const row of data || []) {
    byItem[row.menu_item_id] = {
      // null = recipe বসানো নেই, তাই স্টক দিয়ে বিচার করা যাচ্ছে না
      maxServings: row.max_servings == null ? null : Number(row.max_servings),
      inStock: row.in_stock !== false,
      isSellable: row.is_sellable !== false,
      shortOf: row.short_ingredients || [],
      lowOf: row.low_ingredients || [],
    }
  }
  return byItem
}

/** একটা আইটেমের পুরো recipe একসাথে বদলায় (ডেটাবেজ function, atomic) */
export const saveRecipe = async (menuItemId, rows) =>
  unwrap(
    await supabase.rpc('set_menu_item_recipe', {
      p_menu_item_id: menuItemId,
      p_items: rows.map((r) => ({
        ingredient_id: r.ingredientId,
        quantity_required: Number(r.quantity),
      })),
    })
  )

// -------------------------------------------------------------------------
// হিসাব (UI তে দেখানোর জন্য; আসল অর্ডারের খরচ ডেটাবেজ trigger এ snapshot হয়)
// -------------------------------------------------------------------------

/** recipe list → { [menu_item_id]: [{ingredient, quantity}] } */
export const groupRecipesByItem = (recipeRows) =>
  (recipeRows || []).reduce((acc, row) => {
    if (!row.ingredients) return acc
    ;(acc[row.menu_item_id] ||= []).push({
      ingredient: row.ingredients,
      quantity: Number(row.quantity_required),
    })
    return acc
  }, {})

/** এক কাপ/এক পিস বানাতে ingredient এর মোট খরচ */
export const calculateUnitCost = (recipe = []) =>
  recipe.reduce((sum, r) => sum + r.quantity * Number(r.ingredient.cost_per_unit || 0), 0)

/** যে ingredient এর stock এক serving এর জন্যও যথেষ্ট নয় */
export const findShortIngredients = (recipe = []) =>
  recipe.filter((r) => Number(r.ingredient.stock_level) < r.quantity).map((r) => r.ingredient.name)

export const formatTaka = (value) =>
  `৳ ${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
