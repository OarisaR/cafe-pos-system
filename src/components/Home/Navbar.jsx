import React, { useState, useEffect } from 'react'
import { Coffee, ShieldCheck, User, LogOut, Clock } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export const Navbar = ({ onOpenAuthModal }) => {
  const { user, profile, role, logout } = useAuth()
  const [time, setTime] = useState('')

  // Live Bangladesh Local Time (Asia/Dhaka)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const formatted = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Dhaka',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(now)
      setTime(formatted)
    }

    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <header style={styles.header}>
      <div style={styles.container}>
        {/* Brand */}
        <div style={styles.brand}>
          <div style={styles.logoBadge}>
            <Coffee size={22} color="#FFFFFF" strokeWidth={2.2} />
          </div>
          <div>
            <div style={styles.brandTitle}>L'Aroma</div>
            <div style={styles.brandSubtitle}>Cafe Operations Portal</div>
          </div>
        </div>

        {/* Center: Clean Local Ambiance */}
        <div style={styles.centerGroup}>
          <div style={styles.clockPill}>
            <span style={styles.statusDot} />
            <span style={styles.openText}>Open Now</span>
            <span style={styles.separator}>•</span>
            <Clock size={13} color="var(--color-primary-active)" />
            <span style={styles.clockText}>{time || 'Dhaka'}</span>
          </div>
        </div>

        {/* Right: Clean Auth Controls */}
        <div style={styles.rightGroup}>
          {user ? (
            <div style={styles.userProfile}>
              <div style={styles.userInfo}>
                <div style={styles.userName}>{profile?.full_name || user.email}</div>
                <div style={styles.roleContainer}>
                  <span style={role === 'admin' ? styles.adminBadge : styles.cashierBadge}>
                    <ShieldCheck size={11} />
                    {role === 'admin' ? 'Owner' : 'Cashier'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => logout()}
                style={styles.logoutBtn}
                title="Sign Out"
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="btn-primary"
              style={styles.signInBtn}
            >
              <User size={16} />
              <span>Staff Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

const styles = {
  header: {
    backgroundColor: 'var(--color-bg)',
    borderBottom: '1px solid var(--color-border)',
    padding: '16px 28px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    backdropFilter: 'blur(10px)',
  },
  container: {
    maxWidth: '1240px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '20px',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoBadge: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    backgroundColor: 'var(--color-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(139, 154, 110, 0.35)',
  },
  brandTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.25rem',
    fontWeight: '700',
    color: 'var(--color-text-main)',
    letterSpacing: '-0.02em',
    lineHeight: 1.15,
  },
  brandSubtitle: {
    fontSize: '0.74rem',
    color: 'var(--color-text-muted)',
    fontWeight: '500',
    letterSpacing: '0.02em',
  },
  centerGroup: {
    display: 'flex',
    alignItems: 'center',
  },
  clockPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 14px',
    backgroundColor: 'var(--color-surface)',
    borderRadius: 'var(--radius-full)',
    border: '1px solid var(--color-border)',
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'var(--color-text-main)',
  },
  statusDot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-primary)',
  },
  openText: {
    color: 'var(--color-primary-active)',
    fontWeight: '600',
  },
  separator: {
    color: 'var(--color-border)',
  },
  clockText: {
    fontVariantNumeric: 'tabular-nums',
    color: 'var(--color-text-muted)',
  },
  rightGroup: {
    display: 'flex',
    alignItems: 'center',
  },
  userProfile: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: 'var(--color-surface)',
    padding: '4px 6px 4px 14px',
    borderRadius: 'var(--radius-full)',
    border: '1px solid var(--color-border)',
  },
  userInfo: {
    textAlign: 'right',
  },
  userName: {
    fontSize: '0.84rem',
    fontWeight: '600',
    color: 'var(--color-text-main)',
  },
  roleContainer: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  adminBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '0.68rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#FFFFFF',
    backgroundColor: 'var(--color-primary)',
    padding: '1px 7px',
    borderRadius: '999px',
  },
  cashierBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '0.68rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    color: 'var(--color-text-main)',
    backgroundColor: 'var(--color-light)',
    border: '1px solid var(--color-border)',
    padding: '1px 7px',
    borderRadius: '999px',
  },
  logoutBtn: {
    minHeight: '32px',
    padding: '4px 12px',
    backgroundColor: 'var(--color-light)',
    color: 'var(--color-danger)',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.78rem',
    border: '1px solid var(--color-border)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  signInBtn: {
    borderRadius: 'var(--radius-full)',
    padding: '10px 22px',
    fontSize: '0.9rem',
  }
}
