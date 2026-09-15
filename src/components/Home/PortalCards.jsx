import React from 'react'
import { ArrowRight, ShoppingBag, Grid, Package, ShieldCheck } from 'lucide-react'

export const PortalCards = ({ onOpenAuthModal }) => {
  const showcaseFeatures = [
    {
      id: 'pos_counter',
      image: '/images/counter_speed.jpg',
      badge: 'Frontline Register',
      icon: <ShoppingBag size={18} color="var(--color-primary-active)" />,
      title: 'Counter POS & Fast Billing',
      description: 'Touch-first order entry, drink customizations, thermal receipt printing, and instant change calculation.',
    },
    {
      id: 'floor_tables',
      image: '/images/dining_tables.jpg',
      badge: 'Floor Operations',
      icon: <Grid size={18} color="var(--color-primary-active)" />,
      title: 'Visual Floor Map & Tables',
      description: 'Live occupancy monitoring with color-coded table states, party merging, and auto-release on payment.',
    },
    {
      id: 'inventory_craft',
      image: '/images/ingredients_craft.jpg',
      badge: 'Kitchen & Pantry',
      icon: <Package size={18} color="var(--color-primary-active)" />,
      title: 'Ingredient Stock & Recipe BOM',
      description: 'Automatic ingredient deduction per cup sold, real-time low stock alerts, and precise COGS tracking.',
    },
    {
      id: 'staff_governance',
      image: '/images/hero_pos.jpg',
      badge: 'Staff & Security',
      icon: <ShieldCheck size={18} color="var(--color-primary-active)" />,
      title: 'Staff & Role Governance',
      description: 'Role-based access control, modular permission groups, and secure terminal station management.',
    }
  ]

  return (
    <section id="platform-showcase" style={styles.section}>
      {/* Minimal Clean Header */}
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>System Modules</h2>
        <p style={styles.sectionSubtitle}>
          Core functional capabilities aligned with standard cafe workflow requirements.
        </p>
      </div>

      {/* Alternating Zig-Zag Layout (Image + Text, then Reversed) */}
      <div style={styles.listContainer}>
        {showcaseFeatures.map((feat, index) => {
          const isReverse = index % 2 !== 0 // Odd rows: Text left, Image right

          return (
            <div
              key={feat.id}
              style={{
                ...styles.row,
                flexDirection: isReverse ? 'row-reverse' : 'row',
              }}
            >
              {/* Image Column */}
              <div style={styles.imageColumn}>
                <div style={styles.imageWrapper}>
                  <img
                    src={feat.image}
                    alt={feat.title}
                    style={styles.featureImage}
                    loading="lazy"
                  />
                </div>
              </div>

              {/* Text Column */}
              <div style={styles.textColumn}>
                <div style={styles.badgeRow}>
                  <div style={styles.badge}>
                    {feat.icon}
                    <span>{feat.badge}</span>
                  </div>
                </div>

                <h3 style={styles.rowTitle}>{feat.title}</h3>

                <p style={styles.rowDesc}>{feat.description}</p>

                <div>
                  <button
                    onClick={onOpenAuthModal}
                    style={styles.actionBtn}
                  >
                    <span>Launch Module</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

const styles = {
  section: {
    maxWidth: '1240px',
    margin: '0 auto',
    padding: '36px 24px 64px',
  },
  sectionHeader: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  sectionTitle: {
    fontSize: 'clamp(1.6rem, 2.5vw, 2.1rem)',
    fontWeight: '800',
    color: 'var(--color-text-main)',
    letterSpacing: '-0.02em',
    marginBottom: '6px',
  },
  sectionSubtitle: {
    fontSize: '0.94rem',
    color: 'var(--color-text-muted)',
    maxWidth: '520px',
    margin: '0 auto',
    lineHeight: 1.5,
  },
  listContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '40px',
    backgroundColor: 'var(--color-surface)',
    border: '1.5px solid var(--color-border)',
    borderRadius: '20px',
    padding: '24px 28px',
    boxShadow: 'var(--shadow-sm)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  imageColumn: {
    flex: '1 1 45%',
    maxWidth: '480px',
    width: '100%',
  },
  imageWrapper: {
    width: '100%',
    height: '240px',
    borderRadius: '14px',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#EAE2D6',
  },
  featureImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
    transition: 'transform 0.35s ease',
  },
  textColumn: {
    flex: '1 1 55%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    textAlign: 'left',
  },
  badgeRow: {
    marginBottom: '10px',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    backgroundColor: 'rgba(98, 111, 72, 0.08)',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.78rem',
    fontWeight: '700',
    color: 'var(--color-primary-active)',
    letterSpacing: '0.02em',
  },
  rowTitle: {
    fontSize: '1.35rem',
    fontWeight: '800',
    color: 'var(--color-text-main)',
    letterSpacing: '-0.02em',
    marginBottom: '8px',
  },
  rowDesc: {
    fontSize: '0.95rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.55,
    marginBottom: '18px',
  },
  actionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    backgroundColor: 'transparent',
    border: '1.5px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-text-main)',
    fontSize: '0.85rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  }
}
