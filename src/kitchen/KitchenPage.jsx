// =========================================================================
// MODULE OWNER: Person 2 — Kitchen Display
// Route: /dashboard/kitchen
//
// রান্নাঘরের বড় পর্দা। cashier "Send to kitchen" চাপলে এখানে টিকিট আসে।
//
//   queued    → [ Start preparing ]
//   preparing → [ Mark ready ]
//   ready     → [ Handed over ]      ← cashier বা staff চাপে
//
// নিজে থেকে ১৫ সেকেন্ড পরপর রিফ্রেশ হয়, তাই কাউকে F5 চাপতে হয় না।
// নিয়ম সব ডেটাবেজে (set_round_kitchen_status), এখানে শুধু দেখানো।
// =========================================================================
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ChefHat,
  Clock,
  RefreshCw,
  AlertCircle,
  Database,
  CheckCircle2,
  Utensils,
  ShoppingBag,
} from 'lucide-react'
import { useRealtimeRefresh } from '../shared/lib/useRealtimeRefresh'
import {
  KITCHEN_STATUS,
  KitchenSchemaMissingError,
  fetchKitchenTickets,
  setTicketStatus,
  waitingMinutes,
  formatClock,
} from './kitchenService'

const LANES = [
  { id: KITCHEN_STATUS.QUEUED,    title: 'New orders', next: KITCHEN_STATUS.PREPARING, action: 'Start preparing' },
  { id: KITCHEN_STATUS.PREPARING, title: 'Preparing',  next: KITCHEN_STATUS.READY,     action: 'Mark ready' },
  { id: KITCHEN_STATUS.READY,     title: 'Ready',      next: KITCHEN_STATUS.SERVED,    action: 'Handed over' },
]

const LANE_COLOR = {
  [KITCHEN_STATUS.QUEUED]: 'var(--color-info)',
  [KITCHEN_STATUS.PREPARING]: 'var(--color-warning)',
  [KITCHEN_STATUS.READY]: 'var(--color-success)',
}

// এত মিনিটের বেশি অপেক্ষা করলে টিকিট লাল হয়ে যায়
const LATE_AFTER_MIN = 10

export const KitchenPage = () => {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [schemaMissing, setSchemaMissing] = useState(false)
  const [error, setError] = useState(null)
  const [busyKey, setBusyKey] = useState(null)
  const [, forceTick] = useState(0)
  const firstLoad = useRef(true)

  const load = useCallback(async () => {
    try {
      setTickets(await fetchKitchenTickets())
      setSchemaMissing(false)
      setError(null)
    } catch (err) {
      if (err instanceof KitchenSchemaMissingError) setSchemaMissing(true)
      else setError(err.message)
    } finally {
      if (firstLoad.current) {
        firstLoad.current = false
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    load()
    // Realtime ছাড়াও একটা ধীর জাল — সংযোগে সমস্যা হলেও বোর্ড আটকে থাকবে না
    const refresh = setInterval(load, 30000)
    const clock = setInterval(() => forceTick((n) => n + 1), 30000) // অপেক্ষার সময় বাড়ানো
    return () => {
      clearInterval(refresh)
      clearInterval(clock)
    }
  }, [load])

  // cashier নতুন রাউন্ড পাঠালে সাথে সাথেই বোর্ডে চলে আসবে
  useRealtimeRefresh('kitchen-board', ['order_items', 'orders'], load)

  const advance = async (ticket, nextStatus) => {
    setBusyKey(ticket.key)
    try {
      await setTicketStatus(ticket.orderId, ticket.round, nextStatus)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyKey(null)
    }
  }

  if (loading) {
    return (
      <div style={styles.center}>
        <RefreshCw size={26} color="var(--color-primary)" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={styles.muted}>Loading kitchen board…</p>
      </div>
    )
  }

  if (schemaMissing) {
    return (
      <div style={styles.setupCard}>
        <div style={styles.setupIcon}>
          <Database size={26} color="var(--color-warning)" />
        </div>
        <h2 style={styles.setupTitle}>Kitchen board is not set up yet</h2>
        <p style={styles.muted}>
          Run <code style={styles.code}>supabase/patches/supabase_order_flow.sql</code> in the
          Supabase SQL Editor, then press Retry.
        </p>
        <button className="btn-primary" onClick={() => { setLoading(true); firstLoad.current = true; load() }}>
          <RefreshCw size={16} />
          <span>Retry</span>
        </button>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      {error && (
        <div style={styles.errorBanner} role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div style={styles.board}>
        {LANES.map((lane) => {
          const laneTickets = tickets.filter((t) => t.status === lane.id)

          return (
            <section key={lane.id} style={styles.lane} aria-label={lane.title}>
              <header style={styles.laneHead}>
                <span style={{ ...styles.laneDot, backgroundColor: LANE_COLOR[lane.id] }} />
                <h3 style={styles.laneTitle}>{lane.title}</h3>
                <span style={styles.laneCount}>{laneTickets.length}</span>
              </header>

              {laneTickets.length === 0 ? (
                <div style={styles.laneEmpty}>
                  {lane.id === KITCHEN_STATUS.QUEUED ? 'No new tickets' : 'Nothing here'}
                </div>
              ) : (
                laneTickets.map((ticket) => {
                  const mins = waitingMinutes(ticket.sentAt)
                  const late = mins >= LATE_AFTER_MIN && lane.id !== KITCHEN_STATUS.READY
                  const busy = busyKey === ticket.key

                  return (
                    <article
                      key={ticket.key}
                      style={{
                        ...styles.ticket,
                        borderColor: late ? 'var(--color-danger)' : 'var(--color-border)',
                        opacity: busy ? 0.6 : 1,
                      }}
                    >
                      <div style={styles.ticketTop}>
                        <span style={styles.token}>
                          {ticket.token != null ? `#${ticket.token}` : `Round ${ticket.round}`}
                        </span>
                        <span style={styles.where}>
                          {ticket.orderType === 'takeaway' ? (
                            <><ShoppingBag size={13} /> Takeaway</>
                          ) : (
                            <><Utensils size={13} /> Table {ticket.tableNumber ?? '—'}</>
                          )}
                        </span>
                      </div>

                      {ticket.round > 1 && <span style={styles.addOn}>Add-on · round {ticket.round}</span>}

                      <ul style={styles.itemList}>
                        {ticket.items.map((item) => (
                          <li key={item.id} style={styles.item}>
                            <span style={styles.qty}>{item.quantity}×</span>
                            <span>
                              {item.name}
                              {item.note && <em style={styles.itemNote}> — {item.note}</em>}
                            </span>
                          </li>
                        ))}
                      </ul>

                      {ticket.orderNote && <p style={styles.orderNote}>Note: {ticket.orderNote}</p>}

                      <div style={styles.ticketFoot}>
                        <span style={{ ...styles.wait, color: late ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                          <Clock size={12} /> {mins} min · sent {formatClock(ticket.sentAt)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => advance(ticket, lane.next)}
                        disabled={busy}
                        style={{
                          ...styles.actionBtn,
                          backgroundColor:
                            lane.id === KITCHEN_STATUS.READY ? 'var(--color-success)' : 'var(--color-primary)',
                        }}
                      >
                        {lane.id === KITCHEN_STATUS.READY && <CheckCircle2 size={16} />}
                        <span>{busy ? 'Saving…' : lane.action}</span>
                      </button>
                    </article>
                  )
                })
              )}
            </section>
          )
        })}
      </div>

      <p style={styles.hint}>
        <ChefHat size={13} /> The board refreshes on its own every 15 seconds.
      </p>
    </div>
  )
}

const styles = {
  page: { width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' },
  center: { padding: '80px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' },
  muted: { fontSize: '0.88rem', color: 'var(--color-text-muted)', lineHeight: 1.6 },
  setupCard: {
    maxWidth: '520px', margin: '40px auto', padding: '30px 26px', textAlign: 'center',
    backgroundColor: 'var(--color-surface)', border: '1.5px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
  },
  setupIcon: {
    width: '58px', height: '58px', borderRadius: '16px', backgroundColor: 'var(--color-warning-bg)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  setupTitle: { fontSize: '1.25rem', fontWeight: '800' },
  code: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.8rem',
    padding: '1px 6px', borderRadius: '4px', backgroundColor: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
  },
  errorBanner: {
    display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px',
    borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-danger)',
    backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)',
    fontSize: '0.86rem', fontWeight: '600',
  },
  board: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '14px',
    alignItems: 'start',
  },
  lane: {
    backgroundColor: 'var(--color-surface)', border: '1.5px solid var(--color-border)',
    borderRadius: 'var(--radius-md)', padding: '14px', display: 'flex',
    flexDirection: 'column', gap: '10px', minHeight: '160px',
  },
  laneHead: { display: 'flex', alignItems: 'center', gap: '8px' },
  laneDot: { width: '9px', height: '9px', borderRadius: '50%' },
  laneTitle: {
    fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: '800',
    textTransform: 'uppercase', letterSpacing: '0.04em',
  },
  laneCount: {
    marginLeft: 'auto', minWidth: '26px', textAlign: 'center', padding: '1px 8px',
    borderRadius: 'var(--radius-full)', backgroundColor: 'var(--color-bg)',
    border: '1px solid var(--color-border)', fontSize: '0.8rem', fontWeight: '800',
  },
  laneEmpty: {
    padding: '22px 10px', textAlign: 'center', fontSize: '0.84rem',
    color: 'var(--color-text-subtle)', border: '1.5px dashed var(--color-border)',
    borderRadius: 'var(--radius-sm)',
  },
  ticket: {
    backgroundColor: 'var(--color-white)', border: '2px solid', borderRadius: 'var(--radius-md)',
    padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px',
    boxShadow: 'var(--shadow-sm)',
  },
  ticketTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' },
  token: {
    fontFamily: 'var(--font-display)', fontSize: '1.45rem', fontWeight: '800',
    color: 'var(--color-primary-active)', lineHeight: 1,
  },
  where: {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    fontSize: '0.78rem', fontWeight: '700', color: 'var(--color-text-muted)', whiteSpace: 'nowrap',
  },
  addOn: {
    alignSelf: 'flex-start', padding: '1px 8px', borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning)',
    fontSize: '0.68rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.03em',
  },
  itemList: { listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px', margin: '2px 0' },
  item: { display: 'flex', gap: '8px', fontSize: '0.95rem', fontWeight: '600', lineHeight: 1.35 },
  qty: { color: 'var(--color-primary-active)', fontWeight: '800', minWidth: '26px' },
  itemNote: { color: 'var(--color-text-muted)', fontWeight: '500' },
  orderNote: {
    fontSize: '0.78rem', color: 'var(--color-text-main)', backgroundColor: 'var(--color-bg)',
    borderRadius: 'var(--radius-sm)', padding: '6px 8px',
  },
  ticketFoot: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  wait: { display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem', fontWeight: '700' },
  actionBtn: {
    width: '100%', minHeight: '46px', borderRadius: 'var(--radius-sm)', border: 'none',
    color: '#FFFFFF', fontWeight: '800', fontSize: '0.9rem', marginTop: '2px',
  },
  hint: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    fontSize: '0.78rem', color: 'var(--color-text-subtle)',
  },
}
