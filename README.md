# L'Aroma POS

A modern, web-based Point of Sale and inventory management platform built for cafés — featuring real-time table tracking, recipe-linked inventory, automated cost calculation, and role-based access control.

**Live demo:** [cafe-pos-system-olive.vercel.app](https://cafe-pos-system-olive.vercel.app/)

<p>
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
</p>

---

## Overview

L'Aroma POS is a multi-module, permission-based application for running the day-to-day operations of a café: table status, order taking, billing, a menu with linked recipes, and live ingredient inventory. Access to each module is controlled by role, so a cashier, kitchen staff member, and owner each see only what their job needs.

## Technology Stack

| Layer | Technology |
| :--- | :--- |
| Frontend | React.js |
| Backend & Database | Supabase (PostgreSQL, Auth, Row-Level Security) — called directly from the client, no separate API server |
| Hosting | Vercel |

## Features

### Tables
- Live floor view of every table — Available, Occupied, or Needs Cleaning
- One tap to seat a table, send it to Needs Cleaning, or clear it back to Available
- A "needs attention" list surfaces every table waiting to be cleaned

### Orders
- Start from a table (Dine In) or start a Take Away order directly
- Build an order from the live menu, with per-item quantity and notes (e.g. more ice needed)
- Full status lifecycle: Open → Paid → Served, or Cancelled at an eligible stage
- A recent-orders panel shows every order's current status, reopenable while still active

### Billing
- Customizable discount and service charge per bill
- Auto-calculated VAT, change due, and grand total
- Generates a receipt once a bill is paid, with a "send to printer" action

### Menu
- Full CRUD on categories and menu items
- Each item carries a recipe — the exact ingredients and quantities it consumes
- Items automatically flip to unavailable the moment a required ingredient hits zero stock

### Inventory
- Live ingredient stock levels tied directly to every order placed
- Restocking for both ingredients and items
- Low-stock visibility so nothing runs out mid-service

### Owner Dashboard
At-a-glance performance metrics:
- Total sales and number of transactions
- Net income (after discount, before VAT)
- Gross profit with margin and cost breakdown
- Average bill value
- Items sold, split by dine-in vs. takeaway
- VAT collected and discount given
- Generate a PDF sales summary report for any period (e.g. monthly or yearly)

### Role-Based Access
- Roles: Owner (includes admin-level access), Manager, Cashier, Kitchen Staff
- The Owner can grant or revoke module access for any person
- Custom roles can be created on the fly (e.g. a Cleaner role limited to the Tables module) with only the permissions they need

## Roadmap

- **Manager-approved cancellations** — once an order is Served, a cashier can no longer cancel it outright; instead they file a cancellation request that a manager approves or rejects, with the reason logged either way
- **Kitchen queue stage** — an in-between "preparing" status between Open and Served, after which an order can no longer be cancelled by the cashier directly

## Future Work

- **Printer integration** — connect the existing "send to printer" receipt action to a physical ESC/POS printer
- **Kitchen receipt printing** — auto-generate a printable receipt for kitchen staff when an order enters the food-preparation stage
- **Payment gateway integration** — bKash / Nagad / Card support at checkout
- **Daily expense logging** — track recurring operating costs (rent, electricity, etc.) alongside sales for a fuller profit picture
- **AI-assisted item descriptions** — suggest a menu item description automatically when a staff member can't come up with one

## Getting Started

```bash
git clone <your-repo-url>
cd cafe-pos-system

npm install

cp .env.example .env
# Add your Supabase URL and anon key to .env

npm run dev     # http://localhost:5173
```
