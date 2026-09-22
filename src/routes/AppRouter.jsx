import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'

import { AuthProvider, useAuth } from '../authentication/context/AuthContext'
import { MODULES } from '../authentication/constants/rbac'
import { ProtectedRoute, AuthLoadingScreen } from '../authentication/routes/ProtectedRoute'

import { LoginPage } from '../authentication/pages/LoginPage'
import { EmailConfirmedPage } from '../authentication/pages/EmailConfirmedPage'
import { DashboardLayout } from '../shared/layout/DashboardLayout'

// Person 1 — Auth, Roles & Reporting
import { OverviewPage } from '../dashboard/OverviewPage'
import { StaffManagementView } from '../authentication/staff-management/StaffManagementView'
import { PermissionGroupsView } from '../authentication/permission-groups/PermissionGroupsView'
import { UserSettingsView } from '../authentication/profile/UserSettingsView'

// Person 2 — Orders & Tables
import { OrdersPage } from '../orders/OrdersPage'
import { OrdersRegister } from '../orders/OrdersRegister'
import { CancellationsPage } from '../orders/CancellationsPage'
import { KitchenPage } from '../kitchen/KitchenPage'
import { TablesPage } from '../tables/TablesPage'

// Person 3 — Menu & Inventory
import { MenuPage } from '../menu/MenuPage'
import { InventoryPage } from '../inventory/InventoryPage'

// Person 4 — Billing & External Interfaces
import { BillingPage } from '../billing/BillingPage'

/**
 * `/` তে ঢুকলে কী হবে:
 *   - session চেক চলছে       → loader
 *   - লগইন করা নেই           → /login
 *   - profile/group আসেনি    → loader (সর্বোচ্চ ৪ সেকেন্ড)
 *   - লগইন করা আছে           → তার অনুমতি অনুযায়ী আসল landing page
 *
 * ⚠️ profile আর permission group আসার আগে redirect করলে custom group এ
 *    বসা user কে তার base role এর পেজে পাঠানো হয় — যেটায় তার অনুমতি নেই,
 *    আর সে সাথে সাথেই "Access Restricted" দেখে। তাই একটু অপেক্ষা।
 *    কিন্তু অনির্দিষ্টকাল নয় — নেট না থাকলেও যেন লোডারে আটকে না থাকে।
 */
const RootRedirect = () => {
  const { user, profile, initializing, groupsLoaded, getLandingPath } = useAuth()
  const location = useLocation()
  const [waited, setWaited] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setWaited(true), 4000)
    return () => clearTimeout(timer)
  }, [])

  if (initializing) return <AuthLoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (!waited && (!profile || !groupsLoaded)) return <AuthLoadingScreen />

  // লগইনের আগে যে পেজে যেতে চেয়েছিল সেটাই, তবে অনুমতি থাকলে
  return <Navigate to={getLandingPath(location.state?.from)} replace />
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
        {/* ইমেইলের confirm লিংক এখানেই নামে — লগইন ছাড়াই খোলে */}
        <Route path="/auth/confirmed" element={<EmailConfirmedPage />} />

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
                {/* সবার জন্যই POS — টেবিল বেছে অর্ডার নেওয়ার পর্দা।
                    অর্ডারের ইতিহাস আলাদা হয়ে গেছে → /dashboard/transactions */}
                <OrdersPage />
              </Guarded>
            }
          />
          {/* Person 2 — All Transactions: সব অর্ডারের ইতিহাস, শুধু দেখার */}
          <Route
            path="transactions"
            element={
              <Guarded module={MODULES.TRANSACTIONS}>
                <OrdersRegister />
              </Guarded>
            }
          />
          {/* Person 2 — Kitchen Display: রান্নাঘরের টিকিট বোর্ড */}
          <Route
            path="kitchen"
            element={
              <Guarded module={MODULES.KITCHEN}>
                <KitchenPage />
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
          {/* Reports এখন Overview পেজেরই অংশ — পুরনো bookmark যেন না ভাঙে */}
          <Route path="reports" element={<Navigate to="/dashboard" replace />} />
          {/* Person 2 — Manager বাতিলের অনুরোধ দেখে সিদ্ধান্ত নেন */}
          <Route
            path="cancellations"
            element={
              <Guarded module={MODULES.CANCELLATIONS}>
                <CancellationsPage />
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
        </Route>

        {/* অজানা URL → entry point, সেখান থেকে role অনুযায়ী redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  </BrowserRouter>
)
