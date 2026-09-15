import React from 'react'
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Grid, 
  Receipt, 
  Package, 
  BookOpen, 
  TrendingUp, 
  Users, 
  ShieldCheck, 
  UserCheck, 
  Settings, 
  LogOut,
  Coffee,
  Sparkles,
  ChevronRight
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { MODULES } from '../../constants/rbac'

export const AdminSidebar = ({ currentModule, onSelectModule }) => {
  const { user, profile, role, currentRoleInfo, isSuperAdmin, logout } = useAuth()

  // Dynamic Navigation based on Super Admin vs Regular Staff
  const navItems = isSuperAdmin
    ? [
        {
          group: 'OPERATIONS & POS',
          items: [
            { id: MODULES.DASHBOARD, label: 'Full Dashboard', icon: LayoutDashboard, isPlaceholder: true },
            { id: MODULES.ORDERS, label: 'All Orders', icon: ShoppingBag, isPlaceholder: true },
            { id: MODULES.TABLES, label: 'All Tables', icon: Grid, isPlaceholder: true },
            { id: MODULES.BILLING, label: 'Billing & Payments', icon: Receipt, isPlaceholder: true },
            { id: MODULES.INVENTORY, label: 'Inventory', icon: Package, isPlaceholder: true },
            { id: MODULES.MENU, label: 'Menu Management', icon: BookOpen, isPlaceholder: true },
            { id: MODULES.REPORTS, label: 'Reports', icon: TrendingUp, isPlaceholder: true },
          ]
        },
        {
          group: 'ADMINISTRATION & CONTROL',
          items: [
            { id: MODULES.STAFF, label: 'Staff / User Management', icon: Users, isPlaceholder: false },
            { id: MODULES.PERMISSIONS, label: 'Permission Groups', icon: ShieldCheck, isPlaceholder: false },
            { id: MODULES.USER_SETTINGS, label: 'User Settings', icon: UserCheck, badge: 'Active', isPlaceholder: false },
            { id: MODULES.SETTINGS, label: 'System Settings', icon: Settings, isPlaceholder: true },
          ]
        }
      ]
    : [
        {
          group: 'OPERATIONAL TERMINAL',
          items: [
            { id: MODULES.ORDERS, label: 'Counter POS & Orders', icon: ShoppingBag, badge: 'Touchscreen', isPlaceholder: false },
            { id: MODULES.TABLES, label: 'Floor & Table Map', icon: Grid, badge: 'Realtime', isPlaceholder: false },
            { id: MODULES.BILLING, label: 'Billing & Payments', icon: Receipt, isPlaceholder: false },
            { id: MODULES.INVENTORY, label: 'Ingredient Stock', icon: Package, isPlaceholder: false },
            { id: MODULES.MENU, label: 'Menu Items', icon: BookOpen, isPlaceholder: false },
          ]
        },
        {
          group: 'MY ACCOUNT',
          items: [
            { id: MODULES.USER_SETTINGS, label: 'Profile & Password', icon: UserCheck, badge: 'Settings', isPlaceholder: false },
          ]
        }
      ]

  return (
    <aside style={styles.sidebar}>
      {/* Brand Header */}
      <div style={styles.brand}>
        <div style={styles.brandIcon}>
          <Coffee size={20} color="#FFFFFF" strokeWidth={2.4} />
        </div>
        <div>
          <h1 style={styles.brandName}>L'Aroma POS</h1>
          <div style={styles.brandSub}>
            <span style={styles.roleIndicator} />
            <span>{isSuperAdmin ? 'SUPER ADMIN' : (currentRoleInfo?.name || 'STAFF TERMINAL')}</span>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <div style={styles.navContainer}>
        {navItems.map((groupSection, idx) => (
          <div key={idx} style={styles.navGroup}>
            <div style={styles.groupHeader}>{groupSection.group}</div>
            <div style={styles.groupList}>
              {groupSection.items.map((item) => {
                const Icon = item.icon
                const isActive = currentModule === item.id

                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectModule(item.id)}
                    style={{
                      ...styles.navBtn,
                      backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
                      color: isActive ? '#FFFFFF' : 'var(--color-text-main)',
                      fontWeight: isActive ? '700' : '500',
                    }}
                  >
                    <div style={styles.navBtnLeft}>
                      <Icon size={18} color={isActive ? '#FFFFFF' : 'var(--color-primary-active)'} />
                      <span>{item.label}</span>
                    </div>

                    <div style={styles.navBtnRight}>
                      {item.badge && (
                        <span style={{
                          ...styles.miniBadge,
                          backgroundColor: isActive ? 'rgba(255, 255, 255, 0.25)' : 'rgba(98, 111, 72, 0.14)',
                          color: isActive ? '#FFFFFF' : 'var(--color-primary-active)'
                        }}>
                          {item.badge}
                        </span>
                      )}
                      {isActive && <ChevronRight size={14} color="#FFFFFF" />}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Profile & Logout */}
      <div style={styles.sidebarFooter}>
        <div style={styles.userCard}>
          <div style={styles.userAvatar}>
            {(profile?.full_name || user?.email || 'A').charAt(0).toUpperCase()}
          </div>
          <div style={styles.userInfo}>
            <div style={styles.userDisplayName}>{profile?.full_name || 'Owner & Admin'}</div>
            <div style={styles.userDisplayRole}>{user?.email || 'admin@cafepos.com'}</div>
          </div>
        </div>

        <button onClick={() => logout()} style={styles.logoutBtn} title="Sign Out">
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}

const styles = {
  sidebar: {
    width: '280px',
    backgroundColor: 'var(--color-surface)',
    borderRight: '1.5px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    position: 'sticky',
    top: 0,
    flexShrink: 0,
    zIndex: 100,
  },
  brand: {
    padding: '24px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    borderBottom: '1px solid var(--color-border)',
  },
  brandIcon: {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    backgroundColor: 'var(--color-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: '1.15rem',
    fontWeight: '800',
    color: 'var(--color-text-main)',
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
  },
  brandSub: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.72rem',
    fontWeight: '700',
    color: 'var(--color-primary-active)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginTop: '2px',
  },
  roleIndicator: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-primary)',
  },
  navContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  navGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  groupHeader: {
    fontSize: '0.68rem',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--color-text-muted)',
    padding: '6px 12px',
  },
  groupList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  navBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    fontSize: '0.86rem',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s ease',
  },
  navBtnLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  navBtnRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  miniBadge: {
    fontSize: '0.66rem',
    fontWeight: '700',
    padding: '2px 6px',
    borderRadius: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
  },
  sidebarFooter: {
    padding: '16px',
    borderTop: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  userCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  userAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-primary)',
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '0.9rem',
    flexShrink: 0,
  },
  userInfo: {
    overflow: 'hidden',
  },
  userDisplayName: {
    fontSize: '0.86rem',
    fontWeight: '700',
    color: 'var(--color-text-main)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  userDisplayRole: {
    fontSize: '0.74rem',
    color: 'var(--color-text-muted)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '9px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-danger)',
    fontSize: '0.84rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.15s',
  }
}
