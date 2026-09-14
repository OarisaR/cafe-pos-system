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

## 🚀 Repository & Setup

- **Remote Git Repository:** `https://github.com/OarisaR/cafe-pos-system.git`
- *Note: Codebase is currently in the blueprint & preparation phase. No application code has been generated yet.*
