import React from 'react'
import { 
  ShoppingBag, 
  Grid, 
  Package, 
  ShieldCheck, 
  ArrowRight, 
  Check, 
  Lock, 
  Zap,
  Sparkles,
  Users
} from 'lucide-react'

export const PortalCards = ({ onOpenAuthModal }) => {
  const showcaseFeatures = [
    {
      id: 'pos_counter',
      image: '/images/counter_speed.jpg',
      badge: 'Frontline Register',
      title: 'Counter POS & Fast Billing',
      subtitle: 'High-speed drink creation with customized milk, sweetness, and shot options. Thermal receipt generation and instant cash change calculation.',
      points: [
        'Touch-first register layout (< 3 seconds checkout)',
        'Cash, bKash, Nagad QR & Card settlements',
        'Configurable NBR VAT & itemized receipts'
      ]
    },
    {
      id: 'floor_tables',
      image: '/images/dining_tables.jpg',
      badge: 'Floor Management',
      title: 'Visual Floor Map & Tables',
      subtitle: 'Live visual occupancy monitoring with color-coded table states. Seamless table merging for large parties and auto-release on payment.',
      points: [
        'Color-coded states: Empty, Occupied, Reserved, Cleaning',
        'Instant table assignment and guest headcount',
        'Automatic table release upon bill clearance'
      ]
    },
    {
      id: 'inventory_craft',
      image: '/images/ingredients_craft.jpg',
      badge: 'Kitchen & Pantry',
      title: 'Ingredient Stock & Recipe BOM',
      subtitle: 'Precision consumption of espresso beans, dairy, and syrups per cup brewed. Automatic daily gross profit margins and restock alerts.',
      points: [
        'Automatic ingredient deduction per recipe sold',
        'Low, Moderate, and High stock threshold badges',
        'Arithmetic precision COGS & gross margin reporting'
      ]
    },
    {
      id: 'admin_control',
      image: '/images/hero_pos.jpg',
      badge: 'Master Governance',
      title: 'Super Admin & Dynamic Roles',
      subtitle: 'Sole administrative governance over personnel. Create arbitrary permission groups with granular View and Edit control per module.',
      points: [
        'Email verification dispatch via Supabase Auth',
        'Initial temporary password & phone records',
        'Dynamic custom permission groups & rights matrix'
      ]
    }
  ]

  return (
    <section id="platform-showcase" style={styles.section}>
      {/* Section Heading */}
      <div style={styles.sectionHeader}>
        <div style={styles.sectionBadge}>
          <Sparkles size={14} />
          <span>Operational Capabilities</span>
        </div>
        <h2 style={styles.sectionTitle}>Engineered for Every Cafe Touchpoint</h2>
        <p style={styles.sectionSubtitle}>
          A cohesive ecosystem linking your frontline baristas, floor attendants, inventory pantry, and executive ownership into one fluid interface.
        </p>
      </div>

      {/* 4 Feature Showcase Cards with Static Images */}
      <div style={styles.grid}>
        {showcaseFeatures.map((feat) => (
          <div key={feat.id} style={styles.card}>
            {/* Top Photo Frame */}
            <div style={styles.imageWrapper}>
              <img
                src={feat.image}
                alt={feat.title}
                style={styles.cardImage}
                loading="lazy"
              />
              <div style={styles.imageOverlay} />
              <span style={styles.imageBadge}>{feat.badge}</span>
            </div>

            {/* Card Body */}
            <div style={styles.cardContent}>
              <h3 style={styles.cardTitle}>{feat.title}</h3>
              <p style={styles.cardSubtitle}>{feat.subtitle}</p>

              <div style={styles.pointsList}>
                {feat.points.map((pt, i) => (
                  <div key={i} style={styles.pointItem}>
                    <div style={styles.checkIconBox}>
                      <Check size={12} color="var(--color-primary-active)" strokeWidth={3} />
                    </div>
                    <span>{pt}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Callout Banner */}
      <div style={styles.calloutCard}>
        <div style={styles.calloutLeft}>
          <div style={styles.calloutBadge}>
            <ShieldCheck size={15} />
            <span>Secure Staff Access</span>
          </div>
          <h3 style={styles.calloutTitle}>Ready to begin your shift or manage your cafe?</h3>
          <p style={styles.calloutDesc}>
            Log into your staff terminal with your verified email and password. Super Admin will manage your assigned permission group.
          </p>
        </div>

        <button
          onClick={onOpenAuthModal}
          style={styles.calloutBtn}
        >
          <span>Staff Terminal Sign In</span>
          <ArrowRight size={17} />
        </button>
      </div>
    </section>
  )
}

const styles = {
  section: {
    maxWidth: '1240px',
    margin: '0 auto',
    padding: '24px 24px 72px',
    width: '100%',
  },
  sectionHeader: {
    textAlign: 'center',
    maxWidth: '720px',
    margin: '0 auto 48px',
  },
  sectionBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 14px',
    backgroundColor: 'rgba(98, 111, 72, 0.14)',
    color: 'var(--color-primary-active)',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.78rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: '12px',
  },
  sectionTitle: {
    fontSize: 'clamp(1.8rem, 3.2vw, 2.4rem)',
    fontWeight: '800',
    color: 'var(--color-text-main)',
    letterSpacing: '-0.02em',
    marginBottom: '12px',
  },
  sectionSubtitle: {
    fontSize: '1rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.6,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
    marginBottom: '40px',
  },
  card: {
    backgroundColor: 'var(--color-surface)',
    border: '1.5px solid var(--color-border)',
    borderRadius: '20px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: 'var(--shadow-sm)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  imageWrapper: {
    position: 'relative',
    height: '210px',
    width: '100%',
    overflow: 'hidden',
    backgroundColor: 'var(--color-bg)',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'transform 0.3s ease',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(180deg, rgba(34, 42, 30, 0.15) 0%, rgba(34, 42, 30, 0.55) 100%)',
  },
  imageBadge: {
    position: 'absolute',
    top: '14px',
    left: '14px',
    backgroundColor: 'rgba(247, 242, 235, 0.92)',
    backdropFilter: 'blur(6px)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-primary-active)',
    fontSize: '0.74rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    padding: '4px 10px',
    borderRadius: 'var(--radius-full)',
  },
  cardContent: {
    padding: '24px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  cardTitle: {
    fontSize: '1.25rem',
    fontWeight: '800',
    color: 'var(--color-text-main)',
    marginBottom: '8px',
    letterSpacing: '-0.01em',
  },
  cardSubtitle: {
    fontSize: '0.88rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.55,
    marginBottom: '18px',
  },
  pointsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: 'auto',
    paddingTop: '14px',
    borderTop: '1px solid var(--color-border)',
  },
  pointItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    fontSize: '0.82rem',
    color: 'var(--color-text-main)',
    lineHeight: 1.45,
  },
  checkIconBox: {
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    backgroundColor: 'rgba(98, 111, 72, 0.16)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: '1px',
  },
  calloutCard: {
    backgroundColor: 'var(--color-surface)',
    border: '1.5px solid var(--color-border)',
    borderRadius: '20px',
    padding: '36px 40px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '24px',
    flexWrap: 'wrap',
    boxShadow: 'var(--shadow-sm)',
  },
  calloutLeft: {
    maxWidth: '680px',
  },
  calloutBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.76rem',
    fontWeight: '700',
    color: 'var(--color-primary-active)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: '8px',
  },
  calloutTitle: {
    fontSize: '1.5rem',
    fontWeight: '800',
    color: 'var(--color-text-main)',
    marginBottom: '6px',
    letterSpacing: '-0.02em',
  },
  calloutDesc: {
    fontSize: '0.94rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.55,
  },
  calloutBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '14px 28px',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    backgroundColor: 'var(--color-primary)',
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: '0.96rem',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(98, 111, 72, 0.3)',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s',
  }
}
