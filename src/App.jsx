import React, { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Navbar } from './components/Home/Navbar'
import { HeroSection } from './components/Home/HeroSection'
import { PortalCards } from './components/Home/PortalCards'
import { RoleDashboardView } from './components/Home/RoleDashboardView'
import { AuthModal } from './components/Home/AuthModal'
import { IdleWarningModal } from './components/Home/IdleWarningModal'
import { Coffee, ShieldCheck, Sparkles } from 'lucide-react'

const MainContent = () => {
  const { user, role, canAccess } = useAuth()
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [initialRole, setInitialRole] = useState('cashier')
  const [activeNotification, setActiveNotification] = useState(null)

  const handleOpenAuth = (targetRole = 'cashier') => {
    setInitialRole(targetRole)
    setIsAuthModalOpen(true)
  }

  const handleSelectModule = (moduleId) => {
    if (!canAccess(moduleId)) {
      setActiveNotification({
        type: 'restricted',
        text: 'Access Restricted: This module requires Owner privileges.'
      })
      setTimeout(() => setActiveNotification(null), 3500)
      return
    }

    setActiveNotification({
      type: 'success',
      text: `Opening ${moduleId.toUpperCase()} module... (Session validated under role: ${role?.toUpperCase()})`
    })
    setTimeout(() => setActiveNotification(null), 3500)
  }

  return (
    <div style={styles.appWrapper}>
      {/* Navigation Bar */}
      <Navbar onOpenAuthModal={() => handleOpenAuth('cashier')} />

      {/* Floating Notification Toast */}
      {activeNotification && (
        <div 
          style={{
            ...styles.toast,
            backgroundColor: activeNotification.type === 'restricted' ? 'var(--color-danger-bg)' : 'var(--color-success-bg)',
            borderColor: activeNotification.type === 'restricted' ? 'var(--color-danger)' : 'var(--color-success)',
            color: activeNotification.type === 'restricted' ? 'var(--color-danger)' : 'var(--color-success)'
          }}
        >
          {activeNotification.type === 'restricted' ? <ShieldCheck size={18} /> : <Sparkles size={18} />}
          <span>{activeNotification.text}</span>
        </div>
      )}

      {/* Main Workspace Area */}
      <main style={styles.main}>
        {user ? (
          /* Authenticated Dashboard View */
          <div style={{ animation: 'fadeIn 0.3s ease', paddingTop: '24px' }}>
            <RoleDashboardView onSelectModule={handleSelectModule} />
          </div>
        ) : (
          /* Staff Welcome & Station Selection View */
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <HeroSection />
            <PortalCards 
              onOpenAuthModal={handleOpenAuth} 
              onSelectModule={handleSelectModule}
            />
          </div>
        )}
      </main>

      {/* Clean Staff Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerInner}>
          <div style={styles.footerBrand}>
            <div style={styles.footerLogoBadge}>
              <Coffee size={15} color="#FFFFFF" strokeWidth={2.2} />
            </div>
            <div>
              <div style={styles.footerBrandName}>L'Aroma Cafe POS</div>
              <div style={styles.footerBrandTagline}>Internal Operations &amp; Management System</div>
            </div>
          </div>

          <div style={styles.footerMeta}>
            <span>Staff Terminal • BDT (৳) Localized</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        initialRole={initialRole}
      />
      <IdleWarningModal />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  )
}

const styles = {
  appWrapper: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--color-bg)',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  toast: {
    position: 'fixed',
    top: '80px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 24px',
    borderRadius: 'var(--radius-full)',
    border: '1.5px solid',
    boxShadow: 'var(--shadow-lg)',
    fontSize: '0.88rem',
    fontWeight: '600',
    maxWidth: '92vw',
    animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  footer: {
    borderTop: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
    padding: '24px',
    marginTop: 'auto',
  },
  footerInner: {
    maxWidth: '1240px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
  },
  footerBrand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  footerLogoBadge: {
    width: '30px',
    height: '30px',
    borderRadius: '8px',
    backgroundColor: 'var(--color-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBrandName: {
    fontSize: '0.9rem',
    fontWeight: '700',
    color: 'var(--color-text-main)',
    lineHeight: 1.2,
  },
  footerBrandTagline: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
  },
  footerMeta: {
    fontSize: '0.8rem',
    color: 'var(--color-text-muted)',
    fontWeight: '500',
  }
}
