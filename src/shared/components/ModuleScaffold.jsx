import React from 'react'
import { Link } from 'react-router-dom'
import { Hammer, User, ListChecks, Lock, ArrowRight } from 'lucide-react'
import { useAuth } from '../../authentication/context/AuthContext'
import { getModuleConfig } from '../../authentication/constants/rbac'

/**
 * যেসব module এখনো কেউ বানায়নি, সেগুলোর জন্য একটা পরিষ্কার scaffold পেজ।
 *
 * এটা শুধু "Coming soon" নয় — এখানে লেখা থাকে module টা কার দায়িত্বে,
 * কী কী কাজ বাকি, আর বর্তমান user এর edit অনুমতি আছে কিনা।
 * টিমমেট নিজের module বানানোর সময় শুধু এই component টার বদলে
 * নিজের আসল UI বসিয়ে দেবে।
 */
export const ModuleScaffold = ({ moduleId, tasks = [], children }) => {
  const { canEdit, currentRoleInfo } = useAuth()
  const config = getModuleConfig(moduleId)
  const editable = canEdit(moduleId)

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.headRow}>
          <div style={styles.iconBox}>
            <Hammer size={26} color="var(--color-primary-active)" />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={styles.title}>{config?.title || 'Module'}</h2>
            <p style={styles.desc}>{config?.description}</p>
          </div>
        </div>

        <div style={styles.metaRow}>
          <span style={styles.metaPill}>
            <User size={13} />
            Owned by: <strong>{config?.teamOwner || 'Unassigned'}</strong>
          </span>
          <span
            style={{
              ...styles.metaPill,
              backgroundColor: editable ? 'var(--color-success-bg)' : 'var(--color-warning-bg)',
              color: editable ? 'var(--color-success)' : 'var(--color-warning)',
            }}
          >
            <Lock size={13} />
            {currentRoleInfo?.name}: {editable ? 'View + Edit' : 'View only'}
          </span>
        </div>

        {tasks.length > 0 && (
          <div style={styles.taskBox}>
            <div style={styles.taskTitle}>
              <ListChecks size={15} />
              <span>What still needs to be built here</span>
            </div>
            <ul style={styles.taskList}>
              {tasks.map((t) => (
                <li key={t} style={styles.taskItem}>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        )}

        {children}

        <Link to="/dashboard/profile" style={styles.link}>
          <span>My profile &amp; password</span>
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  )
}

const styles = {
  wrap: {
    maxWidth: '820px',
  },
  card: {
    backgroundColor: 'var(--color-surface)',
    border: '1.5px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '30px 28px',
    boxShadow: 'var(--shadow-sm)',
  },
  headRow: {
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start',
    marginBottom: '18px',
  },
  iconBox: {
    width: '58px',
    height: '58px',
    borderRadius: '16px',
    backgroundColor: 'rgba(98, 111, 72, 0.14)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    fontSize: '1.45rem',
    fontWeight: '800',
    letterSpacing: '-0.02em',
  },
  desc: {
    fontSize: '0.9rem',
    color: 'var(--color-text-muted)',
    marginTop: '4px',
    lineHeight: 1.55,
  },
  metaRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    marginBottom: '20px',
  },
  metaPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '5px 12px',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    fontSize: '0.78rem',
    fontWeight: '600',
    color: 'var(--color-text-main)',
  },
  taskBox: {
    backgroundColor: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '18px 22px',
    marginBottom: '20px',
  },
  taskTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.86rem',
    fontWeight: '800',
    color: 'var(--color-text-main)',
    marginBottom: '10px',
  },
  taskList: {
    margin: 0,
    paddingLeft: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  taskItem: {
    fontSize: '0.85rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.55,
  },
  link: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.84rem',
    fontWeight: '700',
    color: 'var(--color-primary-active)',
    textDecoration: 'none',
  },
}
