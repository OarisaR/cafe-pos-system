// ==========================================================================
// Role-Based Access Control (RBAC) Constants & Module Definitions
// ==========================================================================

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  MANAGER: 'manager',
  STAFF: 'staff',
  CASHIER: 'cashier',
}

export const ROLE_INFO = {
  [ROLES.SUPER_ADMIN]: {
    id: ROLES.SUPER_ADMIN,
    name: 'Super Admin',
    title: 'Cafe Owner / Super Admin',
    badgeText: 'Super Admin',
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
    description: 'Oversees daily orders, table turnover, billing, stock reconciliation, menu, and profit calculations.',
  },
  [ROLES.STAFF]: {
    id: ROLES.STAFF,
    name: 'Staff',
    title: 'Cafe Floor & Inventory Staff',
    badgeText: 'Staff',
    color: '#3E6B89',
    bgColor: 'rgba(62, 107, 137, 0.15)',
    description: 'Operational visibility across live orders, table occupancy, and ingredient inventory levels.',
  },
  [ROLES.CASHIER]: {
    id: ROLES.CASHIER,
    name: 'Cashier',
    title: 'Frontline Cashier',
    badgeText: 'Cashier',
    color: '#B26A00',
    bgColor: 'rgba(178, 106, 0, 0.15)',
    description: 'Counter register terminal for taking guest orders, assigning dining tables, and processing billing.',
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
  USER_SETTINGS: 'user_settings',
  SETTINGS: 'settings',
}

// Module Metadata for Superadmin Sidebar Navigation
export const MODULE_CONFIG = [
  {
    id: MODULES.DASHBOARD,
    title: 'Dashboard',
    shortTitle: 'Overview',
    description: 'Full operational KPIs, revenue, live orders & stock warnings',
    iconName: 'LayoutDashboard',
  },
  {
    id: MODULES.ORDERS,
    title: 'All Orders',
    shortTitle: 'Orders',
    description: 'Searchable orders register, receipt drawer, status tracking',
    iconName: 'ShoppingBag',
  },
  {
    id: MODULES.TABLES,
    title: 'All Tables',
    shortTitle: 'Tables',
    description: 'Live interactive floor map with status color-coding',
    iconName: 'Grid',
  },
  {
    id: MODULES.BILLING,
    title: 'Billing & Payments',
    shortTitle: 'Billing',
    description: 'All transactions, Cash/bKash/Nagad/Card settlements',
    iconName: 'Receipt',
  },
  {
    id: MODULES.INVENTORY,
    title: 'Inventory',
    shortTitle: 'Inventory',
    description: 'Ingredient stock levels, restock adjustments & warnings',
    iconName: 'Package',
  },
  {
    id: MODULES.MENU,
    title: 'Menu Management',
    shortTitle: 'Menu',
    description: 'Categorized items, recipe BOM pricing & item availability',
    iconName: 'BookOpen',
  },
  {
    id: MODULES.REPORTS,
    title: 'Reports & Profit',
    shortTitle: 'Reports',
    description: 'Sales breakdown, gross profit margins & NBR VAT report',
    iconName: 'TrendingUp',
  },
  {
    id: MODULES.STAFF,
    title: 'User Management',
    shortTitle: 'Users',
    description: 'Staff directory, email invites, phone records & group assignment',
    iconName: 'Users',
    isLiveBackend: true,
  },
  {
    id: MODULES.PERMISSIONS,
    title: 'Permission Groups',
    shortTitle: 'Permissions',
    description: 'Create custom groups & configure View/Edit rights per module',
    iconName: 'ShieldCheck',
    isLiveBackend: true,
  },
  {
    id: MODULES.USER_SETTINGS,
    title: 'User Settings',
    shortTitle: 'Settings',
    description: 'Update profile name, phone number & change account password',
    iconName: 'UserCheck',
    isLiveBackend: true,
  },
  {
    id: MODULES.SETTINGS,
    title: 'System Settings',
    shortTitle: 'System',
    description: 'NBR VAT configuration, cafe profile & hardware setup',
    iconName: 'Settings',
  },
]
