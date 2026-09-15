import React from 'react'
import { Coffee, ArrowRight } from 'lucide-react'

export const HeroSection = ({ onOpenAuthModal }) => {
  const scrollToFeatures = () => {
    const el = document.getElementById('platform-showcase')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section style={styles.heroSection}>
      {/* Minimal Polished Welcome Bar */}
      <div style={styles.welcomeBar}>
        <div style={styles.welcomeContent}>
          <div style={styles.badgeRow}>
            <span style={styles.welcomeBadge}>
              <Coffee size={14} color="var(--color-primary-active)" />
              <span>Cafe Terminal &amp; Operations</span>
            </span>
          </div>

          <h1 style={styles.headline}>
            Welcome to <span style={styles.highlightText}>L'Aroma Cafe POS</span>
          </h1>

          <p style={styles.description}>
            Point of Sale, Live Floor Tables &amp; Kitchen Operations.
          </p>

          <div style={styles.ctaRow}>
            <button
              onClick={onOpenAuthModal}
              style={styles.primaryBtn}
            >
              <span>Terminal Staff Sign In</span>
              <ArrowRight size={16} />
            </button>

            <button
              onClick={scrollToFeatures}
              style={styles.secondaryBtn}
            >
              <span>Explore System Modules</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

const styles = {
  heroSection: {
    padding: '20px 24px 12px',
    maxWidth: '1240px',
    margin: '0 auto',
    width: '100%',
  },
  welcomeBar: {
    backgroundImage: `
      linear-gradient(to right, 
        #EAE2D6 0%, 
        rgba(234, 226, 214, 0.97) 36%, 
        rgba(234, 226, 214, 0.65) 52%, 
        rgba(234, 226, 214, 0.12) 70%, 
        transparent 100%
      ), 
      url('/images/hero_pos.jpg')
    `,
    backgroundColor: 'var(--color-surface)',
    backgroundPosition: 'right center',
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
    border: '1.5px solid var(--color-border)',
    borderRadius: '20px',
    minHeight: '260px',
    display: 'flex',
    alignItems: 'center',
    padding: '36px 40px',
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
    marginBottom: '10px',
  },
  welcomeBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    backgroundColor: 'rgba(247, 242, 235, 0.95)',
    backdropFilter: 'blur(6px)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.78rem',
    fontWeight: '700',
    color: 'var(--color-primary-active)',
    letterSpacing: '0.02em',
  },
  headline: {
    fontSize: 'clamp(1.8rem, 3.4vw, 2.6rem)',
    fontWeight: '800',
    color: 'var(--color-text-main)',
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
    marginBottom: '8px',
  },
  highlightText: {
    color: 'var(--color-primary-active)',
  },
  description: {
    fontSize: '1rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.5,
    marginBottom: '20px',
    fontWeight: '500',
  },
  ctaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  primaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '11px 22px',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    backgroundColor: 'var(--color-primary)',
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: '0.92rem',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(98, 111, 72, 0.3)',
    transition: 'all 0.2s',
  },
  secondaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '11px 18px',
    borderRadius: 'var(--radius-md)',
    border: '1.5px solid var(--color-border)',
    backgroundColor: 'rgba(247, 242, 235, 0.88)',
    color: 'var(--color-text-main)',
    fontWeight: '700',
    fontSize: '0.9rem',
    cursor: 'pointer',
    backdropFilter: 'blur(4px)',
    transition: 'all 0.2s',
  },
}
