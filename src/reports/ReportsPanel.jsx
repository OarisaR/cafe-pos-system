// =========================================================================
// MODULE OWNER: Person 1 — Reporting & Profit (UI)
// Overview & Reports পেজের নিচের পুরো অংশটাই এই component.
//
// এখানে যা আছে: সময় বাছাই → KPI কার্ড → progression graph →
// payment/item/staff ভাগ → transaction তালিকা → PDF ডাউনলোড।
// =========================================================================
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  TrendingUp,
  Wallet,
  Receipt,
  ShoppingBag,
  PiggyBank,
  Percent,
  Download,
  RefreshCw,
  AlertTriangle,
  CalendarDays,
  Trophy,
} from 'lucide-react'
import { useAuth } from '../authentication/context/AuthContext'
import { SalesChart } from './components/SalesChart'
import { ReportSheet } from './components/ReportSheet'
import {
  RANGE_TYPES,
  buildRange,
  fetchSalesReport,
  dhakaToday,
  dhakaThisMonth,
  dhakaThisYear,
  taka,
  clockTime,
  dateTime,
  METHOD_LABEL,
  ReportsSchemaMissingError,
} from './reportsService'

const RANGE_TABS = [
  { id: RANGE_TYPES.DAILY, label: 'Today' },
  { id: RANGE_TYPES.DATE, label: 'Specific date' },
  { id: RANGE_TYPES.MONTHLY, label: 'Monthly' },
  { id: RANGE_TYPES.YEARLY, label: 'Yearly' },
]

// বছরের তালিকা — চলতি বছর থেকে পেছনে ৪ বছর
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => String(Number(dhakaThisYear()) - i))

export const ReportsPanel = () => {
  const { profile } = useAuth()

  const [type, setType] = useState(RANGE_TYPES.DAILY)
  const [date, setDate] = useState(dhakaToday())
  const [month, setMonth] = useState(dhakaThisMonth())
  const [year, setYear] = useState(dhakaThisYear())

  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [schemaMissing, setSchemaMissing] = useState(false)

  // বাছাই বদলালেই নতুন সীমা — useMemo রাখায় অকারণে refetch হয় না
  const range = useMemo(
    () => buildRange({ type, date, month, year }),
    [type, date, month, year]
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setReport(await fetchSalesReport(range))
      setSchemaMissing(false)
    } catch (err) {
      if (err instanceof ReportsSchemaMissingError) {
        setSchemaMissing(true)
        setReport(null)
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }, [range])

  useEffect(() => {
    load()
  }, [load])

  // ব্রাউজারের print ডায়ালগ → "Save as PDF" দিলেই PDF ফাইল নেমে যাবে
  const handleDownload = () => {
    const previousTitle = document.title
    document.title = `laroma-report-${range.fileLabel}`
    window.print()
    // print() ফিরে আসার পর নামটা আগের মতো করে দেওয়া
    setTimeout(() => {
      document.title = previousTitle
    }, 600)
  }

  const totals = report?.totals

  return (
    <section style={styles.wrap}>
      {/* ------------------------------------------------ Toolbar */}
      <div style={styles.toolbar} className="no-print">
        <div style={styles.tabs}>
          {RANGE_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setType(tab.id)}
              style={{
                ...styles.tab,
                backgroundColor: type === tab.id ? 'var(--color-primary)' : 'transparent',
                color: type === tab.id ? '#FFFFFF' : 'var(--color-text-muted)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={styles.toolbarRight}>
          {/* বাছাই অনুযায়ী আলাদা ইনপুট */}
          {type === RANGE_TYPES.DATE && (
            <input
              type="date"
              value={date}
              max={dhakaToday()}
              onChange={(e) => setDate(e.target.value || dhakaToday())}
              style={styles.picker}
            />
          )}
          {type === RANGE_TYPES.MONTHLY && (
            <input
              type="month"
              value={month}
              max={dhakaThisMonth()}
              onChange={(e) => setMonth(e.target.value || dhakaThisMonth())}
              style={styles.picker}
            />
          )}
          {type === RANGE_TYPES.YEARLY && (
            <select value={year} onChange={(e) => setYear(e.target.value)} style={styles.picker}>
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          )}

          <button onClick={load} style={styles.ghostBtn} disabled={loading} title="Reload">
            <RefreshCw size={15} style={loading ? { animation: 'spin 1s linear infinite' } : undefined} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleDownload}
            style={{ ...styles.primaryBtn, opacity: report ? 1 : 0.5 }}
            disabled={!report}
          >
            <Download size={15} />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      <div style={styles.rangeLine} className="no-print">
        <CalendarDays size={14} color="var(--color-primary-active)" />
        <span>
          Showing <strong>{range.label}</strong>
        </span>
      </div>

      {/* ------------------------------------------------ States */}
      {schemaMissing && (
        <div style={styles.warnBox}>
          <AlertTriangle size={17} color="var(--color-warning)" />
          <div>
            <strong>Billing tables are not installed yet.</strong>
            <div style={styles.warnText}>
              Run <code>supabase/supabase_pos_schema.sql</code> in the Supabase SQL Editor, then refresh.
            </div>
          </div>
        </div>
      )}

      {error && (
        <div style={styles.errorBox}>
          <AlertTriangle size={17} color="var(--color-danger)" />
          <span>{error}</span>
        </div>
      )}

      {loading && !report && <div style={styles.loading}>Loading report…</div>}

      {report && (
        <>
          {/* ------------------------------------------------ KPI cards */}
          <div style={styles.kpiGrid}>
            <Kpi
              icon={Wallet}
              tone="primary"
              label="Total sales"
              value={taka(totals.collected)}
              hint={`${totals.transactions} transactions collected`}
            />
            <Kpi
              icon={TrendingUp}
              tone="info"
              label="Net income"
              value={taka(totals.netIncome)}
              hint="After discount, before VAT"
            />
            <Kpi
              icon={PiggyBank}
              tone="success"
              label="Gross profit"
              value={taka(totals.profit)}
              hint={
                totals.costTracked
                  ? `${totals.margin}% margin · cost ${taka(totals.cost)}`
                  : 'Recipe cost not configured yet'
              }
            />
            <Kpi
              icon={Receipt}
              tone="warning"
              label="Transactions"
              value={String(totals.transactions)}
              hint={`Average bill ${taka(totals.avgTicket)}`}
            />
            <Kpi
              icon={ShoppingBag}
              tone="primary"
              label="Items sold"
              value={String(totals.itemsSold)}
              hint={`${totals.dineIn} dine-in · ${totals.takeaway} takeaway`}
            />
            <Kpi
              icon={Percent}
              tone="info"
              label="VAT collected"
              value={taka(totals.vat)}
              hint={`Discount given ${taka(totals.discount)}`}
            />
          </div>

          {/* ------------------------------------------------ Graph */}
          <div style={styles.card}>
            <div style={styles.cardHead}>
              <div>
                <h4 style={styles.cardTitle}>Progression</h4>
                <p style={styles.cardSub}>
                  {range.bucket === 'hour'
                    ? 'Hour by hour through the day'
                    : range.bucket === 'day'
                      ? 'Day by day through the month'
                      : 'Month by month through the year'}
                </p>
              </div>
            </div>
            <SalesChart series={report.series} bucket={range.bucket} />
          </div>

          {/* ------------------------------------------------ Breakdowns */}
          <div style={styles.splitGrid}>
            {/* Payment methods */}
            <div style={styles.card}>
              <h4 style={styles.cardTitle}>Payment methods</h4>
              <div style={styles.barList}>
                {report.byMethod.length === 0 && <div style={styles.emptyMini}>No payments yet</div>}
                {report.byMethod.map((m) => {
                  const share = totals.collected ? (m.amount / totals.collected) * 100 : 0
                  return (
                    <div key={m.method} style={styles.barRow}>
                      <div style={styles.barTop}>
                        <span style={styles.barName}>{METHOD_LABEL[m.method] || m.method}</span>
                        <span style={styles.barValue}>{taka(m.amount)}</span>
                      </div>
                      <div style={styles.barTrack}>
                        <div style={{ ...styles.barFill, width: `${Math.max(share, 2)}%` }} />
                      </div>
                      <div style={styles.barFoot}>
                        {m.count} transaction{m.count === 1 ? '' : 's'} · {Math.round(share)}%
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Top items */}
            <div style={styles.card}>
              <h4 style={styles.cardTitle}>
                <Trophy size={15} style={{ verticalAlign: '-2px', marginRight: '6px' }} />
                Best selling items
              </h4>
              <table style={styles.miniTable}>
                <thead>
                  <tr>
                    <th style={styles.mth}>Item</th>
                    <th style={styles.mthNum}>Qty</th>
                    <th style={styles.mthNum}>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {report.topItems.length === 0 && (
                    <tr>
                      <td style={styles.mtd} colSpan={3}>
                        <span style={styles.emptyMini}>Nothing sold yet</span>
                      </td>
                    </tr>
                  )}
                  {report.topItems.slice(0, 8).map((i, idx) => (
                    <tr key={i.name}>
                      <td style={styles.mtd}>
                        <span style={styles.rankDot}>{idx + 1}</span>
                        {i.name}
                      </td>
                      <td style={styles.mtdNum}>{i.quantity}</td>
                      <td style={styles.mtdNum}>{taka(i.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Staff */}
            <div style={styles.card}>
              <h4 style={styles.cardTitle}>Sales by staff</h4>
              <table style={styles.miniTable}>
                <thead>
                  <tr>
                    <th style={styles.mth}>Taken by</th>
                    <th style={styles.mthNum}>Orders</th>
                    <th style={styles.mthNum}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byCashier.length === 0 && (
                    <tr>
                      <td style={styles.mtd} colSpan={3}>
                        <span style={styles.emptyMini}>No orders yet</span>
                      </td>
                    </tr>
                  )}
                  {report.byCashier.map((c) => (
                    <tr key={c.name}>
                      <td style={styles.mtd}>{c.name}</td>
                      <td style={styles.mtdNum}>{c.count}</td>
                      <td style={styles.mtdNum}>{taka(c.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ------------------------------------------------ Transactions */}
          <div style={styles.card}>
            <div style={styles.cardHead}>
              <div>
                <h4 style={styles.cardTitle}>Transactions</h4>
                <p style={styles.cardSub}>Every settled bill in this period, newest first</p>
              </div>
              <span style={styles.countPill}>{report.transactions.length}</span>
            </div>

            <div style={styles.tableScroll}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>When</th>
                    <th style={styles.th}>Order</th>
                    <th style={styles.th}>Where</th>
                    <th style={styles.th}>Taken by</th>
                    <th style={styles.th}>Method</th>
                    <th style={styles.thNum}>Items</th>
                    <th style={styles.thNum}>Profit</th>
                    <th style={styles.thNum}>Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {report.transactions.length === 0 && (
                    <tr>
                      <td style={styles.td} colSpan={8}>
                        <span style={styles.emptyMini}>No transactions in this period</span>
                      </td>
                    </tr>
                  )}
                  {report.transactions.map((t) => (
                    <tr key={t.billId}>
                      <td style={styles.td}>
                        {range.bucket === 'hour' ? clockTime(t.paidAt) : dateTime(t.paidAt)}
                      </td>
                      <td style={styles.td}>#{t.orderNumber ?? '—'}</td>
                      <td style={styles.td}>
                        {t.type === 'takeaway' ? (
                          <span style={styles.typeTag}>Takeaway</span>
                        ) : (
                          `Table ${t.tableNumber ?? '—'}`
                        )}
                      </td>
                      <td style={styles.td}>{t.takenBy}</td>
                      <td style={styles.td}>{METHOD_LABEL[t.paymentMethod] || t.paymentMethod}</td>
                      <td style={styles.tdNum}>{t.itemCount}</td>
                      <td style={{ ...styles.tdNum, color: 'var(--color-success)', fontWeight: 700 }}>
                        {taka(t.profit)}
                      </td>
                      <td style={{ ...styles.tdNum, fontWeight: 700 }}>{taka(t.collected)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* পর্দায় লুকানো, শুধু PDF/print এ যায় */}
          <ReportSheet report={report} generatedBy={profile?.full_name || profile?.email} />
        </>
      )}
    </section>
  )
}

// ---------------------------------------------------------------- KPI card

const TONES = {
  primary: { color: 'var(--color-primary-active)', bg: 'var(--color-primary-subtle)' },
  success: { color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
  warning: { color: 'var(--color-warning)', bg: 'var(--color-warning-bg)' },
  info: { color: 'var(--color-info)', bg: 'var(--color-info-bg)' },
}

const Kpi = ({ icon: Icon, label, value, hint, tone = 'primary' }) => {
  const t = TONES[tone] || TONES.primary
  return (
    <div style={styles.kpi}>
      <div style={{ ...styles.kpiIcon, backgroundColor: t.bg }}>
        <Icon size={17} color={t.color} />
      </div>
      <div style={styles.kpiLabel}>{label}</div>
      <div style={styles.kpiValue}>{value}</div>
      <div style={styles.kpiHint}>{hint}</div>
    </div>
  )
}

// ---------------------------------------------------------------- styles

const styles = {
  wrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
  },
  tabs: {
    display: 'flex',
    gap: '4px',
    padding: '4px',
    backgroundColor: 'var(--color-surface)',
    border: '1.5px solid var(--color-border)',
    borderRadius: 'var(--radius-full)',
  },
  tab: {
    padding: '8px 16px',
    borderRadius: 'var(--radius-full)',
    border: 'none',
    fontSize: '0.82rem',
    fontWeight: '700',
    minHeight: '36px',
    whiteSpace: 'nowrap',
  },
  toolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  picker: {
    padding: '9px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1.5px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text-main)',
    fontSize: '0.84rem',
    fontWeight: '600',
    minHeight: '40px',
  },
  ghostBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',
    padding: '9px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1.5px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text-main)',
    fontSize: '0.83rem',
    fontWeight: '700',
    minHeight: '40px',
  },
  primaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',
    padding: '9px 16px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    backgroundColor: 'var(--color-primary)',
    color: '#FFFFFF',
    fontSize: '0.83rem',
    fontWeight: '700',
    minHeight: '40px',
  },
  rangeLine: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    fontSize: '0.82rem',
    color: 'var(--color-text-muted)',
    marginTop: '-6px',
  },
  warnBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '14px 16px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-warning-bg)',
    border: '1.5px solid var(--color-warning)',
    fontSize: '0.86rem',
  },
  warnText: {
    marginTop: '3px',
    color: 'var(--color-text-muted)',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 16px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-danger-bg)',
    border: '1.5px solid var(--color-danger)',
    fontSize: '0.86rem',
    color: 'var(--color-danger)',
    fontWeight: '600',
  },
  loading: {
    padding: '40px',
    textAlign: 'center',
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'var(--color-text-muted)',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
    gap: '12px',
  },
  kpi: {
    padding: '16px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-surface)',
    border: '1.5px solid var(--color-border)',
  },
  kpiIcon: {
    width: '34px',
    height: '34px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '10px',
  },
  kpiLabel: {
    fontSize: '0.71rem',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--color-text-muted)',
  },
  kpiValue: {
    fontSize: '1.42rem',
    fontWeight: '800',
    letterSpacing: '-0.02em',
    marginTop: '3px',
    lineHeight: 1.15,
    wordBreak: 'break-word',
  },
  kpiHint: {
    fontSize: '0.74rem',
    color: 'var(--color-text-subtle)',
    marginTop: '4px',
  },
  card: {
    padding: '18px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-surface)',
    border: '1.5px solid var(--color-border)',
    minWidth: 0,
  },
  cardHead: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '14px',
  },
  cardTitle: {
    fontSize: '0.98rem',
    fontWeight: '800',
    marginBottom: '10px',
  },
  cardSub: {
    fontSize: '0.78rem',
    color: 'var(--color-text-muted)',
    marginTop: '-6px',
  },
  countPill: {
    padding: '3px 11px',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--color-primary-subtle)',
    color: 'var(--color-primary-active)',
    fontSize: '0.76rem',
    fontWeight: '800',
  },
  splitGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
    gap: '14px',
  },
  barList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  barRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  barTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: '10px',
  },
  barName: {
    fontSize: '0.86rem',
    fontWeight: '700',
  },
  barValue: {
    fontSize: '0.86rem',
    fontWeight: '800',
    whiteSpace: 'nowrap',
  },
  barTrack: {
    height: '8px',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--color-bg)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--color-primary)',
  },
  barFoot: {
    fontSize: '0.73rem',
    color: 'var(--color-text-subtle)',
  },
  miniTable: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  mth: {
    textAlign: 'left',
    padding: '6px 4px',
    fontSize: '0.68rem',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: 'var(--color-text-muted)',
    borderBottom: '1px solid var(--color-border)',
  },
  mthNum: {
    textAlign: 'right',
    padding: '6px 4px',
    fontSize: '0.68rem',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: 'var(--color-text-muted)',
    borderBottom: '1px solid var(--color-border)',
    whiteSpace: 'nowrap',
  },
  mtd: {
    padding: '8px 4px',
    fontSize: '0.84rem',
    borderBottom: '1px solid var(--color-border-light)',
  },
  mtdNum: {
    padding: '8px 4px',
    fontSize: '0.84rem',
    textAlign: 'right',
    borderBottom: '1px solid var(--color-border-light)',
    whiteSpace: 'nowrap',
  },
  rankDot: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '19px',
    height: '19px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-primary-subtle)',
    color: 'var(--color-primary-active)',
    fontSize: '0.68rem',
    fontWeight: '800',
    marginRight: '8px',
  },
  tableScroll: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '760px',
  },
  th: {
    textAlign: 'left',
    padding: '9px 10px',
    fontSize: '0.68rem',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--color-text-muted)',
    borderBottom: '1px solid var(--color-border)',
    whiteSpace: 'nowrap',
  },
  thNum: {
    textAlign: 'right',
    padding: '9px 10px',
    fontSize: '0.68rem',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--color-text-muted)',
    borderBottom: '1px solid var(--color-border)',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '10px',
    fontSize: '0.85rem',
    borderBottom: '1px solid var(--color-border-light)',
    whiteSpace: 'nowrap',
  },
  tdNum: {
    padding: '10px',
    fontSize: '0.85rem',
    textAlign: 'right',
    borderBottom: '1px solid var(--color-border-light)',
    whiteSpace: 'nowrap',
  },
  typeTag: {
    padding: '2px 9px',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--color-info-bg)',
    color: 'var(--color-info)',
    fontSize: '0.72rem',
    fontWeight: '800',
  },
  emptyMini: {
    fontSize: '0.83rem',
    color: 'var(--color-text-subtle)',
    fontStyle: 'italic',
  },
}
