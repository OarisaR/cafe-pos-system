import React from 'react'
import { Clock, ShieldAlert, LogOut, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export const IdleWarningModal = () => {
  const { showIdleWarning, idleSecondsLeft, keepSessionAlive, logout } = useAuth()

  if (!showIdleWarning) return null

  const minutes = Math.floor(idleSecondsLeft / 60)
  const seconds = idleSecondsLeft % 60
  const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`

  return (
    <div className="modal-overlay" style={{ zIndex: 2000 }}>
      <div className="modal-card" style={styles.card}>
        <div style={styles.iconCircle}>
          <Clock size={32} color="#FFFFFF" />
        </div>

        <h3 style={styles.title}>Session Inactivity Warning</h3>
        
        <p style={styles.desc}>
          In accordance with security rule <strong>[FR-AUT-05]</strong>, idle terminal sessions automatically terminate after 20 minutes to prevent unauthorized access.
        </p>

        <div style={styles.timerBox}>
          <div style={styles.timerLabel}>Automatic Sign-out In</div>
          <div style={styles.countdown}>{formattedTime}</div>
        </div>

        <div style={styles.actions}>
          <button 
            onClick={keepSessionAlive} 
            className="btn-primary"
            style={styles.keepBtn}
          >
            <CheckCircle2 size={18} />
            <span>Keep Session Active</span>
          </button>

          <button 
            onClick={() => logout('Logged out manually from inactivity prompt')} 
            className="btn-secondary"
            style={styles.logoutBtn}
          >
            <LogOut size={16} />
            <span>Sign Out Now</span>
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  card: {
    textAlign: 'center',
    padding: '36px 28px',
    maxWidth: '440px',
  },
  iconCircle: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-warning)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
    boxShadow: '0 8px 20px rgba(178, 106, 0, 0.25)',
  },
  title: {
    fontSize: '1.4rem',
    color: 'var(--color-text-main)',
    marginBottom: '10px',
  },
  desc: {
    color: 'var(--color-text-muted)',
    fontSize: '0.9rem',
    lineHeight: 1.5,
    marginBottom: '24px',
  },
  timerBox: {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '16px',
    marginBottom: '28px',
  },
  timerLabel: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: '4px',
  },
  countdown: {
    fontSize: '2.5rem',
    fontWeight: '800',
    color: 'var(--color-warning)',
    fontFamily: 'var(--font-display)',
    fontVariantNumeric: 'tabular-nums',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  keepBtn: {
    width: '100%',
    padding: '14px',
    fontSize: '1rem',
  },
  logoutBtn: {
    width: '100%',
    padding: '12px',
    fontSize: '0.9rem',
  }
}
