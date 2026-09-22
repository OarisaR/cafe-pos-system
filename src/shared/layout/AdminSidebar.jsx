import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  ShoppingBag,
  ChefHat,
  Grid,
  Receipt,
  ReceiptText,
  Package,
  BookOpen,
  TrendingUp,
  Users,
  ShieldCheck,
  UserCheck,
  Settings,
  Undo2,
  LogOut,
  Coffee,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '../../authentication/context/AuthContext'

// MODULE_CONFIG এ iconName string হিসেবে আছে, এখানে আসল component এ ম্যাপ করা হয়
const ICONS = {
  LayoutDashboard,
  ShoppingBag,
  ChefHat,
  Grid,
  Receipt,
  ReceiptText,
  Package,
  BookOpen,
  TrendingUp,
  Users,
  ShieldCheck,
  UserCheck,
  Settings,
  Undo2,
}

/**
 * Sidebar পুরোপুরি role-driven। `visibleModules` AuthContext থেকে আসে,
 * তাই cashier লগইন করলে Staff Management বা Reports বাটনটাই render হয় না।
 */
export const AdminSidebar = () => {
  const { user, profile, currentRoleInfo, visibleModules, logout } = useAuth()
  const navigate = useNavigate()

  // module গুলোকে তাদের `group` অনুযায়ী ভাগ করা হয়, ক্রম ঠিক রেখে
  const grouped = visibleModules.reduce((acc, mod) => {
    const key = mod.group || 'OTHER'
    if (!acc[key]) acc[key] = []
    acc[key].push(mod)
    return acc
  }, {})

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside style={styles.sidebar}>
      {/* Brand Header */}
      <div style={styles.brand}>
        <div style={styles.brandIcon}>
          <Coffee size={20} color="#FFFFFF" strokeWidth={2.4} />
        </div>
        <div>
          <h1 style={styles.brandName}>L'Aroma POS</h1>
          <div style={{ ...styles.brandSub, color: currentRoleInfo?.color }}>
            <span style={{ ...styles.roleIndicator, backgroundColor: currentRoleInfo?.color }} />
            <span>{(currentRoleInfo?.name || 'Staff').toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <div style={styles.navContainer}>
        {Object.entries(grouped).map(([groupName, items]) => (
          <div key={groupName} style={styles.navGroup}>
            <div style={styles.groupHeader}>{groupName}</div>
            <div style={styles.groupList}>
              {items.map((item) => {
                const Icon = ICONS[item.iconName] || Settings

                return (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    // `/dashboard` শুধু ঠিক ওই path এই active হবে, নাহলে সব সময় active দেখাবে
                    end={item.path === '/dashboard'}
                    style={({ isActive }) => ({
                      ...styles.navBtn,
                      backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
                      color: isActive ? '#FFFFFF' : 'var(--color-text-main)',
                      fontWeight: isActive ? 700 : 500,
                    })}
                  >
                    {({ isActive }) => (
                      <>
                        <span style={styles.navBtnLeft}>
                          <Icon size={18} color={isActive ? '#FFFFFF' : 'var(--color-primary-active)'} />
                          <span>{item.shortTitle || item.title}</span>
                        </span>

                        <span style={styles.navBtnRight}>
                          {item.isLiveBackend && (
                            <span
                              style={{
                                ...styles.miniBadge,
                                backgroundColor: isActive
                                  ? 'rgba(255, 255, 255, 0.25)'
                                  : 'rgba(98, 111, 72, 0.14)',
                                color: isActive ? '#FFFFFF' : 'var(--color-primary-active)',
                              }}
                            >
                              Live
                            </span>
                          )}
                          {isActive && <ChevronRight size={14} color="#FFFFFF" />}
                        </span>
                      </>
                    )}
                  </NavLink>
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
            {(profile?.full_name || user?.email || '?').charAt(0).toUpperCase()}
          </div>
          <div style={styles.userInfo}>
            <div style={styles.userDisplayName}>{profile?.full_name || 'Staff Member'}</div>
            <div style={styles.userDisplayRole}>{user?.email}</div>
          </div>
        </div>

        <button onClick={handleLogout} style={styles.logoutBtn} title="Sign Out">
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}

const styles = {
  sidebar: {
    width: '270px',
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
    padding: '22px 20px',
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
    flexShrink: 0,
  },
  brandName: {
    fontSize: '1.12rem',
    fontWeight: '800',
    color: 'var(--color-text-main)',
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
  },
  brandSub: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.7rem',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginTop: '2px',
  },
  roleIndicator: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
  },
  navContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  navGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  groupHeader: {
    fontSize: '0.66rem',
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
    fontSize: '0.86rem',
    textDecoration: 'none',
    minHeight: '44px',
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
    fontSize: '0.64rem',
    fontWeight: '700',
    padding: '2px 6px',
    borderRadius: '4px',
    textTransform: 'uppercase',
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
    minHeight: '42px',
  },
}
