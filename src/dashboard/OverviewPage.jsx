// =========================================================================
// MODULE OWNER: Person 1 — Auth & Roles
// Route: /dashboard   (Owner ও Manager দেখতে পায়)
//
// Owner লগইন করলে সবার আগে এই পেজটাই আসে। এখানে তার role, তার জন্য
// খোলা module গুলো, আর টিমের কার কোন module সেটা এক নজরে দেখা যায়।
// =========================================================================
import React from 'react'
import { Link } from 'react-router-dom'
import {
  LayoutDashboard,
  ShoppingBag,
  Grid,
  Receipt,
  Package,
  BookOpen,
  TrendingUp,
  Users,
  ShieldCheck,
  UserCheck,
  Settings,
  ArrowRight,
} from 'lucide-react'
import { useAuth } from '../authentication/context/AuthContext'
import { MODULE_CONFIG } from '../authentication/constants/rbac'

const ICONS = {
  LayoutDashboard,
  ShoppingBag,
  Grid,
  Receipt,
  Package,
  BookOpen,
  TrendingUp,
  Users,
  ShieldCheck,
  UserCheck,
  Settings,
}

export const OverviewPage = () => {
  const { profile, currentRoleInfo, visibleModules, canEdit } = useAuth()

  // নিজের পেজটা quick-link এ দেখানোর দরকার নেই
  const quickLinks = visibleModules.filter((m) => m.path !== '/dashboard')

  return (
    <div style={styles.wrap}>
      {/* Welcome banner */}
      <section
        style={{
          ...styles.hero,
          borderColor: currentRoleInfo?.color,
          backgroundColor: currentRoleInfo?.bgColor,
        }}
      >
        <div>
          <div style={{ ...styles.heroBadge, color: currentRoleInfo?.color }}>
            <ShieldCheck size={14} />
            <span>{currentRoleInfo?.title}</span>
          </div>
          <h2 style={styles.heroTitle}>
            Welcome back, {profile?.full_name || 'Staff Member'}
          </h2>
          <p style={styles.heroText}>{currentRoleInfo?.description}</p>
        </div>

        <div style={styles.heroStat}>
          <div style={styles.heroStatNum}>{visibleModules.length}</div>
          <div style={styles.heroStatLabel}>modules unlocked</div>
        </div>
      </section>

      {/* Modules this role can open */}
      <section>
        <h3 style={styles.sectionTitle}>Modules open to your role</h3>
        <div style={styles.grid}>
          {quickLinks.map((mod) => {
            const Icon = ICONS[mod.iconName] || Settings
            const editable = canEdit(mod.id)

            return (
              <Link key={mod.id} to={mod.path} style={styles.card}>
                <div style={styles.cardTop}>
                  <div style={styles.cardIcon}>
                    <Icon size={19} color="var(--color-primary-active)" />
                  </div>
                  <span
                    style={{
                      ...styles.accessTag,
                      backgroundColor: editable ? 'var(--color-success-bg)' : 'var(--color-warning-bg)',
                      color: editable ? 'var(--color-success)' : 'var(--color-warning)',
                    }}
                  >
                    {editable ? 'View + Edit' : 'View only'}
                  </span>
                </div>

                <div style={styles.cardTitle}>{mod.title}</div>
                <div style={styles.cardDesc}>{mod.description}</div>

                <div style={styles.cardFoot}>
                  <span>Open</span>
                  <ArrowRight size={13} />
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Team split — কে কোন module বানাচ্ছে */}
      <section>
        <h3 style={styles.sectionTitle}>Team module ownership</h3>
        <div style={styles.teamCard}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Teammate</th>
                <th style={styles.th}>Modules</th>
              </tr>
            </thead>
            <tbody>
              {TEAM_SPLIT.map((row) => (
                <tr key={row.person}>
                  <td style={styles.td}>
                    <strong>{row.person}</strong>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.modChips}>
                      {MODULE_CONFIG.filter((m) => m.teamOwner === row.person).map((m) => (
                        <span key={m.id} style={styles.modChip}>
                          {m.shortTitle}
                        </span>
                      ))}
                    </div>
                    <div style={styles.modNote}>{row.note}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

const TEAM_SPLIT = [
  {
    person: 'Person 1',
    note: 'Auth is the foundation everyone else builds on, so it comes first. Profit and reporting depend on everyone else’s data, so they come last.',
  },
  {
    person: 'Person 2',
    note: 'Orders are assigned to tables — one data flow, so one owner avoids constant coordination.',
  },
  {
    person: 'Person 3',
    note: 'Menu items are tied to ingredient recipes (BOM), so the two are deeply connected.',
  },
  {
    person: 'Person 4',
    note: 'Billing drives the payment gateway and receipt printer directly — the same flow.',
  },
]

const styles = {
  wrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '30px',
    maxWidth: '1100px',
  },
  hero: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '24px',
    flexWrap: 'wrap',
    padding: '26px 28px',
    borderRadius: 'var(--radius-lg)',
    border: '1.5px solid',
  },
  heroBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.74rem',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '8px',
  },
  heroTitle: {
    fontSize: '1.6rem',
    fontWeight: '800',
    letterSpacing: '-0.02em',
  },
  heroText: {
    fontSize: '0.9rem',
    color: 'var(--color-text-muted)',
    marginTop: '6px',
    maxWidth: '560px',
    lineHeight: 1.55,
  },
  heroStat: {
    textAlign: 'center',
    padding: '14px 24px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
  },
  heroStatNum: {
    fontSize: '2rem',
    fontWeight: '800',
    color: 'var(--color-primary-active)',
    lineHeight: 1,
  },
  heroStatLabel: {
    fontSize: '0.72rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: 'var(--color-text-muted)',
    marginTop: '5px',
  },
  sectionTitle: {
    fontSize: '1.05rem',
    fontWeight: '800',
    marginBottom: '14px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '14px',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '18px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-surface)',
    border: '1.5px solid var(--color-border)',
    textDecoration: 'none',
    color: 'inherit',
  },
  cardTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardIcon: {
    width: '38px',
    height: '38px',
    borderRadius: '11px',
    backgroundColor: 'rgba(98, 111, 72, 0.14)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accessTag: {
    fontSize: '0.66rem',
    fontWeight: '800',
    padding: '3px 8px',
    borderRadius: 'var(--radius-full)',
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
  },
  cardTitle: {
    fontSize: '0.98rem',
    fontWeight: '700',
    color: 'var(--color-text-main)',
  },
  cardDesc: {
    fontSize: '0.8rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.5,
    flex: 1,
  },
  cardFoot: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '0.78rem',
    fontWeight: '700',
    color: 'var(--color-primary-active)',
    marginTop: '4px',
  },
  teamCard: {
    backgroundColor: 'var(--color-surface)',
    border: '1.5px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '520px',
  },
  th: {
    textAlign: 'left',
    padding: '12px 18px',
    fontSize: '0.72rem',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--color-text-muted)',
    borderBottom: '1px solid var(--color-border)',
  },
  td: {
    padding: '14px 18px',
    fontSize: '0.86rem',
    verticalAlign: 'top',
    borderBottom: '1px solid var(--color-border-light)',
  },
  modChips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginBottom: '6px',
  },
  modChip: {
    fontSize: '0.72rem',
    fontWeight: '700',
    padding: '3px 10px',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--color-primary-subtle)',
    color: 'var(--color-primary-active)',
  },
  modNote: {
    fontSize: '0.8rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.5,
  },
}
