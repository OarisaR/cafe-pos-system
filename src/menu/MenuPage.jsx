// =========================================================================
// MODULE OWNER: Person 3 — Menu Management
// Route: /dashboard/menu
// =========================================================================
import React from 'react'
import { ModuleScaffold } from '../shared/components/ModuleScaffold'
import { MODULES } from '../authentication/constants/rbac'

export const MenuPage = () => (
  <ModuleScaffold
    moduleId={MODULES.MENU}
    tasks={[
      'A menu_items table in Supabase (name, category, price, is_available)',
      'A recipe BOM table — how much of each ingredient every item consumes',
      'Per-cup cost derived from the BOM, which the Reports module will consume',
      'Mark an item unavailable automatically when its ingredients run out',
      'Disable every edit control when canEdit(MODULES.MENU) is false',
    ]}
  />
)
