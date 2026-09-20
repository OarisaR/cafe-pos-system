import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import { AuthProvider, useAuth } from '../authentication/context/AuthContext'
import { MODULES } from '../authentication/constants/rbac'
import { ProtectedRoute, AuthLoadingScreen } from '../authentication/routes/ProtectedRoute'

import { LoginPage } from '../authentication/pages/LoginPage'
import { DashboardLayout } from '../shared/layout/DashboardLayout'

// Person 1 — Auth, Roles & Reporting
import { OverviewPage } from '../dashboard/OverviewPage'
import { ReportsPage } from '../reports/ReportsPage'
import { StaffManagementView } from '../authentication/staff-management/StaffManagementView'
import { PermissionGroupsView } from '../authentication/permission-groups/PermissionGroupsView'
import { UserSettingsView } from '../authentication/profile/UserSettingsView'

// Person 2 — Orders & Tables
import { OrdersPage } from '../orders/OrdersPage'
import { TablesPage } from '../tables/TablesPage'

// Person 3 — Menu & Inventory
import { MenuPage } from '../menu/MenuPage'
import { InventoryPage } from '../inventory/InventoryPage'

// Person 4 — Billing & External Interfaces
import { BillingPage } from '../billing/BillingPage'
import { SystemSettingsPage } from '../external-interfaces/SystemSettingsPage'

/**
 * `/` তে ঢুকলে কী হবে:
 *   - session চেক চলছে  → loader
 *   - লগইন করা নেই      → /login
 *   - লগইন করা আছে      → role অনুযায়ী তার নিজের landing page
 */
const RootRedirect = () => {
  const { user, initializing, landingPath } = useAuth()

  if (initializing) return <AuthLoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={landingPath} replace />
}

/**
 * ছোট helper: প্রতিটা dashboard route কে তার module id দিয়ে মুড়ে দেয়,
 * যাতে URL সরাসরি টাইপ করলেও permission যাচাই হয়।
 */
const Guarded = ({ module, children }) => (
  <ProtectedRoute module={module}>{children}</ProtectedRoute>
)

export const AppRouter = () => (
  <BrowserRouter>
    <AuthProvider>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Entry point */}
        <Route path="/" element={<RootRedirect />} />

        {/* সব dashboard route লগইন ছাড়া খোলা যাবে না */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
    
            {/* Orders can be opened directly; OrdersPage provides the table
              selector when the URL does not contain a table reference.
              Route coordination by Oarisa. */}
          <Route
            path="orders"
            element={
              <Guarded module={MODULES.ORDERS}>
                <OrdersPage />
              </Guarded>
            }
          />
          <Route
            index
            element={
              <Guarded module={MODULES.DASHBOARD}>
                <OverviewPage />
              </Guarded>
            }
          />
          <Route
            path="reports"
            element={
              <Guarded module={MODULES.REPORTS}>
                <ReportsPage />
              </Guarded>
            }
          />
          <Route
            path="users"
            element={
              <Guarded module={MODULES.STAFF}>
                <StaffManagementView />
              </Guarded>
            }
          />
          <Route
            path="permissions"
            element={
              <Guarded module={MODULES.PERMISSIONS}>
                <PermissionGroupsView />
              </Guarded>
            }
          />
          {/* Profile — role নির্বিশেষে সবাই নিজের প্রোফাইল দেখতে পায় */}
          <Route
            path="profile"
            element={
              <Guarded module={MODULES.USER_SETTINGS}>
                <UserSettingsView />
              </Guarded>
            }
          />

          {/* Person 2 — readable table-number URL and takeaway orders. for takeway table id stays NULL */}
          <Route
            path="orders/table/:tableNumber"
            element={
              <Guarded module={MODULES.ORDERS}>
                <OrdersPage />
              </Guarded>
            }
          />
          {/*not needed anymore, 
          replaced by tableNumber route above. 
          <Route
            path="orders/:tableId"
            element={
              <Guarded module={MODULES.ORDERS}>
                <OrdersPage />
              </Guarded>
            }
          /> */}
          <Route
            path="tables"
            element={
              <Guarded module={MODULES.TABLES}>
                <TablesPage />
              </Guarded>
            }
          />

          {/* Person 3 */}
          <Route
            path="menu"
            element={
              <Guarded module={MODULES.MENU}>
                <MenuPage />
              </Guarded>
            }
          />
          <Route
            path="inventory"
            element={
              <Guarded module={MODULES.INVENTORY}>
                <InventoryPage />
              </Guarded>
            }
          />

          {/* Person 4 */}
          <Route
            path="billing"
            element={
              <Guarded module={MODULES.BILLING}>
                <BillingPage />
              </Guarded>
            }
          />
 {/* Person 4  will do this once the order is placed it carries that order id and then goes to biling page*/}
          <Route
            path="/dashboard/billing/:orderId"
            element={<BillingPage />}
          />
          <Route
            path="settings"
            element={
              <Guarded module={MODULES.SETTINGS}>
                <SystemSettingsPage />
              </Guarded>
            }
          />
        </Route>

        {/* অজানা URL → entry point, সেখান থেকে role অনুযায়ী redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  </BrowserRouter>
)
