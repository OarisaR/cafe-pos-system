import React from 'react'
import { Coffee } from 'lucide-react'

export const HeroSection = () => {
  return (
    <section style={styles.heroSection}>
      {/* Blended Aesthetic Welcome Bar */}
      <div style={styles.welcomeBar}>
        <div style={styles.welcomeContent}>
          <div style={styles.badgeRow}>
            <span style={styles.welcomeBadge}>
              <Coffee size={13} color="var(--color-primary-active)" />
              <span>L'Aroma Staff Portal</span>
            </span>
          </div>

          <h1 style={styles.headline}>
            Welcome to <br />
            <span style={styles.highlightText}>L'Aroma Cafe</span>
          </h1>

          <p style={styles.description}>
            Point of Sale &amp; Management System. Choose your station below to begin your shift.
          </p>
        </div>
      </div>
    </section>
  )
}

const styles = {
  heroSection: {
    padding: '28px 24px 16px',
    maxWidth: '1240px',
    margin: '0 auto',
    width: '100%',
  },
  welcomeBar: {
    /* Seamless linear gradient blend into the still-life coffee, matcha & milk photo */
    backgroundImage: `
      linear-gradient(to right, 
        #EAE2D6 0%, 
        #EAE2D6 42%, 
        rgba(234, 226, 214, 0.94) 55%, 
        rgba(234, 226, 214, 0.4) 75%, 
        rgba(234, 226, 214, 0.1) 100%
      ), 
      url('/images/hero_pos.jpg')
    `,
    backgroundColor: 'var(--color-surface)',
    backgroundPosition: 'right center',
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
    border: '1.5px solid var(--color-border)',
    borderRadius: '24px',
    minHeight: '260px',
    display: 'flex',
    alignItems: 'center',
    padding: '36px 44px',
    boxShadow: 'var(--shadow-sm)',
    position: 'relative',
    overflow: 'hidden',
  },
  welcomeContent: {
    maxWidth: '500px',
    textAlign: 'left',
    zIndex: 2,
  },
  badgeRow: {
    marginBottom: '12px',
  },
  welcomeBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    backgroundColor: 'rgba(247, 242, 235, 0.9)',
    backdropFilter: 'blur(4px)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.76rem',
    fontWeight: '700',
    color: 'var(--color-primary-active)',
    letterSpacing: '0.02em',
  },
  headline: {
    fontSize: 'clamp(2rem, 3.8vw, 2.9rem)',
    fontWeight: '800',
    color: 'var(--color-text-main)',
    letterSpacing: '-0.03em',
    lineHeight: 1.15,
    marginBottom: '12px',
  },
  highlightText: {
    color: 'var(--color-primary-active)',
  },
  description: {
    fontSize: '0.98rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.55,
  }
}
