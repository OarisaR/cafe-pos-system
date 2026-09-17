# Cafe POS System

A modern, web-based Point of Sale (POS) and inventory management platform designed specifically for cafes, featuring real-time table tracking, recipe-linked inventory (Bill of Materials), automated COGS calculation, and NBR VAT compliance.

---

## 📖 Key Documentation

- **[PRD (Product Requirements Document)](PRD.md):** Complete specifications, user personas, MoSCoW prioritization, and feature breakdown.
- **[System Context & Architecture](CONTEXT.md):** Domain workflows, database entity-relationship schema (ERD), hardware integration profiles, and localization context.
- **[AI Guidelines & Rules](AGENTS.md):** Engineering standards, POS ergonomics, styling tokens, and agent operational constraints.
- **[Changelog](CHANGELOG.md):** Chronological log of versions, additions, and updates.
- **[Original SRS Document](Cafe_SRS.pdf):** Initial Software Requirements Specification document (v0.1 Draft).

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React.js (Vite), Pure CSS / Modern UI Tokens (Touch-optimized) |
| **Backend** | Node.js, Express.js REST API |
| **Database & Auth** | Supabase (PostgreSQL, Supabase Auth, Supabase Storage) |
| **Realtime Sync** | Supabase Realtime Channels |
| **Peripherals** | ESC/POS thermal printer, Cash drawer, MFS (bKash / Nagad) QR |
| **Hosting** | Vercel / Cloud Infrastructure |

---

## 👥 Roles & Interfaces

1. **Cashier Terminal:**
   - 10–15 inch touch-screen optimized interface.
   - Quick-tap order creation (Dine-in, Takeaway, Delivery).
   - Live visual table floor plan (`Empty`, `Occupied`, `Reserved`, `Needs Cleaning`).
   - Fast checkout (< 3 seconds) with Cash change calculation and bKash/Nagad handling.

2. **Owner / Admin Dashboard:**
   - Recipe & Bill of Materials (BOM) management.
   - Real-time stock levels with Low/Moderate/High thresholds and alerts.
   - Automated Cost of Goods Sold (COGS) and profit margin analysis.
   - Menu management with category organization and instant out-of-stock toggles.
   - Sales summaries with CSV/PDF reporting.

---

## 🚀 Setup (প্রথমবার চালানোর নিয়ম)

### ধাপ ১ — Supabase ডেটাবেজ তৈরি করুন

[`supabase/supabase_setup.sql`](supabase/supabase_setup.sql) ফাইলটার **পুরোটা** কপি করে
**Supabase Dashboard → SQL Editor → New Query** এ paste করে **Run** চাপুন।

এটা যা করবে:

- `public.profiles` টেবিলে `created_at`, `updated_at`, `last_login_at` টাইমস্ট্যাম্প যোগ করবে
- প্রতিটি user এর `role` কলাম ঠিক করবে — `owner` / `manager` / `cashier` / `staff`
- পুরনো `admin` role গুলো `owner` এ রূপান্তর করবে
- `staff_directory` নামে একটা view বানাবে, যেখানে role ও timestamp একসাথে দেখা যায়
- চারটা রোলের জন্য চারটা ডেমো লগইন অ্যাকাউন্ট বানাবে

### ধাপ ২ — `.env` ফাইল

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### ধাপ ৩ — অ্যাপ চালান

```bash
npm install
npm run dev     # http://localhost:5173
```

`http://localhost:5173` খুললে এখন **সরাসরি Login পেজ** আসবে। লগইন ছাড়া কোনো
dashboard route খোলা যাবে না — URL সরাসরি টাইপ করলেও না।

### ডেমো অ্যাকাউন্ট

| Role | Email | Password | লগইনের পর যা দেখবে |
| :--- | :--- | :--- | :--- |
| Owner | `owner@cafepos.com` | `Owner@12345` | সব module + Staff & Permission Management |
| Manager | `manager@cafepos.com` | `Manager@12345` | অপারেশন ও রিপোর্ট, staff management নয় |
| Cashier | `cashier@cafepos.com` | `Cashier@12345` | শুধু Orders, Tables, Billing |
| Staff | `staff@cafepos.com` | `Staff@12345` | Tables ও Inventory |

> ⚠️ এগুলো ডেমো পাসওয়ার্ড। জমা দেওয়ার আগে বদলে নিন।

---

## 🔐 Routes & Access Control

সব permission এর একমাত্র উৎস: **[`src/authentication/constants/rbac.js`](src/authentication/constants/rbac.js)**।
সেখানকার `ROLE_MODULE_ACCESS` ম্যাট্রিক্সের একটা লাইন বদলালেই sidebar, route guard
আর edit-বাটন — তিনটাই একসাথে বদলে যায়।

| Route | Module | Owner | Manager | Cashier | Staff |
| :--- | :--- | :-: | :-: | :-: | :-: |
| `/login` | — | public | public | public | public |
| `/dashboard` | Overview | ✅ | ✅ | ❌ | ❌ |
| `/dashboard/orders` | Orders & POS | ✅ | ✅ | ✅ | 👁️ |
| `/dashboard/tables` | Tables | ✅ | ✅ | ✅ | ✅ |
| `/dashboard/menu` | Menu | ✅ | ✅ | 👁️ | 👁️ |
| `/dashboard/inventory` | Inventory | ✅ | ✅ | ❌ | ✅ |
| `/dashboard/billing` | Billing | ✅ | ✅ | ✅ | ❌ |
| `/dashboard/reports` | Reports | ✅ | 👁️ | ❌ | ❌ |
| `/dashboard/users` | Staff Management | ✅ | ❌ | ❌ | ❌ |
| `/dashboard/permissions` | Permission Groups | ✅ | ❌ | ❌ | ❌ |
| `/dashboard/settings` | System Settings | ✅ | ❌ | ❌ | ❌ |
| `/dashboard/profile` | My Profile | ✅ | ✅ | ✅ | ✅ |

✅ = View + Edit  ·  👁️ = শুধু View  ·  ❌ = Sidebar এ দেখাবেই না, URL দিলে "Access Restricted"

কোডে ব্যবহার:

```jsx
const { canAccess, canEdit } = useAuth()

canAccess(MODULES.REPORTS)  // route/sidebar এ দেখাবে কিনা
canEdit(MODULES.MENU)       // Save/Delete বাটন active থাকবে কিনা
```

---

## 📁 Folder Structure

```
src/
├── authentication/          ← Person 1 (Auth & Roles)
│   ├── context/             AuthContext.jsx — login, session, role, permission helpers
│   ├── constants/           rbac.js, permissions.js — roles, routes, access matrix
│   ├── routes/              ProtectedRoute.jsx
│   ├── pages/               LoginPage.jsx
│   ├── staff-management/    StaffManagementView.jsx
│   ├── permission-groups/   PermissionGroupsView.jsx
│   ├── profile/             UserSettingsView.jsx
│   └── components/          IdleWarningModal.jsx
├── routes/                  AppRouter.jsx — পুরো সিস্টেমের route map (সবার)
├── dashboard/               OverviewPage.jsx — Owner/Manager এর home dashboard
├── reports/                 ← Person 1 (Profit Calculation & Reporting)
├── orders/                  ← Person 2 (Order Management)
├── tables/                  ← Person 2 (Table Management)
├── menu/                    ← Person 3 (Menu Management)
├── inventory/               ← Person 3 (Ingredient Inventory)
├── billing/                 ← Person 4 (Billing & Payment)
├── external-interfaces/     ← Person 4 (payment gateway, printer, system settings)
├── shared/                  ← সবার ব্যবহারের জন্য
│   ├── lib/                 supabase.js
│   ├── layout/              DashboardLayout.jsx, AdminSidebar.jsx
│   └── components/          ModuleScaffold.jsx
├── App.jsx
├── main.jsx
└── index.css
```

```
supabase/
├── supabase_setup.sql       ← ১ম: auth, profiles, roles (একবার চালাতে হবে)
├── supabase_pos_schema.sql  ← ২য়: menu, inventory, tables, orders, bills (একবার চালাতে হবে)
└── patches/                 ← আগেই চালানো হয়ে গেছে; সব কিছু setup.sql এর ভিতরেও আছে
    ├── supabase_fix_role_sync.sql
    └── supabase_fix_group_sync.sql
```

> `patches/` এর ফাইলগুলো আবার চালানোর দরকার নেই — শুধু কী কী বদলানো হয়েছিল তার রেকর্ড।

---

## 👨‍💻 টিমের কাজ ভাগাভাগি (৪ জন)

প্রত্যেকের module আলাদা ফোল্ডারে, তাই একসাথে কাজ করলেও git conflict কম হবে।

| | দায়িত্ব | ফাইল | কেন |
| :--- | :--- | :--- | :--- |
| **Person 1** | Auth & Roles (শুরুতে) → Profit + Reporting (শেষে) | `src/authentication/`, `src/reports/` | Auth সবার আগে দরকার — foundation। Reporting বাকি সবার ডেটার উপর নির্ভরশীল, তাই শেষে। |
| **Person 2** | Order Management + Table Management | `src/orders/`, `src/tables/` | অর্ডার টেবিলে assign হয় — একই ডেটা-ফ্লো। |
| **Person 3** | Menu Management + Ingredient Inventory | `src/menu/`, `src/inventory/` | মেনু আইটেম recipe (BOM) এর সাথে গভীরভাবে যুক্ত। |
| **Person 4** | Billing & Payment + External Interfaces | `src/billing/`, `src/external-interfaces/` | Billing সরাসরি payment gateway ও printer চালায়। |

**নতুন module যোগ করার নিয়ম:**

1. `src/<your-module>/<Name>Page.jsx` ফাইল বানান
2. `src/authentication/constants/rbac.js` → `MODULES` + `MODULE_CONFIG` + `ROLE_MODULE_ACCESS` এ একবার করে লিখুন
3. `src/routes/AppRouter.jsx` এ `<Route>` যোগ করুন

sidebar, guard আর permission নিজে থেকেই কাজ করবে।

---

## ⚠️ জানা সীমাবদ্ধতা

- **Staff তৈরি করলে owner এর session এক মুহূর্তের জন্য টাল খেতে পারে।** কারণ ব্রাউজার
  থেকে `supabase.auth.signUp()` করলে Supabase নতুন user কে সাইন-ইন করে দেয়।
  কোডে পুরনো session ফিরিয়ে আনা হয়, কিন্তু আসল সমাধান হলো একটা Edge Function
  থেকে `admin.createUser()` কল করা (service-role key দিয়ে)।
- **RLS policy গুলো এখন উদার** — যেকোনো logged-in user সব profile পড়তে/লিখতে পারে।
  ক্লাস প্রজেক্টের জন্য ঠিক আছে, production এ `auth.uid() = id` দিয়ে সীমিত করতে হবে।
- **Permission group গুলো localStorage এ রাখা** — প্রতিটি ব্রাউজারে আলাদা।
  ভাগাভাগি করতে হলে Supabase এ একটা `permission_groups` টেবিল লাগবে।
- Orders / Tables / Billing / Inventory এর ডেটা এখনো mock — Person 2, 3, 4
  নিজ নিজ module এ Supabase টেবিল যোগ করবে।

---

## 📦 Repository

- **Remote Git Repository:** `https://github.com/OarisaR/cafe-pos-system.git`
