// =========================================================================
// Order Tracker — cashier এর নিচের ডানদিকে ভাসমান প্যানেল
//
// আগে শুধু চলতি টেবিলের একটা রাউন্ড দেখাত। কিন্তু একজন cashier একসাথে
// অনেক টেবিল সামলান — কেউ এসে "আমার টোকেন ১২ কোথায়?" জিজ্ঞেস করলে
// সব টিকিট এক নজরে দেখা দরকার।
//
//   • গুটানো অবস্থায়: "2 ready · 3 cooking" — জায়গা নেয় না
//   • খুললে: সব চলতি টিকিট, Ready গুলো আগে (ওগুলোতেই কাজ বাকি)
//   • চলতি টেবিলের টিকিট আলাদা করে চিহ্নিত
//   • টোকেন নম্বর দিয়ে খোঁজা যায়
// =========================================================================
import React, { useEffect, useMemo, useState } from 'react'
import { ChefHat, CheckCircle2, Search, ChevronDown, Utensils, ShoppingBag } from 'lucide-react'

const pad = (n) => String(n).padStart(2, '0')

// ডানপাশের গোল অগ্রগতি রিং (ছবির মতো)
const RING = 44
const STROKE = 6
const RADIUS = (RING - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

// Ready আগে (কাজ বাকি), তারপর রান্না চলছে, শেষে অপেক্ষমাণ
const STATUS_ORDER = { ready: 0, preparing: 1, queued: 2 }

export const OrderTrackerPanel = ({ tickets, currentOrderId, onHandOver, busyKey }) => {
  const [open, setOpen] = useState(true)
  const [query, setQuery] = useState('')
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const counts = useMemo(() => {
    const c = { ready: 0, preparing: 0, queued: 0 }
    tickets.forEach((t) => { c[t.status] = (c[t.status] || 0) + 1 })
    return c
  }, [tickets])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return tickets
      .filter((t) => {
        if (!q) return true
        return (
          String(t.token ?? '').includes(q) ||
          String(t.tableNumber ?? '').includes(q) ||
          t.items.some((i) => i.name.toLowerCase().includes(q))
        )
      })
      .sort(
        (a, b) =>
          (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9) ||
          new Date(a.sentAt) - new Date(b.sentAt)
      )
  }, [tickets, query])

  if (tickets.length === 0) return null

  // ---- গুটানো অবস্থা ----
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} style={styles.pill}>
        <ChefHat size={16} />
        <span>
          {counts.ready > 0 && <strong style={styles.pillReady}>{counts.ready} ready</strong>}
          {counts.ready > 0 && (counts.preparing > 0 || counts.queued > 0) && ' · '}
          {counts.preparing > 0 && `${counts.preparing} cooking`}
          {counts.preparing > 0 && counts.queued > 0 && ' · '}
          {counts.queued > 0 && `${counts.queued} waiting`}
        </span>
      </button>
    )
  }

  return (
    <aside style={styles.panel} aria-label="Order tracker">
      <header style={styles.head}>
        <div style={styles.headText}>
          <ChefHat size={16} color="var(--color-primary-active)" />
          <span style={styles.headTitle}>Order tracker</span>
          {counts.ready > 0 && <span style={styles.readyBadge}>{counts.ready} ready</span>}
        </div>
        <button type="button" onClick={() => setOpen(false)} style={styles.collapseBtn} aria-label="Collapse tracker">
          <ChevronDown size={16} />
        </button>
      </header>

      {tickets.length > 3 && (
        <div style={styles.searchWrap}>
          <Search size={13} color="var(--color-text-muted)" style={styles.searchIcon} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find token or table…"
            style={styles.search}
            aria-label="Find a ticket by token or table"
          />
        </div>
      )}

      <div style={styles.list}>
        {visible.length === 0 ? (
          <p style={styles.empty}>Nothing matches “{query}”.</p>
        ) : (
          visible.map((ticket) => (
            <TicketRow
              key={ticket.key}
              ticket={ticket}
              now={now}
              isCurrent={ticket.orderId === currentOrderId}
              busy={busyKey === ticket.key}
              onHandOver={() => onHandOver(ticket)}
            />
          ))
        )}
      </div>
    </aside>
  )
}

const TicketRow = ({ ticket, now, isCurrent, busy, onHandOver }) => {
  const isReady = ticket.status === 'ready'
  const isQueued = ticket.status === 'queued'

  const estSec = Math.max(1, ticket.estMinutes) * 60
  const elapsedSec = Math.max(0, Math.floor((now - new Date(ticket.sentAt).getTime()) / 1000))
  const remainingSec = Math.max(0, estSec - elapsedSec)
  const isLate = !isReady && remainingSec === 0

  // ছবির মতো সময়সীমা: "0:40 — 0:50" (এখন থেকে আর কত সময়)
  const windowFrom = remainingSec
  const windowTo = remainingSec + 120
  const asClock = (sec) => `${Math.floor(sec / 60)}:${pad(sec % 60)}`

  const accent = isReady
    ? 'var(--color-success)'
    : isLate
      ? 'var(--color-danger)'
      : isQueued
        ? 'var(--color-text-subtle)'
        : 'var(--color-warning)'

  const progress = isReady ? 1 : isQueued ? 0 : Math.min(1, elapsedSec / estSec)

  const where =
    ticket.orderType === 'takeaway'
      ? 'Takeaway'
      : `Table ${ticket.tableNumber ?? '—'}`

  return (
    <article
      style={{
        ...styles.row,
        borderColor: isCurrent ? 'var(--color-primary)' : 'var(--color-border-light)',
        backgroundColor: isReady ? 'var(--color-success-bg)' : 'var(--color-white)',
        opacity: busy ? 0.6 : 1,
      }}
    >
      <div style={styles.rowMain}>
        <div style={styles.rowLeft}>
          <div style={{ ...styles.headline, color: accent }}>
            {isReady
              ? 'Ready now'
              : isQueued
                ? 'In the queue'
                : isLate
                  ? 'Any moment now'
                  : `${asClock(windowFrom)} — ${asClock(windowTo)}`}
          </div>

          <div style={styles.rowTitle}>
            {isReady
              ? 'Order is ready'
              : isQueued
                ? 'Waiting for the kitchen'
                : 'Preparing your order'}
          </div>

          <div style={styles.rowSub}>
            <span style={styles.tokenTag}>
              {ticket.token != null ? `#${ticket.token}` : `R${ticket.round}`}
            </span>
            <span style={styles.place}>
              {ticket.orderType === 'takeaway' ? <ShoppingBag size={11} /> : <Utensils size={11} />}
              {where}
            </span>
            {ticket.round > 1 && <span style={styles.addOn}>add-on</span>}
          </div>

          <div style={styles.itemsLine}>
            {ticket.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
          </div>
        </div>

        <div style={styles.ringWrap}>
          <svg width={RING} height={RING} aria-hidden="true">
            <circle
              cx={RING / 2} cy={RING / 2} r={RADIUS}
              fill="none" stroke="var(--color-border-light)" strokeWidth={STROKE}
            />
            <circle
              cx={RING / 2} cy={RING / 2} r={RADIUS}
              fill="none" stroke={accent} strokeWidth={STROKE} strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
              transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
              style={{ transition: 'stroke-dashoffset 0.6s linear' }}
            />
          </svg>
          <span style={styles.ringIcon}>
            {isReady ? <CheckCircle2 size={16} color={accent} /> : <ChefHat size={16} color={accent} />}
          </span>
        </div>
      </div>

      {isCurrent && <span style={styles.thisTable}>This table</span>}

      {isReady && (
        <button type="button" onClick={onHandOver} disabled={busy} style={styles.handOver}>
          <CheckCircle2 size={14} />
          <span>{busy ? 'Saving…' : 'Handed over'}</span>
        </button>
      )}
    </article>
  )
}

const styles = {
  pill: {
    position: 'fixed', right: '20px', bottom: '20px', zIndex: 900,
    minHeight: '44px', padding: '0 18px', borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--color-white)', border: '1.5px solid var(--color-border)',
    boxShadow: 'var(--shadow-lg)', color: 'var(--color-text-main)',
    fontSize: '0.84rem', fontWeight: '700', gap: '8px',
  },
  pillReady: { color: 'var(--color-success)' },
  panel: {
    position: 'fixed', right: '20px', bottom: '20px', zIndex: 900,
    width: '300px', maxHeight: 'min(340px, 46vh)', display: 'flex', flexDirection: 'column',
    backgroundColor: 'var(--color-surface)', border: '1.5px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
    animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)', overflow: 'hidden',
  },
  head: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 10px 10px 14px', borderBottom: '1px solid var(--color-border)',
  },
  headText: { display: 'flex', alignItems: 'center', gap: '7px' },
  headTitle: { fontSize: '0.86rem', fontWeight: '800' },
  readyBadge: {
    padding: '1px 8px', borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)',
    fontSize: '0.68rem', fontWeight: '800',
  },
  collapseBtn: { minHeight: '30px', width: '30px', borderRadius: '50%', color: 'var(--color-text-muted)' },
  searchWrap: { position: 'relative', padding: '8px 10px 4px' },
  searchIcon: { position: 'absolute', left: '20px', top: '17px', pointerEvents: 'none' },
  search: {
    width: '100%', minHeight: '32px', padding: '4px 10px 4px 28px',
    borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-white)', fontSize: '0.78rem', outline: 'none',
  },
  list: { overflowY: 'auto', padding: '8px 10px 10px', display: 'flex', flexDirection: 'column', gap: '7px' },
  empty: { fontSize: '0.78rem', color: 'var(--color-text-muted)', padding: '8px 4px' },
  row: {
    border: '1.5px solid', borderRadius: 'var(--radius-md)', padding: '10px 12px',
    display: 'flex', flexDirection: 'column', gap: '6px',
  },
  rowMain: { display: 'flex', alignItems: 'center', gap: '10px' },
  rowLeft: { flex: 1, minWidth: 0 },
  headline: {
    fontFamily: 'var(--font-display)', fontSize: '1.28rem', fontWeight: '800',
    lineHeight: 1.1, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
  },
  rowTitle: {
    fontSize: '0.84rem', fontWeight: '800', color: 'var(--color-text-main)', marginTop: '2px',
  },
  rowSub: { display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center', marginTop: '4px' },
  tokenTag: {
    padding: '1px 7px', borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--color-primary-subtle)', color: 'var(--color-primary-active)',
    fontSize: '0.7rem', fontWeight: '800',
  },
  place: {
    display: 'inline-flex', alignItems: 'center', gap: '3px',
    fontSize: '0.7rem', fontWeight: '700', color: 'var(--color-text-muted)', whiteSpace: 'nowrap',
  },
  addOn: {
    padding: '1px 7px', borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning)',
    fontSize: '0.68rem', fontWeight: '800',
  },
  itemsLine: {
    fontSize: '0.74rem', color: 'var(--color-text-muted)', lineHeight: 1.4, marginTop: '4px',
    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
  },
  ringWrap: { position: 'relative', width: `${RING}px`, height: `${RING}px`, flexShrink: 0 },
  ringIcon: {
    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  thisTable: {
    alignSelf: 'flex-start', padding: '0 7px', borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--color-primary-subtle)', color: 'var(--color-primary-active)',
    fontSize: '0.64rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em',
  },
  handOver: {
    width: '100%', minHeight: '34px', marginTop: '4px', borderRadius: 'var(--radius-sm)',
    border: 'none', backgroundColor: 'var(--color-success)', color: '#FFFFFF',
    fontSize: '0.78rem', fontWeight: '800', gap: '5px',
  },
}
