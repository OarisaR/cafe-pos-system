import React from 'react'
import { 
  ShoppingBag, 
  Grid, 
  Receipt, 
  Package, 
  BookOpen, 
  TrendingUp, 
  Lock, 
  Unlock, 
  ArrowRight,
  ShieldCheck,
  Clock
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export const RoleDashboardView = ({ onSelectModule }) => {
  const { user, profile, role, canAccess } = useAuth()

  const modules = [
    {
      id: 'pos',
      title: 'Counter POS & Orders',
      subtitle: 'Create & manage Dine-in, Takeaway and Pick-up receipts with custom drink notes',
      icon: ShoppingBag,
      statusText: 'Touchscreen Register',
      color: 'var(--color-primary)'
    },
    {
      id: 'tables',
      title: 'Floor & Table Map',
      subtitle: 'Live visual floor occupancy, table merging for groups, and auto-release on payment',
      icon: Grid,
      statusText: 'Live Realtime Status',
      color: 'var(--color-primary)'
    },
    {
      id: 'billing',
      title: 'Billing & Payments',
      subtitle: 'Itemized bills, local VAT calculations, cash change return and bKash/Nagad QR',
      icon: Receipt,
      statusText: 'Fast Thermal Print',
      color: 'var(--color-primary)'
    },
    {
      id: 'inventory',
      title: 'Ingredient Inventory',
      subtitle: 'Real-time stock tracking with Low, Moderate, and High levels and reorder alerts',
      icon: Package,
      statusText: 'Stock Audit & Logs',
      color: '#626F48'
    },
    {
      id: 'menu',
      title: 'Menu & Recipe BOM',
      subtitle: 'Link menu beverages to raw ingredients for automatic cup-cost and margin calculation',
      icon: BookOpen,
      statusText: 'Recipe Cost Link',
      color: '#626F48'
    },
    {
      id: 'profit',
      title: 'Gross Margin & Profit',
      subtitle: 'Track daily gross profit margins, real-time COGS deductions, and sales summaries',
      icon: TrendingUp,
      statusText: 'Financial Reporting',
      color: '#626F48'
    }
  ]

  return (
    <section style={styles.container}>
      {/* Welcome Banner */}
      <div style={styles.banner}>
        <div style={styles.bannerLeft}>
          <div style={styles.rolePill}>
            <ShieldCheck size={16} />
            <span>Active Shift: {role === 'admin' ? 'Cafe Owner / Administrator' : 'Frontline Cashier'}</span>
          </div>
          <h2 style={styles.welcomeTitle}>
            Welcome back, {profile?.full_name || user?.email}
          </h2>
          <p style={styles.bannerSubtitle}>
            {role === 'admin' 
              ? 'You have unrestricted access to all counter operations, food costing, stock levels, and financial analytics.'
              : 'Your register terminal is ready for guest seating, instant counter orders, and bill settlements.'}
          </p>
        </div>

        <div style={styles.statsCard}>
          <div style={styles.statLabel}>Session Security</div>
          <div style={styles.statValue}>Active &amp; Protected</div>
          <div style={styles.statSub}>
            <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
            20-minute idle auto-lock enabled
          </div>
        </div>
      </div>

      {/* Modules Matrix */}
      <div style={styles.matrixHeader}>
        <div>
          <h3 style={styles.matrixTitle}>Operational Modules</h3>
          <p style={styles.matrixDesc}>
            {role === 'admin' 
              ? 'All business modules unlocked for administration' 
              : 'Frontline counter modules unlocked for your shift'}
          </p>
        </div>
      </div>

      <div style={styles.grid}>
        {modules.map((m) => {
          const Icon = m.icon
          const hasAccess = canAccess(m.id)

          return (
            <div 
              key={m.id}
              style={{
                ...styles.moduleCard,
                opacity: hasAccess ? 1 : 0.65,
                borderColor: hasAccess ? 'var(--color-border)' : 'rgba(220, 211, 196, 0.4)'
              }}
            >
              <div style={styles.cardTop}>
                <div 
                  style={{
                    ...styles.moduleIconBox,
                    backgroundColor: hasAccess ? m.color : 'var(--color-light)',
                    color: hasAccess ? '#FFFFFF' : 'var(--color-text-muted)'
                  }}
                >
                  <Icon size={24} />
                </div>

                <div>
                  {hasAccess ? (
                    <span style={styles.accessBadgeUnlocked}>
                      <Unlock size={12} />
                      <span>Ready</span>
                    </span>
                  ) : (
                    <span style={styles.accessBadgeLocked}>
                      <Lock size={12} />
                      <span>Owner Only</span>
                    </span>
                  )}
                </div>
              </div>

              <h4 style={styles.modTitle}>{m.title}</h4>
              <p style={styles.modSubtitle}>{m.subtitle}</p>

              <div style={styles.cardBottom}>
                <span style={styles.statusBadge}>{m.statusText}</span>

                <button
                  onClick={() => onSelectModule(m.id)}
                  disabled={!hasAccess}
                  style={{
                    ...styles.launchBtn,
                    backgroundColor: hasAccess ? 'var(--color-surface)' : 'var(--color-light)',
                    color: hasAccess ? 'var(--color-text-main)' : 'var(--color-text-muted)',
                    border: '1px solid var(--color-border)'
                  }}
                >
                  <span>{hasAccess ? 'Open' : 'Restricted'}</span>
                  {hasAccess ? <ArrowRight size={14} /> : <Lock size={14} />}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

const styles = {
  container: {
    maxWidth: '1240px',
    margin: '0 auto',
    padding: '0 24px 72px',
  },
  banner: {
    backgroundColor: 'var(--color-surface)',
    border: '1.5px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '36px',
    marginBottom: '40px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '24px',
    flexWrap: 'wrap',
    boxShadow: 'var(--shadow-sm)',
  },
  bannerLeft: {
    maxWidth: '700px',
  },
  rolePill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 14px',
    backgroundColor: 'var(--color-primary)',
    color: '#FFFFFF',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.78rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: '14px',
  },
  welcomeTitle: {
    fontSize: '1.85rem',
    color: 'var(--color-text-main)',
    marginBottom: '10px',
  },
  bannerSubtitle: {
    color: 'var(--color-text-muted)',
    fontSize: '0.98rem',
    lineHeight: 1.55,
  },
  statsCard: {
    backgroundColor: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    padding: '20px 24px',
    borderRadius: 'var(--radius-md)',
    textAlign: 'right',
    minWidth: '220px',
  },
  statLabel: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  statValue: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: 'var(--color-primary-active)',
    margin: '4px 0',
  },
  statSub: {
    fontSize: '0.78rem',
    color: 'var(--color-text-muted)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  matrixHeader: {
    marginBottom: '24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    gap: '8px',
  },
  matrixTitle: {
    fontSize: '1.35rem',
    color: 'var(--color-text-main)',
    marginBottom: '4px',
  },
  matrixDesc: {
    fontSize: '0.88rem',
    color: 'var(--color-text-muted)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: '24px',
  },
  moduleCard: {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '26px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    transition: 'all var(--transition-normal)',
  },
  cardTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '18px',
  },
  moduleIconBox: {
    width: '48px',
    height: '48px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(34, 42, 30, 0.1)',
  },
  accessBadgeUnlocked: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--color-success)',
    backgroundColor: 'var(--color-success-bg)',
    padding: '4px 10px',
    borderRadius: 'var(--radius-full)',
  },
  accessBadgeLocked: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--color-danger)',
    backgroundColor: 'var(--color-danger-bg)',
    padding: '4px 10px',
    borderRadius: 'var(--radius-full)',
  },
  modTitle: {
    fontSize: '1.15rem',
    color: 'var(--color-text-main)',
    marginBottom: '8px',
  },
  modSubtitle: {
    fontSize: '0.88rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.55,
    marginBottom: '24px',
    minHeight: '44px',
  },
  cardBottom: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: '16px',
    borderTop: '1px solid var(--color-border)',
  },
  statusBadge: {
    fontSize: '0.78rem',
    fontWeight: '600',
    color: 'var(--color-text-muted)',
  },
  launchBtn: {
    minHeight: '36px',
    padding: '6px 16px',
    fontSize: '0.84rem',
    borderRadius: 'var(--radius-sm)',
    fontWeight: '600',
  }
}
