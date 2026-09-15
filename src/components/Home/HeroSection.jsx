import React from 'react'
import { Coffee, ArrowRight, ShieldCheck, Zap, Sparkles, CheckCircle2 } from 'lucide-react'

export const HeroSection = ({ onOpenAuthModal }) => {
  const scrollToFeatures = () => {
    const el = document.getElementById('platform-showcase')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section style={styles.heroSection}>
      {/* Blended Aesthetic Welcome Hero */}
      <div style={styles.welcomeBar}>
        <div style={styles.welcomeContent}>
          <div style={styles.badgeRow}>
            <span style={styles.welcomeBadge}>
              <Coffee size={14} color="var(--color-primary-active)" />
              <span>Modern Artisanal Cafe Operations</span>
            </span>
          </div>

          <h1 style={styles.headline}>
            Next-Gen Cafe POS <br />
            <span style={styles.highlightText}>&amp; Management Suite</span>
          </h1>

          <p style={styles.description}>
            A streamlined, touch-first Point of Sale platform. Engineered for swift counter ordering, live floor tables, automated ingredient COGS, and Super Admin role governance.
          </p>

          <div style={styles.ctaRow}>
            <button
              onClick={onOpenAuthModal}
              style={styles.primaryBtn}
            >
              <span>Terminal Staff Sign In</span>
              <ArrowRight size={17} />
            </button>

            <button
              onClick={scrollToFeatures}
              style={styles.secondaryBtn}
            >
              <span>Explore Platform Features</span>
            </button>
          </div>

          <div style={styles.featurePills}>
            <div style={styles.pill}>
              <Zap size={13} color="var(--color-primary-active)" />
              <span>&lt; 3s Fast Checkout</span>
            </div>
            <div style={styles.pill}>
              <ShieldCheck size={13} color="var(--color-primary-active)" />
              <span>Super Admin RBAC</span>
            </div>
            <div style={styles.pill}>
              <Sparkles size={13} color="var(--color-primary-active)" />
              <span>BDT (৳) Localized</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

const styles = {
  heroSection: {
    padding: '24px 24px 16px',
    maxWidth: '1240px',
    margin: '0 auto',
    width: '100%',
  },
  welcomeBar: {
    backgroundImage: `
      linear-gradient(to right, 
        #EAE2D6 0%, 
        #EAE2D6 46%, 
        rgba(234, 226, 214, 0.94) 62%, 
        rgba(234, 226, 214, 0.45) 80%, 
        rgba(234, 226, 214, 0.15) 100%
      ), 
      url('/images/hero_pos.jpg')
    `,
    backgroundColor: 'var(--color-surface)',
    backgroundPosition: 'right center',
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
    border: '1.5px solid var(--color-border)',
    borderRadius: '24px',
    minHeight: '340px',
    display: 'flex',
    alignItems: 'center',
    padding: '48px 44px',
    boxShadow: 'var(--shadow-sm)',
    position: 'relative',
    overflow: 'hidden',
  },
  welcomeContent: {
    maxWidth: '560px',
    textAlign: 'left',
    zIndex: 2,
  },
  badgeRow: {
    marginBottom: '14px',
  },
  welcomeBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '5px 14px',
    backgroundColor: 'rgba(247, 242, 235, 0.94)',
    backdropFilter: 'blur(6px)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.78rem',
    fontWeight: '700',
    color: 'var(--color-primary-active)',
    letterSpacing: '0.03em',
  },
  headline: {
    fontSize: 'clamp(2.2rem, 4.2vw, 3.2rem)',
    fontWeight: '800',
    color: 'var(--color-text-main)',
    letterSpacing: '-0.03em',
    lineHeight: 1.15,
    marginBottom: '14px',
  },
  highlightText: {
    color: 'var(--color-primary-active)',
  },
  description: {
    fontSize: '1rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.6,
    marginBottom: '28px',
  },
  ctaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    flexWrap: 'wrap',
    marginBottom: '26px',
  },
  primaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '13px 26px',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    backgroundColor: 'var(--color-primary)',
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: '0.96rem',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(98, 111, 72, 0.35)',
    transition: 'all 0.2s',
  },
  secondaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '13px 22px',
    borderRadius: 'var(--radius-md)',
    border: '1.5px solid var(--color-border)',
    backgroundColor: 'rgba(247, 242, 235, 0.85)',
    color: 'var(--color-text-main)',
    fontWeight: '700',
    fontSize: '0.94rem',
    cursor: 'pointer',
    backdropFilter: 'blur(4px)',
    transition: 'all 0.2s',
  },
  featurePills: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  pill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.78rem',
    fontWeight: '600',
    color: 'var(--color-text-main)',
    backgroundColor: 'rgba(234, 226, 214, 0.7)',
    padding: '4px 10px',
    borderRadius: 'var(--radius-full)',
    border: '1px solid var(--color-border)',
  }
}
