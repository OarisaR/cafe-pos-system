import React, { useState } from 'react'
import { 
  ShoppingBag, 
  Grid, 
  Receipt, 
  Package, 
  BookOpen, 
  TrendingUp, 
  LayoutDashboard, 
  Settings, 
  Sparkles, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Users,
  UserCheck
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { MODULES, MODULE_CONFIG } from '../../constants/rbac'
import { AdminSidebar } from '../Dashboard/AdminSidebar'
import { StaffManagementView } from '../Dashboard/StaffManagementView'
import { PermissionGroupsView } from '../Dashboard/PermissionGroupsView'
import { UserSettingsView } from '../Dashboard/UserSettingsView'
import { StaffTerminalView } from '../Dashboard/StaffTerminalView'

export const RoleDashboardView = () => {
  const { currentModule, setCurrentModule, role, currentRoleInfo, isSuperAdmin, profile, user } = useAuth()

  // Find module metadata
  const currentConfig = MODULE_CONFIG.find(m => m.id === currentModule) || MODULE_CONFIG[0]

  // Render module content based on user role
  const renderContent = () => {
    // 1. Regular Staff / Non-SuperAdmin Users
    // "ar user toh staff management page dekhbe na emne jst user e rjnno ekta without backend ui e direct koiro nahoi"
    if (!isSuperAdmin) {
      if (currentModule === MODULES.USER_SETTINGS) {
        return <UserSettingsView />
      }
      // Direct operational staff terminal without backend complexity!
      return (
        <StaffTerminalView 
          activeTab={currentModule} 
          onSwitchTab={(tab) => setCurrentModule(tab)} 
        />
      )
    }

    // 2. Super Admin Views
    switch (currentModule) {
      case MODULES.STAFF:
        return <StaffManagementView />

      case MODULES.PERMISSIONS:
        return <PermissionGroupsView />

      case MODULES.USER_SETTINGS:
        return <UserSettingsView />

      // Placeholders for other Super Admin sidebar buttons as requested:
      // "pashe sidebar e ja ja superadmin er option jst option rakhio kno kaj korio na option gulai"
      default:
        return (
          <div style={styles.placeholderContainer}>
            <div style={styles.placeholderCard}>
              <div style={styles.placeholderIconBox}>
                <Sparkles size={36} color="var(--color-primary-active)" />
              </div>

              <div style={styles.placeholderBadge}>
                <ShieldCheck size={14} />
                <span>Super Admin Module Slot</span>
              </div>

              <h2 style={styles.placeholderTitle}>{currentConfig.title}</h2>
              <p style={styles.placeholderDesc}>
                {currentConfig.description}
              </p>

              <div style={styles.infoBox}>
                <div style={styles.infoBoxTitle}>Backend Integration Status</div>
                <p style={styles.infoBoxText}>
                  This navigation item is configured for future POS engine expansion. 
                  Live staff accounts, email invitation dispatch, phone records, and dynamic permission matrices 
                  are active in <strong>User Management</strong> and <strong>Permission Groups</strong>.
                </p>
              </div>

              <div style={styles.quickActions}>
                <button
                  onClick={() => setCurrentModule(MODULES.STAFF)}
                  style={styles.actionBtnPrimary}
                >
                  <Users size={16} />
                  <span>Open Staff / User Management</span>
                  <ArrowRight size={14} />
                </button>

                <button
                  onClick={() => setCurrentModule(MODULES.PERMISSIONS)}
                  style={styles.actionBtnSecondary}
                >
                  <ShieldCheck size={16} />
                  <span>Configure Permission Groups</span>
                </button>

                <button
                  onClick={() => setCurrentModule(MODULES.USER_SETTINGS)}
                  style={styles.actionBtnSecondary}
                >
                  <UserCheck size={16} />
                  <span>My User Settings</span>
                </button>
              </div>
            </div>
          </div>
        )
    }
  }

  return (
    <div style={styles.layout}>
      {/* Super Admin Persistent Left Sidebar */}
      <AdminSidebar
        currentModule={currentModule}
        onSelectModule={(modId) => setCurrentModule(modId)}
      />

      {/* Main Workspace Area */}
      <main style={styles.mainWorkspace}>
        {renderContent()}
      </main>
    </div>
  )
}

const styles = {
  layout: {
    display: 'flex',
    minHeight: 'calc(100vh - 72px)',
    backgroundColor: 'var(--color-bg)',
  },
  mainWorkspace: {
    flex: 1,
    paddingTop: '28px',
    overflowY: 'auto',
  },
  placeholderContainer: {
    maxWidth: '860px',
    margin: '40px auto 80px',
    padding: '0 24px',
    animation: 'fadeIn 0.25s ease',
  },
  placeholderCard: {
    backgroundColor: 'var(--color-surface)',
    border: '1.5px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '48px 36px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: 'var(--shadow-sm)',
  },
  placeholderIconBox: {
    width: '76px',
    height: '76px',
    borderRadius: '20px',
    backgroundColor: 'rgba(98, 111, 72, 0.14)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  placeholderBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 14px',
    backgroundColor: 'rgba(98, 111, 72, 0.12)',
    color: 'var(--color-primary-active)',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.78rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: '14px',
  },
  placeholderTitle: {
    fontSize: '1.9rem',
    fontWeight: '800',
    color: 'var(--color-text-main)',
    marginBottom: '10px',
  },
  placeholderDesc: {
    fontSize: '1rem',
    color: 'var(--color-text-muted)',
    maxWidth: '560px',
    lineHeight: 1.55,
    marginBottom: '28px',
  },
  infoBox: {
    backgroundColor: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '20px 24px',
    maxWidth: '560px',
    textAlign: 'left',
    marginBottom: '32px',
  },
  infoBoxTitle: {
    fontSize: '0.86rem',
    fontWeight: '700',
    color: 'var(--color-text-main)',
    marginBottom: '6px',
  },
  infoBoxText: {
    fontSize: '0.84rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.5,
  },
  quickActions: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  actionBtnPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    backgroundColor: 'var(--color-primary)',
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: '0.92rem',
    cursor: 'pointer',
    boxShadow: 'var(--shadow-sm)',
  },
  actionBtnSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    borderRadius: 'var(--radius-sm)',
    border: '1.5px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text-main)',
    fontWeight: '600',
    fontSize: '0.9rem',
    cursor: 'pointer',
  }
}
