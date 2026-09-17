// ==========================================================================
// Dynamic Permission Groups & Modules Engine
//
// প্রতিটা group এখন একটা canonical `role` এর সাথে বাঁধা (rbac.js এর ROLES)।
// এই `role` মানটাই হুবহু Supabase এর public.profiles.role কলামে সেভ হয়,
// তাই Supabase Table Editor খুললেই প্রতিটা user এর role দেখা যাবে।
// ==========================================================================

import { ROLES } from './rbac'

export const MODULE_KEYS = {
  ORDERS: 'orders',
  TABLES: 'tables',
  BILLING: 'billing',
  INVENTORY: 'inventory',
  MENU: 'menu',
  REPORTS: 'reports',
}

export const MODULE_DEFINITIONS = [
  { id: MODULE_KEYS.ORDERS, label: 'Orders & Register', desc: 'Order creation, barista drink notes & kitchen queue' },
  { id: MODULE_KEYS.TABLES, label: 'Tables & Floor Map', desc: 'Real-time table status, seating capacity & occupancy' },
  { id: MODULE_KEYS.BILLING, label: 'Billing & Payments', desc: 'Payment settlement (Cash, bKash, Nagad, Card) & invoices' },
  { id: MODULE_KEYS.INVENTORY, label: 'Inventory & Stock', desc: 'Pantry ingredients, coffee beans, dairy & reorder alerts' },
  { id: MODULE_KEYS.MENU, label: 'Menu & Recipe BOM', desc: 'Menu item prices, recipe cup costs & stock availability' },
  { id: MODULE_KEYS.REPORTS, label: 'Reports & Analytics', desc: 'Daily revenue analytics, gross profit margins & NBR VAT' },
]

export const DEFAULT_PERMISSION_GROUPS = [
  {
    id: 'grp_super_admin',
    name: 'Owner (Super Admin)',
    role: ROLES.OWNER,
    description: 'Master unrestricted control over all modules, staff, financial settings, and permission groups.',
    color: '#8B9A6E',
    bgColor: 'rgba(139, 154, 110, 0.16)',
    isDefault: true,
    permissions: {
      orders: { view: true, edit: true },
      tables: { view: true, edit: true },
      billing: { view: true, edit: true },
      inventory: { view: true, edit: true },
      menu: { view: true, edit: true },
      reports: { view: true, edit: true },
    }
  },
  {
    id: 'grp_manager',
    name: 'Shift Manager',
    role: ROLES.MANAGER,
    description: 'Oversees daily shift operations, food costing, inventory reconciliation, and operational reporting.',
    color: '#626F48',
    bgColor: 'rgba(98, 111, 72, 0.16)',
    isDefault: true,
    permissions: {
      orders: { view: true, edit: true },
      tables: { view: true, edit: true },
      billing: { view: true, edit: true },
      inventory: { view: true, edit: true },
      menu: { view: true, edit: true },
      reports: { view: true, edit: true },
    }
  },
  {
    id: 'grp_cashier',
    name: 'Frontline Cashier',
    role: ROLES.CASHIER,
    description: 'Counter register terminal for taking guest orders, assigning tables, and settling guest bills.',
    color: '#B26A00',
    bgColor: 'rgba(178, 106, 0, 0.16)',
    isDefault: true,
    permissions: {
      orders: { view: true, edit: true },
      tables: { view: true, edit: true },
      billing: { view: true, edit: true },
      inventory: { view: false, edit: false },
      menu: { view: true, edit: false },
      reports: { view: false, edit: false },
    }
  },
  {
    id: 'grp_staff',
    name: 'Floor & Kitchen Staff',
    role: ROLES.STAFF,
    description: 'Floor attendance and kitchen stock bay for monitoring table status and pantry inventory.',
    color: '#3E6B89',
    bgColor: 'rgba(62, 107, 137, 0.16)',
    isDefault: true,
    permissions: {
      orders: { view: true, edit: false },
      tables: { view: true, edit: true },
      billing: { view: false, edit: false },
      inventory: { view: true, edit: true },
      menu: { view: true, edit: false },
      reports: { view: false, edit: false },
    }
  }
]

const PERMISSION_GROUPS_STORAGE_KEY = 'cafepos_custom_permission_groups'

export const getStoredPermissionGroups = () => {
  try {
    const saved = localStorage.getItem(PERMISSION_GROUPS_STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) {
        // পুরনো ব্রাউজারে সেভ করা group গুলোতে `role` ফিল্ডটা নাও থাকতে পারে।
        // সেক্ষেত্রে default group এর canonical role ফিরিয়ে দেওয়া হয়, নাহলে
        // সবাই ভুল করে 'staff' হয়ে যাবে।
        const withRoles = parsed.map((g) => {
          if (g.role) return g
          const fallback = DEFAULT_PERMISSION_GROUPS.find((d) => d.id === g.id)
          return { ...g, role: fallback?.role || ROLES.STAFF }
        })

        // চারটা ডিফল্ট group সবসময় থাকতেই হবে — কেউ মুছে ফেললেও ফিরে আসবে
        const missingDefaults = DEFAULT_PERMISSION_GROUPS.filter(
          (d) => !withRoles.some((g) => g.id === d.id)
        )

        return [...withRoles, ...missingDefaults]
      }
    }
  } catch (err) {
    console.warn('Error reading permission groups storage:', err)
  }
  return DEFAULT_PERMISSION_GROUPS
}

export const saveStoredPermissionGroups = (groups) => {
  try {
    localStorage.setItem(PERMISSION_GROUPS_STORAGE_KEY, JSON.stringify(groups))
  } catch (err) {
    console.warn('Error saving permission groups storage:', err)
  }
}

/**
 * একটা permission group id থেকে canonical role বের করে।
 * কাস্টম group এ role না থাকলে নিরাপদ default হিসেবে STAFF ধরা হয় —
 * কখনোই owner নয়, যাতে ভুল করে কেউ full access না পেয়ে যায়।
 */
export const getRoleForGroup = (groupId, groups = DEFAULT_PERMISSION_GROUPS) => {
  const group = (groups || []).find((g) => g.id === groupId)
  return group?.role || ROLES.STAFF
}
