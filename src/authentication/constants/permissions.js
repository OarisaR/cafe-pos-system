// ==========================================================================
// Dynamic Permission Groups & Modules Engine
//
// প্রতিটা group এখন একটা canonical `role` এর সাথে বাঁধা (rbac.js এর ROLES)।
// এই `role` মানটাই হুবহু Supabase এর public.profiles.role কলামে সেভ হয়,
// তাই Supabase Table Editor খুললেই প্রতিটা user এর role দেখা যাবে।
// ==========================================================================

import { ROLES, MODULES } from './rbac'

export const MODULE_KEYS = {
  REPORTS: 'reports',
  ORDERS: 'orders',
  KITCHEN: 'kitchen',
  TABLES: 'tables',
  BILLING: 'billing',
  MENU: 'menu',
  INVENTORY: 'inventory',
  CANCELLATIONS: 'cancellations',
  STAFF: 'staff',
  PERMISSIONS: 'permissions',
  SETTINGS: 'settings',
}

export const MODULE_DEFINITIONS = [
  { id: MODULE_KEYS.REPORTS, label: 'Overview & Reports', desc: 'Daily revenue analytics, gross profit margins & NBR VAT' },
  { id: MODULE_KEYS.ORDERS, label: 'Orders & Register', desc: 'Order creation, barista drink notes & kitchen queue' },
  { id: MODULE_KEYS.KITCHEN, label: 'Kitchen Display', desc: 'Live ticket queue — prepare, mark ready and hand over' },
  { id: MODULE_KEYS.TABLES, label: 'Tables & Floor Map', desc: 'Real-time table status, seating capacity & occupancy' },
  { id: MODULE_KEYS.BILLING, label: 'Billing & Payments', desc: 'Payment settlement (Cash, bKash, Nagad, Card) & invoices' },
  { id: MODULE_KEYS.MENU, label: 'Menu & Recipe BOM', desc: 'Menu item prices, recipe cup costs & stock availability' },
  { id: MODULE_KEYS.INVENTORY, label: 'Inventory & Stock', desc: 'Pantry ingredients, coffee beans, dairy & reorder alerts' },
  { id: MODULE_KEYS.CANCELLATIONS, label: 'Cancellation Requests', desc: 'Approve or reject guest cancellations before payment & write the complaint note' },
  { id: MODULE_KEYS.STAFF, label: 'Staff Management', desc: 'Staff directory, email invites & permission group assignment' },
  { id: MODULE_KEYS.PERMISSIONS, label: 'Permission Groups', desc: 'Create custom roles & configure View/Edit rights per module' },
  { id: MODULE_KEYS.SETTINGS, label: 'System Settings', desc: 'NBR VAT configuration, cafe profile & hardware setup' },
]

/**
 * Permission group এর module key → rbac.js এর MODULES id.
 * এই ম্যাপটাই group এর toggle গুলোকে আসল sidebar/route এর সাথে জুড়ে দেয়।
 */
export const PERMISSION_MODULE_TO_RBAC = {
  [MODULE_KEYS.REPORTS]: MODULES.DASHBOARD,
  [MODULE_KEYS.ORDERS]: MODULES.ORDERS,
  [MODULE_KEYS.KITCHEN]: MODULES.KITCHEN,
  [MODULE_KEYS.TABLES]: MODULES.TABLES,
  [MODULE_KEYS.BILLING]: MODULES.BILLING,
  [MODULE_KEYS.MENU]: MODULES.MENU,
  [MODULE_KEYS.INVENTORY]: MODULES.INVENTORY,
  [MODULE_KEYS.CANCELLATIONS]: MODULES.CANCELLATIONS,
  [MODULE_KEYS.STAFF]: MODULES.STAFF,
  [MODULE_KEYS.PERMISSIONS]: MODULES.PERMISSIONS,
  [MODULE_KEYS.SETTINGS]: MODULES.SETTINGS,
}

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
      reports: { view: true, edit: true },
      orders: { view: true, edit: true },
      kitchen: { view: true, edit: true },
      tables: { view: true, edit: true },
      billing: { view: true, edit: true },
      menu: { view: true, edit: true },
      inventory: { view: true, edit: true },
      cancellations: { view: true, edit: true },
      staff: { view: true, edit: true },
      permissions: { view: true, edit: true },
      settings: { view: true, edit: true },
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
      reports: { view: true, edit: true },
      orders: { view: true, edit: true },
      kitchen: { view: true, edit: true },
      tables: { view: true, edit: true },
      billing: { view: true, edit: true },
      menu: { view: true, edit: true },
      inventory: { view: true, edit: true },
      cancellations: { view: true, edit: true },
      staff: { view: false, edit: false },
      permissions: { view: false, edit: false },
      settings: { view: false, edit: false },
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
      reports: { view: false, edit: false },
      orders: { view: true, edit: true },
      kitchen: { view: false, edit: false },
      tables: { view: true, edit: true },
      billing: { view: true, edit: true },
      menu: { view: true, edit: false },
      inventory: { view: false, edit: false },
      cancellations: { view: true, edit: false },
      staff: { view: false, edit: false },
      permissions: { view: false, edit: false },
      settings: { view: false, edit: false },
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
      reports: { view: false, edit: false },
      orders: { view: true, edit: false },
      kitchen: { view: true, edit: true },
      tables: { view: true, edit: true },
      billing: { view: false, edit: false },
      menu: { view: true, edit: false },
      inventory: { view: true, edit: true },
      cancellations: { view: false, edit: false },
      staff: { view: false, edit: false },
      permissions: { view: false, edit: false },
      settings: { view: false, edit: false },
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

/**
 * একটা custom permission group এর toggle গুলোকে rbac.js এর ROLE_MODULE_ACCESS
 * এর মতো একটা matrix বানিয়ে দেয়। কাস্টম role এ বসানো user এর জন্য এটাই
 * access এর একমাত্র উৎস — তাই owner যা টগল করেছেন, ঠিক সেটাই user পাবে।
 *
 * group এ যে module এর কথা লেখা নেই, সেটা বন্ধ ধরা হয়। শুধু "My Profile"
 * সবসময় খোলা — নিজের পাসওয়ার্ড বদলানোর অধিকার কেড়ে নেওয়া যায় না।
 */
export const buildAccessMatrixFromGroup = (group) => {
  const matrix = {}

  Object.entries(PERMISSION_MODULE_TO_RBAC).forEach(([moduleKey, rbacModuleId]) => {
    const perm = group?.permissions?.[moduleKey]
    const view = Boolean(perm?.view)
    matrix[rbacModuleId] = { view, edit: view && Boolean(perm?.edit) }
  })

  matrix[MODULES.USER_SETTINGS] = { view: true, edit: true }
  return matrix
}

// ==========================================================================
// Supabase row ↔ app object. permission_groups টেবিলে snake_case কলাম,
// অ্যাপে camelCase — এই দুটো ফাংশনই সেই অনুবাদ করে।
// ==========================================================================

export const mapGroupRowToGroup = (row) => ({
  id: row.id,
  name: row.name,
  description: row.description || '',
  role: row.role || ROLES.STAFF,
  color: row.color || '#626F48',
  bgColor: row.bg_color || 'rgba(98, 111, 72, 0.16)',
  isDefault: Boolean(row.is_default),
  permissions: row.permissions || {},
})

export const mapGroupToRow = (group) => ({
  id: group.id,
  name: group.name,
  description: group.description || '',
  role: group.role || ROLES.STAFF,
  color: group.color || null,
  bg_color: group.bgColor || null,
  is_default: Boolean(group.isDefault),
  permissions: group.permissions || {},
})
