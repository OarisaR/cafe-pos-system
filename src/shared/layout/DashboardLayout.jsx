import React, { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Clock, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../authentication/context/AuthContext'
import { MODULE_CONFIG } from '../../authentication/constants/rbac'
import { AdminSidebar } from './AdminSidebar'
import { IdleWarningModal } from '../../authentication/components/IdleWarningModal'

/**
 * লগইনের পরের পুরো shell: বাঁয়ে role-ভিত্তিক sidebar, উপরে topbar,
 * আর মাঝখানে <Outlet /> — সেখানেই route অনুযায়ী আসল পেজ বসে।
 */
export const DashboardLayout = () => {
  const { currentRoleInfo } = useAuth()
  const location = useLocation()
  const [time, setTime] = useState('')

  // Live Bangladesh Local Time (Asia/Dhaka)
  useEffect(() => {
    const updateTime = () => {
      setTime(
        new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Dhaka',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }).format(new Date())
      )
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  // বর্তমান URL থেকে কোন module সেটা বের করে topbar এ শিরোনাম দেখানো হয়
  const activeModule =
    MODULE_CONFIG.filter((m) => location.pathname.startsWith(m.path)).sort(
      (a, b) => b.path.length - a.path.length
    )[0] || null

  return (
    <div className="dashboard-shell" style={styles.shell}>
      <AdminSidebar />

      <div style={styles.contentColumn}>
        {/* Topbar */}
        <header style={styles.topbar}>
          <div>
            <div style={styles.breadcrumb}>
              {activeModule?.group || 'WORKSPACE'} <span style={styles.crumbSep}>/</span>{' '}
              {activeModule?.shortTitle || 'Home'}
            </div>
            <h2 style={styles.pageTitle}>{activeModule?.title || 'Dashboard'}</h2>
          </div>

          <div style={styles.topbarRight}>
            <div
              style={{
                ...styles.rolePill,
                backgroundColor: currentRoleInfo?.bgColor,
                color: currentRoleInfo?.color,
                borderColor: currentRoleInfo?.color,
              }}
            >
              <ShieldCheck size={13} />
              <span>{currentRoleInfo?.name}</span>
            </div>

            <div style={styles.clockPill}>
              <Clock size={13} color="var(--color-primary-active)" />
              <span>{time || 'Dhaka'}</span>
            </div>
          </div>
        </header>

        {/* এখানেই route অনুযায়ী পেজ render হয় */}
        <main style={styles.workspace} key={location.pathname}>
          <Outlet />
        </main>
      </div>

      <IdleWarningModal />
    </div>
  )
}

const styles = {
  shell: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: 'var(--color-bg)',
  },
  contentColumn: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  topbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    flexWrap: 'wrap',
    padding: '16px 28px',
    borderBottom: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg)',
    position: 'sticky',
    top: 0,
    zIndex: 50,
  },
  breadcrumb: {
    fontSize: '0.7rem',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--color-text-subtle)',
  },
  crumbSep: {
    opacity: 0.5,
    margin: '0 2px',
  },
  pageTitle: {
    fontSize: '1.3rem',
    fontWeight: '800',
    letterSpacing: '-0.02em',
    marginTop: '2px',
  },
  topbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  rolePill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '5px 12px',
    borderRadius: 'var(--radius-full)',
    border: '1px solid',
    fontSize: '0.74rem',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  },
  clockPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '5px 12px',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    fontSize: '0.78rem',
    fontWeight: '700',
    color: 'var(--color-text-main)',
  },
  workspace: {
    flex: 1,
    padding: '24px 28px 60px',
    overflowX: 'hidden',
    animation: 'fadeIn 0.2s ease',
  },
}
