// =========================================================================
// MODULE OWNER: Person 1 — Profit Calculation + Reporting
// Route: /dashboard/reports
//
// এটা বাকি সবার ডেটার উপর নির্ভরশীল, তাই সবার শেষে বানানো হবে।
// =========================================================================
import React from 'react'
import { ModuleScaffold } from '../shared/components/ModuleScaffold'
import { MODULES } from '../authentication/constants/rbac'

export const ReportsPage = () => (
  <ModuleScaffold
    moduleId={MODULES.REPORTS}
    tasks={[
      'Daily and monthly sales summary from Orders + Billing',
      'Gross profit margin after subtracting menu BOM cost',
      'NBR VAT (7.5%) report export (CSV / print)',
      'Per-cashier shift sales breakdown',
      'Start only after Person 2, 3 and 4 have created their tables',
    ]}
  />
)
