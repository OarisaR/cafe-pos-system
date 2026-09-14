import React from 'react'
import { Monitor, LayoutDashboard, ArrowRight, Lock } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export const PortalCards = ({ onOpenAuthModal, onSelectModule }) => {
  const { user, role } = useAuth()

  const handleCashierClick = () => {
    if (!user) {
      onOpenAuthModal('cashier')
    } else {
      onSelectModule('pos')
    }
  }

  const handleAdminClick = () => {
    if (!user) {
      onOpenAuthModal('admin')
    } else if (role !== 'admin') {
      alert("Management Access Required: Inventory, Recipe Costing, and Financial Reports are reserved for the Cafe Owner.")
    } else {
      onSelectModule('inventory')
    }
  }

  return (
    <section style={styles.section}>
      <div style={styles.grid}>
        {/* Card 1: Front Counter Register (Cashier) */}
        <div style={styles.card}>
          <div>
            <div style={styles.cardTop}>
              <div style={styles.iconBoxCashier}>
                <Monitor size={22} color="#FFFFFF" strokeWidth={2.2} />
              </div>
              <span style={styles.badgeCashier}>Cashier Station</span>
            </div>

            <h3 style={styles.title}>Front Counter POS</h3>
            <p style={styles.subtitle}>
              Fast order entry, live table occupancy, and quick payment checkout.
            </p>

            <div style={styles.tagRow}>
              <span style={styles.tag}>Dine-In &amp; Takeaway</span>
              <span style={styles.tag}>Table Map</span>
              <span style={styles.tag}>Cash &amp; MFS</span>
            </div>
          </div>

          <div style={styles.cardBottom}>
            <button 
              onClick={handleCashierClick}
              className="btn-primary"
              style={styles.actionBtn}
            >
              <span>{user && role === 'cashier' ? 'Open Terminal' : 'Start Cashier Shift'}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Card 2: Owner Management Suite */}
        <div style={{ ...styles.card, ...styles.cardAdmin }}>
          <div>
            <div style={styles.cardTop}>
              <div style={styles.iconBoxAdmin}>
                <LayoutDashboard size={22} color="#FFFFFF" strokeWidth={2.2} />
              </div>
              <span style={styles.badgeAdmin}>Owner / Admin</span>
            </div>

            <h3 style={styles.title}>Management Suite</h3>
            <p style={styles.subtitle}>
              Real-time ingredient stocks, recipe costing, and daily gross margins.
            </p>

            <div style={styles.tagRow}>
              <span style={styles.tag}>Inventory &amp; Alerts</span>
              <span style={styles.tag}>Recipe BOM</span>
              <span style={styles.tag}>Sales Margins</span>
            </div>
          </div>

          <div style={styles.cardBottom}>
            <button 
              onClick={handleAdminClick}
              style={{
                ...styles.actionBtn,
                backgroundColor: user && role === 'cashier' ? 'var(--color-light)' : '#626F48',
                color: user && role === 'cashier' ? 'var(--color-text-muted)' : '#FFFFFF'
              }}
            >
              {user && role === 'cashier' ? (
                <>
                  <Lock size={15} />
                  <span>Owner Privileges Required</span>
                </>
              ) : (
                <>
                  <span>{user && role === 'admin' ? 'Open Suite' : 'Access Owner Suite'}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

const styles = {
  section: {
    maxWidth: '1240px',
    margin: '0 auto',
    padding: '12px 24px 56px',
    width: '100%',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '24px',
  },
  card: {
    backgroundColor: 'var(--color-surface)',
    border: '1.5px solid var(--color-border)',
    borderRadius: '22px',
    padding: '32px 30px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    boxShadow: 'var(--shadow-sm)',
    transition: 'transform var(--transition-fast), box-shadow var(--transition-fast), border-color var(--transition-fast)',
    minHeight: '260px',
  },
  cardAdmin: {
    backgroundColor: '#E7DFD2',
  },
  cardTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
  },
  iconBoxCashier: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    backgroundColor: 'var(--color-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 10px rgba(139, 154, 110, 0.3)',
  },
  iconBoxAdmin: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    backgroundColor: '#626F48',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 10px rgba(98, 111, 72, 0.3)',
  },
  badgeCashier: {
    fontSize: '0.72rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--color-primary-active)',
    backgroundColor: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    padding: '4px 12px',
    borderRadius: 'var(--radius-full)',
  },
  badgeAdmin: {
    fontSize: '0.72rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#4B5537',
    backgroundColor: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    padding: '4px 12px',
    borderRadius: 'var(--radius-full)',
  },
  title: {
    fontSize: '1.45rem',
    fontWeight: '700',
    color: 'var(--color-text-main)',
    marginBottom: '8px',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: '0.92rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.5,
    marginBottom: '20px',
  },
  tagRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '28px',
  },
  tag: {
    fontSize: '0.76rem',
    fontWeight: '600',
    color: 'var(--color-text-main)',
    backgroundColor: 'var(--color-light)',
    border: '1px solid var(--color-border)',
    padding: '4px 10px',
    borderRadius: 'var(--radius-sm)',
  },
  cardBottom: {
    marginTop: 'auto',
  },
  actionBtn: {
    width: '100%',
    padding: '13px 20px',
    fontSize: '0.95rem',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  }
}
