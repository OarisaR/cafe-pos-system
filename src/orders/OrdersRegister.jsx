// =========================================================================
// Orders Register — Owner / Manager এর জন্য (শুধু দেখার)
//
// কে অর্ডার নিয়েছে, কী অর্ডার হয়েছে, কখন, কোন টেবিলে, কত টাকা —
// সব এক জায়গায়। এখান থেকে অর্ডার নেওয়া বা বদলানো যায় না;
// সেটা cashier এর POS স্ক্রিনের কাজ।
// =========================================================================
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  RefreshCw,
  Search,
  AlertCircle,
  Database,
  ChevronDown,
  ChevronRight,
  Receipt,
  Clock,
  User,
} from 'lucide-react'
import {
  OrdersSchemaMissingError,
  fetchOrderRegister,
  formatTaka,
  formatDateTime,
  formatRelative,
  isToday,
} from './ordersRegisterService'

const STATUS_STYLE = {
  open:      { label: 'Open',      color: 'var(--color-info)',    bg: 'var(--color-info-bg)' },
  paid:      { label: 'Paid',      color: 'var(--color-warning)', bg: 'var(--color-warning-bg)' },
  served:    { label: 'Served',    color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
  cancelled: { label: 'Cancelled', color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)' },
}

export const OrdersRegister = () => {
  const [loading, setLoading] = useState(true)
  const [schemaMissing, setSchemaMissing] = useState(false)
  const [error, setError] = useState(null)
  const [orders, setOrders] = useState([])

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dayFilter, setDayFilter] = useState('today')
  const [expanded, setExpanded] = useState(() => new Set())

  const load = useCallback(async () => {
    setError(null)
    try {
      setOrders(await fetchOrderRegister())
      setSchemaMissing(false)
    } catch (err) {
      if (err instanceof OrdersSchemaMissingError) setSchemaMissing(true)
      else setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const toggle = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return orders.filter((o) => {
      if (dayFilter === 'today' && !isToday(o.createdAt)) return false
      if (statusFilter !== 'all' && o.status !== statusFilter) return false
      if (!q) return true
      return (
        String(o.token ?? '').includes(q) ||
        String(o.orderNumber).includes(q) ||
        String(o.tableNumber ?? '').includes(q) ||
        o.takenBy.toLowerCase().includes(q) ||
        o.items.some((i) => i.name.toLowerCase().includes(q))
      )
    })
  }, [orders, search, statusFilter, dayFilter])

  const stats = useMemo(() => {
    const today = orders.filter((o) => isToday(o.createdAt))
    const earning = today.filter((o) => o.isBilled).reduce((s, o) => s + o.amount, 0)
    return {
      count: today.length,
      earning,
      open: today.filter((o) => o.status === 'open').length,
      waiting: today.filter((o) => o.status === 'paid').length,
    }
  }, [orders])

  if (loading) {
    return (
      <div style={styles.center}>
        <RefreshCw size={26} color="var(--color-primary)" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={styles.muted}>Loading orders…</p>
      </div>
    )
  }

  if (schemaMissing || error) {
    return (
      <div style={styles.setupCard}>
        <div
          style={{
            ...styles.setupIcon,
            backgroundColor: schemaMissing ? 'var(--color-warning-bg)' : 'var(--color-danger-bg)',
          }}
        >
          {schemaMissing ? (
            <Database size={26} color="var(--color-warning)" />
          ) : (
            <AlertCircle size={26} color="var(--color-danger)" />
          )}
        </div>
        <h2 style={styles.setupTitle}>
          {schemaMissing ? 'Order tables are not set up yet' : 'Could not load orders'}
        </h2>
        <p style={styles.muted}>
          {schemaMissing
            ? 'Run supabase/supabase_pos_schema.sql in the Supabase SQL Editor, then press Retry.'
            : error}
        </p>
        <button className="btn-primary" onClick={() => { setLoading(true); load() }}>
          <RefreshCw size={16} />
          <span>Retry</span>
        </button>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      {/* Today's summary */}
      <div style={styles.statsRow}>
        <Stat label="Orders today" value={stats.count} />
        <Stat label="Being taken" value={stats.open} tone={stats.open ? 'info' : undefined} />
        <Stat label="Paid, not served" value={stats.waiting} tone={stats.waiting ? 'warning' : undefined} />
        <Stat label="Collected today" value={formatTaka(stats.earning)} tone="success" />
      </div>

      {/* Toolbar */}
      <div style={styles.toolbar}>
        <div style={styles.searchWrap}>
          <Search size={16} color="var(--color-text-muted)" style={styles.searchIcon} />
          <input
            className="input-field"
            style={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search token, order no, table, cashier or item"
            aria-label="Search orders"
          />
        </div>

        <select
          className="input-field"
          value={dayFilter}
          onChange={(e) => setDayFilter(e.target.value)}
          aria-label="Filter by day"
        >
          <option value="today">Today</option>
          <option value="all">All days</option>
        </select>

        <select
          className="input-field"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="paid">Paid</option>
          <option value="served">Served</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <button className="btn-secondary" style={styles.iconBtn} onClick={load} aria-label="Refresh orders">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Orders */}
      {visible.length === 0 ? (
        <div style={styles.empty}>
          <p style={styles.emptyTitle}>
            {orders.length === 0 ? 'No orders yet' : 'No orders match your filters'}
          </p>
          <p style={styles.muted}>
            {orders.length === 0
              ? 'Orders taken by cashiers will appear here.'
              : 'Try another search, day or status.'}
          </p>
        </div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: '40px' }} aria-label="Expand" />
                <th style={styles.th}>Token</th>
                <th style={styles.th}>When</th>
                <th style={styles.th}>Where</th>
                <th style={styles.th}>What</th>
                <th style={styles.th}>Taken by</th>
                <th style={styles.th}>Status</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((o) => {
                const s = STATUS_STYLE[o.status] || STATUS_STYLE.open
                const isOpen = expanded.has(o.orderId)

                return (
                  <React.Fragment key={o.orderId}>
                    <tr
                      onClick={() => toggle(o.orderId)}
                      style={styles.row}
                      title="Click to see the items"
                    >
                      <td style={styles.td}>
                        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </td>
                      <td style={styles.td}>
                        <div style={styles.token}>{o.token != null ? `#${o.token}` : '—'}</div>
                        <div style={styles.sub}>Order {o.orderNumber}</div>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.when}>{formatDateTime(o.createdAt)}</div>
                        <div style={styles.sub}>
                          <Clock size={11} style={{ verticalAlign: '-1px' }} /> {formatRelative(o.createdAt)}
                        </div>
                      </td>
                      <td style={styles.td}>
                        {o.type === 'takeaway' ? (
                          <span style={styles.takeaway}>Takeaway</span>
                        ) : (
                          <span style={styles.tableTag}>Table {o.tableNumber ?? '—'}</span>
                        )}
                      </td>
                      <td style={styles.td}>
                        <div style={styles.itemsPreview}>
                          {o.items.length === 0
                            ? 'No items'
                            : o.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                        </div>
                        <div style={styles.sub}>{o.itemCount} item{o.itemCount === 1 ? '' : 's'}</div>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.person}>
                          <User size={12} /> {o.takenBy}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badge, color: s.color, backgroundColor: s.bg }}>{s.label}</span>
                      </td>
                      <td style={{ ...styles.td, ...styles.num }}>
                        <div style={styles.amount}>{formatTaka(o.amount)}</div>
                        <div style={styles.sub}>
                          {o.isBilled ? o.paymentMethod?.toUpperCase() : 'not billed'}
                        </div>
                      </td>
                    </tr>

                    {isOpen && (
                      <tr>
                        <td colSpan={8} style={styles.detailCell}>
                          <div style={styles.detailBox}>
                            <div style={styles.detailHead}>
                              <Receipt size={15} />
                              <span>Order {o.orderNumber} — items</span>
                            </div>

                            {o.items.length === 0 ? (
                              <p style={styles.muted}>This order has no items.</p>
                            ) : (
                              <table style={styles.innerTable}>
                                <tbody>
                                  {o.items.map((i) => (
                                    <tr key={i.id}>
                                      <td style={styles.innerTd}>
                                        {i.quantity}× {i.name}
                                        {i.note && <span style={styles.itemNote}> — {i.note}</span>}
                                      </td>
                                      <td style={{ ...styles.innerTd, ...styles.num, width: '110px' }}>
                                        {formatTaka(i.unitPrice)} each
                                      </td>
                                      <td style={{ ...styles.innerTd, ...styles.num, width: '110px', fontWeight: 700 }}>
                                        {formatTaka(i.subtotal)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}

                            {o.note && (
                              <p style={styles.orderNote}>
                                <strong>Customer note:</strong> {o.note}
                              </p>
                            )}

                            <div style={styles.detailFoot}>
                              {o.isBilled ? (
                                <>
                                  Paid by <strong>{o.paymentMethod?.toUpperCase()}</strong> at{' '}
                                  {formatDateTime(o.paidAt)} · Total including VAT:{' '}
                                  <strong>{formatTaka(o.amount)}</strong>
                                </>
                              ) : (
                                <>Not billed yet · Items total (before VAT): <strong>{formatTaka(o.amount)}</strong></>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const Stat = ({ label, value, tone }) => (
  <div style={styles.statCard}>
    <div
      style={{
        ...styles.statValue,
        color:
          tone === 'success'
            ? 'var(--color-success)'
            : tone === 'warning'
              ? 'var(--color-warning)'
              : tone === 'info'
                ? 'var(--color-info)'
                : 'var(--color-text-main)',
      }}
    >
      {value}
    </div>
    <div style={styles.statLabel}>{label}</div>
  </div>
)

const styles = {
  page: { width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' },
  center: { padding: '80px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' },
  muted: { fontSize: '0.86rem', color: 'var(--color-text-muted)', lineHeight: 1.6 },
  setupCard: {
    maxWidth: '520px', margin: '40px auto', padding: '30px 26px', textAlign: 'center',
    backgroundColor: 'var(--color-surface)', border: '1.5px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
  },
  setupIcon: {
    width: '58px', height: '58px', borderRadius: '16px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  setupTitle: { fontSize: '1.25rem', fontWeight: '800' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' },
  statCard: {
    padding: '14px 16px', borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-surface)', border: '1.5px solid var(--color-border)',
  },
  statValue: {
    fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: '800',
    lineHeight: 1.1, fontVariantNumeric: 'tabular-nums',
  },
  statLabel: {
    fontSize: '0.73rem', fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginTop: '4px',
  },
  toolbar: { display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' },
  searchWrap: { position: 'relative', flex: '1 1 260px', display: 'flex', alignItems: 'center' },
  searchIcon: { position: 'absolute', left: '14px', pointerEvents: 'none' },
  searchInput: { width: '100%', paddingLeft: '40px' },
  iconBtn: { minHeight: '48px', width: '48px', padding: 0, borderRadius: 'var(--radius-md)' },
  empty: {
    padding: '48px 20px', textAlign: 'center',
    borderRadius: 'var(--radius-md)', border: '1.5px dashed var(--color-border)',
  },
  emptyTitle: { fontSize: '1rem', fontWeight: '700', marginBottom: '4px' },
  tableWrap: {
    overflowX: 'auto', borderRadius: 'var(--radius-md)',
    border: '1.5px solid var(--color-border)', backgroundColor: 'var(--color-surface)',
  },
  table: { width: '100%', minWidth: '980px', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left', padding: '12px 14px', fontSize: '0.7rem', fontWeight: '800',
    textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)',
    borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)',
  },
  row: { cursor: 'pointer' },
  td: {
    padding: '12px 14px', fontSize: '0.86rem', verticalAlign: 'top',
    borderBottom: '1px solid var(--color-border-light)',
  },
  num: { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' },
  token: { fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: '800', color: 'var(--color-primary-active)' },
  sub: { fontSize: '0.72rem', color: 'var(--color-text-subtle)', marginTop: '2px' },
  when: { fontWeight: '600', whiteSpace: 'nowrap' },
  tableTag: {
    display: 'inline-block', padding: '3px 10px', borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--color-primary-subtle)', color: 'var(--color-primary-active)',
    fontSize: '0.76rem', fontWeight: '700', whiteSpace: 'nowrap',
  },
  takeaway: {
    display: 'inline-block', padding: '3px 10px', borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)',
    fontSize: '0.76rem', fontWeight: '700', whiteSpace: 'nowrap',
  },
  itemsPreview: {
    maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  person: { display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: '600', whiteSpace: 'nowrap' },
  badge: {
    display: 'inline-block', padding: '3px 11px', borderRadius: 'var(--radius-full)',
    fontSize: '0.75rem', fontWeight: '800', whiteSpace: 'nowrap',
  },
  amount: { fontWeight: '800' },
  detailCell: { padding: 0, backgroundColor: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' },
  detailBox: { padding: '14px 18px 16px 54px' },
  detailHead: {
    display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.8rem',
    fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em',
    color: 'var(--color-text-muted)', marginBottom: '8px',
  },
  innerTable: { width: '100%', maxWidth: '620px', borderCollapse: 'collapse' },
  innerTd: { padding: '5px 0', fontSize: '0.85rem', borderBottom: '1px dashed var(--color-border)' },
  itemNote: { color: 'var(--color-text-muted)', fontStyle: 'italic' },
  orderNote: { marginTop: '10px', fontSize: '0.84rem', color: 'var(--color-text-main)' },
  detailFoot: { marginTop: '10px', fontSize: '0.82rem', color: 'var(--color-text-muted)' },
}
