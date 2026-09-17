// ==========================================================================
// Role-Based Access Control (RBAC) — single source of truth
//
// এই ফাইলটাই পুরো সিস্টেমের role + route + permission এর একমাত্র উৎস।
// নতুন module যোগ করতে হলে: MODULES + MODULE_CONFIG + ROLE_MODULE_ACCESS
// এই তিন জায়গায় একবার করে লিখলেই sidebar, route আর guard সব আপডেট হয়ে যাবে।
// ==========================================================================

// Canonical role values. এগুলোই হুবহু public.profiles.role কলামে সেভ হয়।
export const ROLES = {
  OWNER: 'owner',
  MANAGER: 'manager',
  CASHIER: 'cashier',
  STAFF: 'staff',
}

// পুরনো ডেটাবেজে 'admin' / 'super_admin' লেখা থাকতে পারে — সেগুলোকে owner ধরা হবে।
const LEGACY_ROLE_ALIASES = {
  admin: ROLES.OWNER,
  super_admin: ROLES.OWNER,
  superadmin: ROLES.OWNER,
  owner: ROLES.OWNER,
  manager: ROLES.MANAGER,
  shift_manager: ROLES.MANAGER,
  cashier: ROLES.CASHIER,
  staff: ROLES.STAFF,
  kitchen: ROLES.STAFF,
}

/** যেকোনো role string কে canonical ROLES মানে বদলে দেয়। অজানা হলে cashier. */
export const normalizeRole = (rawRole) => {
  if (!rawRole) return ROLES.CASHIER
  return LEGACY_ROLE_ALIASES[String(rawRole).trim().toLowerCase()] || ROLES.CASHIER
}

export const ROLE_INFO = {
  [ROLES.OWNER]: {
    id: ROLES.OWNER,
    name: 'Owner',
    title: 'Cafe Owner / Super Admin',
    badgeText: 'Owner',
    color: '#8B9A6E',
    bgColor: 'rgba(139, 154, 110, 0.15)',
    description: 'Unrestricted master access to all operations, transactions, inventory, staff, and system settings.',
  },
  [ROLES.MANAGER]: {
    id: ROLES.MANAGER,
    name: 'Manager',
    title: 'Shift Manager',
    badgeText: 'Manager',
    color: '#626F48',
    bgColor: 'rgba(98, 111, 72, 0.15)',
    description: 'Oversees daily orders, table turnover, billing, stock reconciliation, menu, and profit reports.',
  },
  [ROLES.CASHIER]: {
    id: ROLES.CASHIER,
    name: 'Cashier',
    title: 'Frontline Cashier',
    badgeText: 'Cashier',
    color: '#B26A00',
    bgColor: 'rgba(178, 106, 0, 0.15)',
    description: 'Counter register terminal for taking guest orders, assigning dining tables, and settling bills.',
  },
  [ROLES.STAFF]: {
    id: ROLES.STAFF,
    name: 'Floor & Kitchen Staff',
    title: 'Cafe Floor & Inventory Staff',
    badgeText: 'Staff',
    color: '#3E6B89',
    bgColor: 'rgba(62, 107, 137, 0.15)',
    description: 'Floor service and kitchen bay: live orders, table occupancy, and ingredient stock levels.',
  },
}

// Module IDs
export const MODULES = {
  DASHBOARD: 'dashboard',
  ORDERS: 'orders',
  TABLES: 'tables',
  BILLING: 'billing',
  INVENTORY: 'inventory',
  MENU: 'menu',
  REPORTS: 'reports',
  STAFF: 'users',
  PERMISSIONS: 'permissions',
  USER_SETTINGS: 'profile',
  SETTINGS: 'settings',
}

// ==========================================================================
// Module metadata — path, sidebar group, এবং কোন teammate এটার মালিক।
// `owner` field টা শুধু ডকুমেন্টেশন, কোডে কোনো effect নেই।
// ==========================================================================
export const MODULE_CONFIG = [
  {
    id: MODULES.DASHBOARD,
    path: '/dashboard',
    title: 'Dashboard',
    shortTitle: 'Overview',
    description: 'Operational KPIs, revenue, live orders & stock warnings',
    iconName: 'LayoutDashboard',
    group: 'OPERATIONS & POS',
    teamOwner: 'Person 1',
  },
  {
    id: MODULES.ORDERS,
    path: '/dashboard/orders',
    title: 'Orders & POS',
    shortTitle: 'Orders',
    description: 'Counter register, order entry, kitchen queue & status tracking',
    iconName: 'ShoppingBag',
    group: 'OPERATIONS & POS',
    teamOwner: 'Person 2',
  },
  {
    id: MODULES.TABLES,
    path: '/dashboard/tables',
    title: 'Table Management',
    shortTitle: 'Tables',
    description: 'Live interactive floor map with status color-coding',
    iconName: 'Grid',
    group: 'OPERATIONS & POS',
    teamOwner: 'Person 2',
  },
  {
    id: MODULES.MENU,
    path: '/dashboard/menu',
    title: 'Menu Management',
    shortTitle: 'Menu',
    description: 'Categorized items, recipe BOM pricing & item availability',
    iconName: 'BookOpen',
    group: 'OPERATIONS & POS',
    teamOwner: 'Person 3',
  },
  {
    id: MODULES.INVENTORY,
    path: '/dashboard/inventory',
    title: 'Ingredient Inventory',
    shortTitle: 'Inventory',
    description: 'Ingredient stock levels, restock adjustments & low-stock alerts',
    iconName: 'Package',
    group: 'OPERATIONS & POS',
    teamOwner: 'Person 3',
  },
  {
    id: MODULES.BILLING,
    path: '/dashboard/billing',
    title: 'Billing & Payments',
    shortTitle: 'Billing',
    description: 'Transactions, Cash/bKash/Nagad/Card settlement & receipt printing',
    iconName: 'Receipt',
    group: 'OPERATIONS & POS',
    teamOwner: 'Person 4',
  },
  {
    id: MODULES.REPORTS,
    path: '/dashboard/reports',
    title: 'Reports & Profit',
    shortTitle: 'Reports',
    description: 'Sales breakdown, gross profit margins & NBR VAT report',
    iconName: 'TrendingUp',
    group: 'OPERATIONS & POS',
    teamOwner: 'Person 1',
  },
  {
    id: MODULES.STAFF,
    path: '/dashboard/users',
    title: 'Staff Management',
    shortTitle: 'Users',
    description: 'Staff directory, email invites, phone records & group assignment',
    iconName: 'Users',
    group: 'ADMINISTRATION',
    isLiveBackend: true,
    teamOwner: 'Person 1',
  },
  {
    id: MODULES.PERMISSIONS,
    path: '/dashboard/permissions',
    title: 'Permission Groups',
    shortTitle: 'Permissions',
    description: 'Create custom groups & configure View/Edit rights per module',
    iconName: 'ShieldCheck',
    group: 'ADMINISTRATION',
    isLiveBackend: true,
    teamOwner: 'Person 1',
  },
  {
    id: MODULES.SETTINGS,
    path: '/dashboard/settings',
    title: 'System Settings',
    shortTitle: 'System',
    description: 'NBR VAT configuration, cafe profile & hardware setup',
    iconName: 'Settings',
    group: 'ADMINISTRATION',
    teamOwner: 'Person 4',
  },
  {
    id: MODULES.USER_SETTINGS,
    path: '/dashboard/profile',
    title: 'My Profile',
    shortTitle: 'Profile',
    description: 'Update profile name, phone number & change account password',
    iconName: 'UserCheck',
    group: 'MY ACCOUNT',
    isLiveBackend: true,
    teamOwner: 'Person 1',
  },
]

export const getModuleConfig = (moduleId) =>
  MODULE_CONFIG.find((m) => m.id === moduleId) || null

// ==========================================================================
// ROLE → MODULE ACCESS MATRIX
//
// এখানেই ঠিক হয় কোন role কোন module দেখবে। একটা লাইন বদলালেই UI বদলে যাবে।
// `view`  = sidebar-এ দেখাবে ও route খুলবে
// `edit`  = ভিতরে লেখা/পরিবর্তন করার বাটন active থাকবে
// ==========================================================================
const FULL = { view: true, edit: true }
const READ_ONLY = { view: true, edit: false }
const NONE = { view: false, edit: false }

export const ROLE_MODULE_ACCESS = {
  // Owner — সব কিছুতে পূর্ণ অধিকার
  [ROLES.OWNER]: {
    [MODULES.DASHBOARD]: FULL,
    [MODULES.ORDERS]: FULL,
    [MODULES.TABLES]: FULL,
    [MODULES.MENU]: FULL,
    [MODULES.INVENTORY]: FULL,
    [MODULES.BILLING]: FULL,
    [MODULES.REPORTS]: FULL,
    [MODULES.STAFF]: FULL,
    [MODULES.PERMISSIONS]: FULL,
    [MODULES.SETTINGS]: FULL,
    [MODULES.USER_SETTINGS]: FULL,
  },

  // Manager — অপারেশন সব, কিন্তু staff/permission/system settings নেই
  [ROLES.MANAGER]: {
    [MODULES.DASHBOARD]: FULL,
    [MODULES.ORDERS]: FULL,
    [MODULES.TABLES]: FULL,
    [MODULES.MENU]: FULL,
    [MODULES.INVENTORY]: FULL,
    [MODULES.BILLING]: FULL,
    [MODULES.REPORTS]: READ_ONLY,
    [MODULES.STAFF]: NONE,
    [MODULES.PERMISSIONS]: NONE,
    [MODULES.SETTINGS]: NONE,
    [MODULES.USER_SETTINGS]: FULL,
  },

  // Cashier — শুধু কাউন্টার: order নেওয়া, টেবিল assign করা, বিল settle করা।
  // শুধু order-only চাইলে TABLES আর BILLING কে NONE করে দিন।
  [ROLES.CASHIER]: {
    [MODULES.DASHBOARD]: NONE,
    [MODULES.ORDERS]: FULL,
    [MODULES.TABLES]: FULL,
    [MODULES.MENU]: READ_ONLY,
    [MODULES.INVENTORY]: NONE,
    [MODULES.BILLING]: FULL,
    [MODULES.REPORTS]: NONE,
    [MODULES.STAFF]: NONE,
    [MODULES.PERMISSIONS]: NONE,
    [MODULES.SETTINGS]: NONE,
    [MODULES.USER_SETTINGS]: FULL,
  },

  // Floor & Kitchen Staff — টেবিল ও ইনভেন্টরি, টাকা-পয়সা নয়
  [ROLES.STAFF]: {
    [MODULES.DASHBOARD]: NONE,
    [MODULES.ORDERS]: READ_ONLY,
    [MODULES.TABLES]: FULL,
    [MODULES.MENU]: READ_ONLY,
    [MODULES.INVENTORY]: FULL,
    [MODULES.BILLING]: NONE,
    [MODULES.REPORTS]: NONE,
    [MODULES.STAFF]: NONE,
    [MODULES.PERMISSIONS]: NONE,
    [MODULES.SETTINGS]: NONE,
    [MODULES.USER_SETTINGS]: FULL,
  },
}

/** login করার পর role অনুযায়ী প্রথম যে পেজে যাবে। */
export const ROLE_LANDING_PATH = {
  [ROLES.OWNER]: '/dashboard',
  [ROLES.MANAGER]: '/dashboard',
  [ROLES.CASHIER]: '/dashboard/orders',
  [ROLES.STAFF]: '/dashboard/tables',
}

/** role অনুযায়ী যে যে module দেখতে পাবে সেগুলোর config list. */
export const getVisibleModules = (role) => {
  const matrix = ROLE_MODULE_ACCESS[normalizeRole(role)] || {}
  return MODULE_CONFIG.filter((m) => matrix[m.id]?.view)
}
