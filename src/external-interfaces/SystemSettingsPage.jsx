// =========================================================================
// MODULE OWNER: Person 4 — External Interfaces (printer, payment gateway)
// Route: /dashboard/settings  (শুধু Owner দেখতে পায়)
// =========================================================================
import React from 'react'
import { ModuleScaffold } from '../shared/components/ModuleScaffold'
import { MODULES } from '../authentication/constants/rbac'

export const SystemSettingsPage = () => (
  <ModuleScaffold
    moduleId={MODULES.SETTINGS}
    tasks={[
      'Cafe profile: name, address, BIN / VAT registration number',
      'Configurable NBR VAT rate (currently hardcoded at 7.5%)',
      'Receipt printer selection and test print',
      'Stored bKash / Nagad merchant credentials',
    ]}
  />
)
