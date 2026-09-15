import React, { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Navbar } from './components/Home/Navbar'
import { HeroSection } from './components/Home/HeroSection'
import { PortalCards } from './components/Home/PortalCards'
import { RoleDashboardView } from './components/Home/RoleDashboardView'
import { AuthModal } from './components/Home/AuthModal'
import { IdleWarningModal } from './components/Home/IdleWarningModal'
import { Coffee, ShieldCheck, Sparkles } from 'lucide-react'

const MainContent = () => {
  const { user, role, canAccess, logout, markStaffConfirmed } = useAuth()
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [prefilledEmail, setPrefilledEmail] = useState('')
  const [authNotice, setAuthNotice] = useState(null)
  const [activeNotification, setActiveNotification] = useState(null)

  // Listen for confirmation email redirects
  // "erpor confirm mail e click krle sign in page e niye jbe"
  useEffect(() => {
    const checkConfirmation = async () => {
      const hash = window.location.hash
      const search = window.location.search

      if (
        hash.includes('confirm-signin') || 
        hash.includes('type=signup') || 
        search.includes('verified=true') || 
        hash.includes('access_token')
      ) {
        let emailParam = ''
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user?.email) {
            emailParam = session.user.email
          }
        } catch {}

        if (!emailParam) {
          try {
            const searchParams = new URLSearchParams(window.location.search)
            emailParam = searchParams.get('email') || ''

            if (!emailParam && window.location.hash.includes('?')) {
              const hashQuery = window.location.hash.split('?')[1]
              emailParam = new URLSearchParams(hashQuery).get('email') || ''
            }
            if (!emailParam && window.location.hash.includes('email=')) {
              const match = window.location.hash.match(/email=([^&]+)/)
              if (match) emailParam = decodeURIComponent(match[1])
            }
          } catch {}
        }

        try {
          await logout()
        } catch {}

        setIsAuthModalOpen(true)
        if (emailParam) {
          const cleanEmail = decodeURIComponent(emailParam)
          setPrefilledEmail(cleanEmail)
          try {
            await markStaffConfirmed(cleanEmail)
          } catch {}
        }
        setAuthNotice('🎉 Account email confirmed! Please sign in with your initial password.')
        setActiveNotification({
          type: 'success',
          text: 'Email verified successfully! Please sign in with your initial password.'
        })
        setTimeout(() => setActiveNotification(null), 4000)

        // Clean URL
        window.history.replaceState(null, '', window.location.pathname)
      }
    }

    checkConfirmation()
  }, [])

  const handleOpenAuth = () => {
    setPrefilledEmail('')
    setAuthNotice(null)
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
      text: `Opening ${moduleId.toUpperCase()} module...`
    })
    setTimeout(() => setActiveNotification(null), 3500)
  }

  return (
    <div style={styles.appWrapper}>
      {/* Navigation Bar */}
      <Navbar onOpenAuthModal={handleOpenAuth} />

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
          <button
            onClick={() => setActiveNotification(null)}
            style={styles.toastCloseBtn}
            title="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Workspace Area */}
      <main style={styles.main}>
        {user ? (
          /* Authenticated Dashboard View with Super Admin Sidebar */
          <div style={{ animation: 'fadeIn 0.25s ease', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <RoleDashboardView onSelectModule={handleSelectModule} />
          </div>
        ) : (
          /* Public Staff Welcome & Showcase View */
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <HeroSection onOpenAuthModal={handleOpenAuth} />
            <PortalCards
              onOpenAuthModal={handleOpenAuth}
              onSelectModule={handleSelectModule}
            />
          </div>
        )}
      </main>

      {/* Clean Staff Footer (shown when not in full dashboard or as standard footer) */}
      {!user && (
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
      )}

      {/* Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false)
          setPrefilledEmail('')
          setAuthNotice(null)
        }}
        prefilledEmail={prefilledEmail}
        authNotice={authNotice}
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
  toastCloseBtn: {
    background: 'none',
    border: 'none',
    color: 'currentColor',
    fontSize: '1.2rem',
    lineHeight: 1,
    cursor: 'pointer',
    padding: '0 4px',
    marginLeft: '6px',
    opacity: 0.8,
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
