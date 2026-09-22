import React from 'react'
import { Navigate, useLocation, Link } from 'react-router-dom'
import { Coffee, ShieldAlert, ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

/** session পড়া শেষ না হওয়া পর্যন্ত এই লোডারটা দেখানো হয়। */
export const AuthLoadingScreen = () => (
  <div style={styles.loaderPage}>
    <div style={styles.loaderBadge}>
      <Coffee size={28} color="#FFFFFF" strokeWidth={2.2} />
    </div>
    <div style={styles.loaderText}>Checking your session…</div>
  </div>
)

/**
 * লগইন না করা থাকলে /login এ পাঠায়।
 * `module` দেওয়া থাকলে role অনুযায়ী সেই module এর অনুমতিও যাচাই করে।
 */
export const ProtectedRoute = ({ module = null, children }) => {
  const { user, initializing, canAccess, landingPath } = useAuth()
  const location = useLocation()

  if (initializing) return <AuthLoadingScreen />

  // ১) লগইন করা নেই → login পেজ, আর কোথায় যেতে চেয়েছিল সেটা মনে রাখা হয়
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  // ২) লগইন আছে কিন্তু এই module এ অনুমতি নেই → "Access Restricted"
  if (module && !canAccess(module)) {
    return <AccessDenied landingPath={landingPath} />
  }

  return children
}

const AccessDenied = ({ landingPath }) => {
  const { currentRoleInfo } = useAuth()

  return (
    <div style={styles.deniedWrapper}>
      <div style={styles.deniedCard}>
        <div style={styles.deniedIcon}>
          <ShieldAlert size={34} color="var(--color-danger)" />
        </div>
        <h2 style={styles.deniedTitle}>Access Restricted</h2>
        <p style={styles.deniedText}>
          Your permission group grants you the <strong>{currentRoleInfo?.name}</strong>{' '}
          role, which does not include this module. Contact the cafe Owner if you need
          access.
        </p>
        <Link to={landingPath} replace style={styles.deniedBtn}>
          <ArrowLeft size={16} />
          <span>Back to my workspace</span>
        </Link>
      </div>
    </div>
  )
}

const styles = {
  loaderPage: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    backgroundColor: 'var(--color-bg)',
  },
  loaderBadge: {
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    backgroundColor: 'var(--color-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'pulseDot 1.4s ease-in-out infinite',
  },
  loaderText: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'var(--color-text-muted)',
  },
  deniedWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 24px',
  },
  deniedCard: {
    maxWidth: '480px',
    width: '100%',
    textAlign: 'center',
    backgroundColor: 'var(--color-surface)',
    border: '1.5px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '44px 32px',
    boxShadow: 'var(--shadow-sm)',
  },
  deniedIcon: {
    width: '70px',
    height: '70px',
    borderRadius: '20px',
    backgroundColor: 'var(--color-danger-bg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 18px',
  },
  deniedTitle: {
    fontSize: '1.5rem',
    fontWeight: '800',
    marginBottom: '10px',
  },
  deniedText: {
    fontSize: '0.92rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.65,
    marginBottom: '24px',
  },
  deniedBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 22px',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--color-primary)',
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: '0.9rem',
    textDecoration: 'none',
  },
}
