// =========================================================================
// MODULE OWNER: Person 4 — Billing & Payment
// Route: /dashboard/billing/:orderId
//
// দুই ধাপ:
//   ১) Payment  — অর্ডারের সব তথ্য, ছাড়/সার্ভিস চার্জ, পেমেন্টের ধরন,
//                 নগদ হলে কত দিলেন ও কত ফেরত
//   ২) Receipt  — পেমেন্টের পর ছাপার উপযোগী রসিদ
//
// সব টাকার হিসাব ডেটাবেজ করে (bills_before_write trigger)। এখানে যা দেখানো
// হয় সেটা পূর্বাভাস; সেভ হওয়ার পর ডেটাবেজের দেওয়া মানই রসিদে যায়।
// =========================================================================
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Printer,
  Receipt as ReceiptIcon,
  Banknote,
} from 'lucide-react'
import {
  PAYMENT_METHODS,
  VAT_PERCENT,
  fetchOrderForBilling,
  createBill,
  previewTotals,
  money,
  receiptDate,
} from './billingService'

export const BillingPage = () => {
  const { orderId } = useParams()
  const navigate = useNavigate()

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [discountPercent, setDiscountPercent] = useState('0')
  const [serviceChargePercent, setServiceChargePercent] = useState('0')
  const [cashGiven, setCashGiven] = useState('')
  const [saving, setSaving] = useState(false)

  const [bill, setBill] = useState(null)      // পেমেন্টের পর
  const receiptRef = useRef(null)

  const load = useCallback(async () => {
    // /dashboard/billing খোলা হয়েছে কোনো অর্ডার ছাড়াই
    if (!orderId) {
      setLoading(false)
      return
    }

    try {
      const data = await fetchOrderForBilling(orderId)
      setOrder(data)
      if (data.bill) setBill(data.bill)       // আগেই পরিশোধিত → সরাসরি রসিদ
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    load()
  }, [load])

  const totals = useMemo(
    () => previewTotals(order?.subtotal || 0, discountPercent, serviceChargePercent),
    [order?.subtotal, discountPercent, serviceChargePercent]
  )

  const dueAmount = bill ? Number(bill.total_amount) : totals.total
  const change = Number(cashGiven || 0) - dueAmount

  // নগদের ঘর খালি রাখলে আগে পেমেন্ট হয়ে যেত — cashShort তখন false ছিল।
  // এখন নগদ হলে টাকার অঙ্ক লিখতেই হবে, আর সেটা মোট টাকার সমান বা বেশি হতে হবে।
  const cashEntered = cashGiven.trim() !== '' && !Number.isNaN(Number(cashGiven))
  const cashShort = paymentMethod === 'cash' && cashEntered && change < 0
  const cashReady = paymentMethod !== 'cash' || (cashEntered && change >= 0)

  const handlePay = async () => {
    if (!order || saving) return

    // দ্বিতীয় স্তরের পাহারা — বাটন কোনোভাবে সক্রিয় হয়ে গেলেও যেন
    // টাকা না নিয়েই বিল তৈরি না হয়
    if (!cashReady) {
      setError('Enter the cash received from the customer first.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const saved = await createBill({
        orderId: order.orderId,
        paymentMethod,
        discountPercent,
        serviceChargePercent,
      })
      setBill(saved)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = () => window.print()

  // রসিদের নিচের বারকোড — order id থেকে বানানো, তাই প্রতিটা রসিদে আলাদা।
  // নির্দিষ্ট সংখ্যক দাগ, তাই কখনো কাগজের বাইরে যাবে না।
  const barcodeBars = useMemo(() => {
    const seed = String(orderId || '')
    return Array.from({ length: 48 }, (_, i) => {
      const code = seed.charCodeAt(i % Math.max(1, seed.length)) || 60
      return ((code + i) % 3) + 1
    })
  }, [orderId])

  // ---------------------------------------------------------------- states
  if (loading) {
    return (
      <div style={styles.center}>
        <RefreshCw size={26} color="var(--color-primary)" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={styles.muted}>Loading order…</p>
      </div>
    )
  }

  if (!order) {
    const noOrderPicked = !orderId
    return (
      <div style={styles.center}>
        {noOrderPicked ? (
          <ReceiptIcon size={30} color="var(--color-text-subtle)" />
        ) : (
          <AlertCircle size={26} color="var(--color-danger)" />
        )}
        <p style={styles.muted}>
          {noOrderPicked
            ? 'Pick an order first — open a table, then press "Proceed to Payment".'
            : error || 'Order not found.'}
        </p>
        <button className="btn-primary" onClick={() => navigate('/dashboard/orders')}>
          Go to Orders
        </button>
      </div>
    )
  }

  // ---------------------------------------------------------------- receipt
  const receiptView = bill && (
      <div style={styles.receiptOverlay} role="dialog" aria-modal="true" aria-label="Payment receipt">
        <div style={styles.receiptDone} className="no-print">
          <CheckCircle2 size={18} />
          <span>Payment completed</span>
        </div>

        <div ref={receiptRef} id="print-receipt" style={styles.receipt}>
          <div style={styles.rcHeader}>L&apos;AROMA CAFE</div>
          <div style={styles.rcSub}>DHANMONDI, DHAKA · BIN 789012</div>

          <div style={styles.rcDivider} />

          <div style={styles.rcLine}>
            ORDER #{String(order.orderNumber).padStart(4, '0')}
            {order.token != null ? ` · TOKEN ${order.token}` : ''}
          </div>
          <div style={styles.rcLine}>
            {order.type === 'takeaway' ? 'TAKEAWAY' : `TABLE ${order.tableNumber ?? '-'}`}
          </div>
          <div style={styles.rcLine}>{receiptDate(bill.paid_at)}</div>

          <div style={styles.rcDivider} />

          <div style={styles.rcRow}>
            <span style={styles.rcQty}>QTY</span>
            <span style={styles.rcName}>ITEM</span>
            <span style={styles.rcAmt}>AMT</span>
          </div>

          {order.items.map((item, index) => (
            <div key={item.id} style={styles.rcRow}>
              <span style={styles.rcQty}>{String(index + 1).padStart(2, '0')}</span>
              <span style={styles.rcName}>
                {item.name.toUpperCase()}
                {item.quantity > 1 ? ` ×${item.quantity}` : ''}
                {item.note && <em style={styles.rcNote}> ({item.note})</em>}
              </span>
              <span style={styles.rcAmt}>{money(item.subtotal)}</span>
            </div>
          ))}

          <div style={styles.rcDivider} />

          <div style={styles.rcRow}>
            <span style={styles.rcLabel}>ITEM COUNT:</span>
            <span style={styles.rcAmt}>{order.itemCount}</span>
          </div>
          <div style={styles.rcRow}>
            <span style={styles.rcLabel}>SUBTOTAL:</span>
            <span style={styles.rcAmt}>{money(bill.subtotal)}</span>
          </div>
          {Number(bill.discount_amount) > 0 && (
            <div style={styles.rcRow}>
              <span style={styles.rcLabel}>DISCOUNT ({money(bill.discount_percent)}%):</span>
              <span style={styles.rcAmt}>-{money(bill.discount_amount)}</span>
            </div>
          )}
          {Number(bill.service_charge_amount) > 0 && (
            <div style={styles.rcRow}>
              <span style={styles.rcLabel}>SERVICE ({money(bill.service_charge_percent)}%):</span>
              <span style={styles.rcAmt}>{money(bill.service_charge_amount)}</span>
            </div>
          )}
          <div style={styles.rcRow}>
            <span style={styles.rcLabel}>VAT ({money(bill.vat_percent)}%):</span>
            <span style={styles.rcAmt}>{money(bill.vat_amount)}</span>
          </div>

          <div style={styles.rcDivider} />

          <div style={{ ...styles.rcRow, ...styles.rcTotal }}>
            <span style={styles.rcLabel}>TOTAL:</span>
            <span style={styles.rcAmt}>BDT {money(bill.total_amount)}</span>
          </div>

          <div style={styles.rcLine}>PAID BY: {String(bill.payment_method).toUpperCase()}</div>
          {bill.payment_method === 'cash' && Number(cashGiven) > 0 && (
            <>
              <div style={styles.rcLine}>CASH: {money(cashGiven)}</div>
              <div style={styles.rcLine}>CHANGE: {money(Math.max(0, Number(cashGiven) - Number(bill.total_amount)))}</div>
            </>
          )}

          <div style={styles.rcDivider} />

          <div style={styles.rcThanks}>THANK YOU FOR VISITING!</div>
          <div style={styles.rcBarcode} aria-hidden="true">
            {barcodeBars.map((width, i) => (
              <span
                key={i}
                style={{
                  width: `${width}px`,
                  backgroundColor: i % 2 ? 'transparent' : '#111',
                }}
              />
            ))}
          </div>
          <div style={styles.rcSmall}>{order.orderId.slice(0, 18)}</div>
        </div>

        <div style={styles.receiptActions} className="no-print">
          <button className="btn-secondary" onClick={() => navigate('/dashboard/orders')}>
            <ArrowLeft size={16} />
            <span>Back to Orders</span>
          </button>
          <button className="btn-primary" onClick={handlePrint}>
            <Printer size={16} />
            <span>Print receipt</span>
          </button>
        </div>
      </div>
  )

  // ---------------------------------------------------------------- payment
  return (
    <div style={styles.page}>
      {/* রসিদ খোলা থাকলে পেছনের বিলিং পেজ ঝাপসা হয়ে যায় */}
      <div
        style={bill ? styles.blurred : undefined}
        aria-hidden={bill ? 'true' : undefined}
        className={bill ? 'no-print' : undefined}
      >
      {error && (
        <div style={styles.errorBanner} role="alert">
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {order.pendingCount > 0 && (
        <div style={styles.warnBanner}>
          <AlertCircle size={16} />
          <span>
            {order.pendingCount} item(s) have not been sent to the kitchen yet. Send them from the
            order screen before taking payment.
          </span>
        </div>
      )}

      <div style={styles.grid}>
        {/* Order details */}
        <section style={styles.card}>
          <header style={styles.cardHead}>
            <div>
              <h2 style={styles.cardTitle}>Order details</h2>
              <p style={styles.cardSub}>
                Order #{order.orderNumber}
                {order.token != null && ` · Token ${order.token}`} ·{' '}
                {order.type === 'takeaway' ? 'Takeaway' : `Table ${order.tableNumber ?? '—'}`}
              </p>
            </div>
            <ReceiptIcon size={20} color="var(--color-primary-active)" />
          </header>

          <table style={styles.itemTable}>
            <thead>
              <tr>
                <th style={styles.th}>Item</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Qty</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Price</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td style={styles.td}>
                    {item.name}
                    {item.note && <div style={styles.itemNote}>{item.note}</div>}
                  </td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>{item.quantity}</td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>৳ {money(item.unitPrice)}</td>
                  <td style={{ ...styles.td, textAlign: 'right', fontWeight: 700 }}>
                    ৳ {money(item.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {order.note && (
            <p style={styles.orderNote}>
              <strong>Customer note:</strong> {order.note}
            </p>
          )}
        </section>

        {/* Payment */}
        <section style={styles.card}>
          <header style={styles.cardHead}>
            <h2 style={styles.cardTitle}>Payment</h2>
            <Banknote size={20} color="var(--color-primary-active)" />
          </header>

          <div style={styles.adjustRow}>
            <label style={styles.field}>
              <span style={styles.label}>Discount %</span>
              <input
                className="input-field"
                type="number" min="0" max="100" step="0.5" inputMode="decimal"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
              />
            </label>
            <label style={styles.field}>
              <span style={styles.label}>Service charge %</span>
              <input
                className="input-field"
                type="number" min="0" max="100" step="0.5" inputMode="decimal"
                value={serviceChargePercent}
                onChange={(e) => setServiceChargePercent(e.target.value)}
              />
            </label>
          </div>

          <div style={styles.totals}>
            <Row label="Subtotal" value={money(order.subtotal)} />
            {totals.discount > 0 && <Row label="Discount" value={`-${money(totals.discount)}`} />}
            {totals.service > 0 && <Row label="Service charge" value={money(totals.service)} />}
            <Row label={`VAT ${VAT_PERCENT}%`} value={money(totals.vat)} />
            <div style={styles.grandRow}>
              <span>Total payable</span>
              <span>৳ {money(totals.total)}</span>
            </div>
          </div>

          <div style={styles.methodRow} role="group" aria-label="Payment method">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setPaymentMethod(m.value)}
                style={{
                  ...styles.methodBtn,
                  backgroundColor: paymentMethod === m.value ? 'var(--color-primary)' : 'var(--color-white)',
                  color: paymentMethod === m.value ? '#FFFFFF' : 'var(--color-text-main)',
                  borderColor: paymentMethod === m.value ? 'var(--color-primary)' : 'var(--color-border)',
                }}
              >
                {m.label}
              </button>
            ))}
          </div>

          {paymentMethod === 'cash' && (
            <div style={styles.cashBox}>
              <label style={styles.field}>
                <span style={styles.label}>Cash received (৳)</span>
                <input
                  className="input-field"
                  style={styles.cashInput}
                  type="number" min="0" step="1" inputMode="decimal"
                  value={cashGiven}
                  onChange={(e) => setCashGiven(e.target.value)}
                  placeholder="0"
                  autoFocus
                />
              </label>

              <div style={styles.quickRow}>
                {[Math.ceil(totals.total), 500, 1000, 2000].map((amount, i) => (
                  <button
                    key={`${amount}-${i}`}
                    type="button"
                    onClick={() => setCashGiven(String(amount))}
                    style={styles.quickBtn}
                  >
                    ৳ {amount}
                  </button>
                ))}
              </div>

              <div
                style={{
                  ...styles.changeBox,
                  backgroundColor: cashShort ? 'var(--color-danger-bg)' : 'var(--color-primary-subtle)',
                  color: cashShort ? 'var(--color-danger)' : 'var(--color-primary-active)',
                }}
              >
                <span>{cashShort ? 'Still short by' : 'Change to return'}</span>
                <strong style={styles.changeValue}>৳ {money(Math.abs(change))}</strong>
              </div>
            </div>
          )}

          <button
            className="btn-primary"
            style={styles.payBtn}
            onClick={handlePay}
            disabled={saving || order.items.length === 0 || order.pendingCount > 0 || !cashReady}
          >
            <CheckCircle2 size={17} />
            <span>
              {saving
                ? 'Saving…'
                : !cashEntered && paymentMethod === 'cash'
                  ? 'Enter cash received'
                  : cashShort
                    ? `Short by ৳ ${money(Math.abs(change))}`
                    : `Complete payment · ৳ ${money(totals.total)}`}
            </span>
          </button>

          <button className="btn-secondary" style={styles.backBtn} onClick={() => navigate(-1)}>
            <ArrowLeft size={15} />
            <span>Back to order</span>
          </button>
        </section>
      </div>
      </div>

      {receiptView}
    </div>
  )
}

const Row = ({ label, value }) => (
  <div style={styles.totalRow}>
    <span>{label}</span>
    <span>৳ {value}</span>
  </div>
)

const styles = {
  page: { width: '100%', display: 'flex', flexDirection: 'column', gap: '14px' },
  center: { padding: '80px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' },
  muted: { fontSize: '0.88rem', color: 'var(--color-text-muted)' },
  errorBanner: {
    display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px',
    borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-danger)',
    backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)',
    fontSize: '0.86rem', fontWeight: '600',
  },
  warnBanner: {
    display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px',
    borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-warning)',
    backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning)',
    fontSize: '0.86rem', fontWeight: '600',
  },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '16px', alignItems: 'start',
  },
  card: {
    backgroundColor: 'var(--color-surface)', border: '1.5px solid var(--color-border)',
    borderRadius: 'var(--radius-md)', padding: '20px 22px',
  },
  cardHead: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    gap: '10px', marginBottom: '14px',
  },
  cardTitle: { fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: '800' },
  cardSub: { fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '2px' },
  itemTable: { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left', padding: '8px 6px', fontSize: '0.68rem', fontWeight: '800',
    textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)',
    borderBottom: '1px solid var(--color-border)',
  },
  td: {
    padding: '9px 6px', fontSize: '0.86rem',
    borderBottom: '1px solid var(--color-border-light)', verticalAlign: 'top',
  },
  itemNote: { fontSize: '0.74rem', color: 'var(--color-text-muted)', fontStyle: 'italic' },
  orderNote: { marginTop: '12px', fontSize: '0.84rem' },
  adjustRow: { display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px', flex: '1 1 140px' },
  label: { fontSize: '0.78rem', fontWeight: '700' },
  totals: {
    backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-sm)',
    padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px',
  },
  totalRow: {
    display: 'flex', justifyContent: 'space-between',
    fontSize: '0.86rem', color: 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums',
  },
  grandRow: {
    display: 'flex', justifyContent: 'space-between', marginTop: '6px', paddingTop: '8px',
    borderTop: '1px dashed var(--color-border)', fontFamily: 'var(--font-display)',
    fontSize: '1.2rem', fontWeight: '800', fontVariantNumeric: 'tabular-nums',
  },
  methodRow: { display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '14px 0' },
  methodBtn: {
    flex: '1 1 80px', minHeight: '44px', borderRadius: 'var(--radius-sm)',
    border: '1.5px solid', fontWeight: '700', fontSize: '0.86rem',
  },
  cashBox: { display: 'flex', flexDirection: 'column', gap: '10px' },
  cashInput: { fontSize: '1.3rem', fontWeight: '800', textAlign: 'right' },
  quickRow: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  quickBtn: {
    flex: '1 1 70px', minHeight: '38px', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)', backgroundColor: 'var(--color-white)',
    fontSize: '0.8rem', fontWeight: '700', color: 'var(--color-text-main)',
  },
  changeBox: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 14px', borderRadius: 'var(--radius-sm)', fontSize: '0.86rem', fontWeight: '700',
  },
  changeValue: { fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: '800' },
  payBtn: { width: '100%', marginTop: '14px', minHeight: '50px', borderRadius: 'var(--radius-sm)', fontSize: '0.95rem' },
  backBtn: { width: '100%', marginTop: '8px', minHeight: '42px', borderRadius: 'var(--radius-sm)' },

  // ---- receipt ----
  blurred: {
    filter: 'blur(4px)',
    pointerEvents: 'none',
    userSelect: 'none',
    transition: 'filter 0.2s ease',
  },
  receiptOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(34, 42, 30, 0.45)',
    backdropFilter: 'blur(3px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '14px',
    padding: '24px 16px',
    overflowY: 'auto',
    animation: 'fadeIn 0.2s ease',
  },
  receiptDone: {
    display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 18px',
    borderRadius: 'var(--radius-full)', backgroundColor: 'var(--color-success-bg)',
    color: 'var(--color-success)', fontWeight: '800', fontSize: '0.88rem',
  },
  receipt: {
    width: 'min(330px, 100%)',
    maxHeight: '78vh',
    overflowY: 'auto', backgroundColor: '#FFFFFF', color: '#111111',
    padding: '26px 22px', borderRadius: '4px',
    fontFamily: 'ui-monospace, "Courier New", monospace', fontSize: '0.76rem',
    lineHeight: 1.55, boxShadow: 'var(--shadow-lg)',
  },
  rcHeader: { textAlign: 'center', fontSize: '1.4rem', fontWeight: '800', letterSpacing: '0.08em' },
  rcSub: { textAlign: 'center', fontSize: '0.66rem', color: '#555', marginTop: '3px', letterSpacing: '0.04em' },
  rcDivider: { borderBottom: '1px dashed #999', margin: '10px 0' },
  rcLine: { fontSize: '0.72rem', letterSpacing: '0.02em' },
  rcRow: { display: 'flex', gap: '6px', alignItems: 'flex-start', margin: '2px 0' },
  rcQty: { width: '26px', flexShrink: 0 },
  rcName: { flex: 1, wordBreak: 'break-word' },
  rcAmt: { marginLeft: 'auto', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' },
  rcLabel: { flex: 1 },
  rcNote: { color: '#666' },
  rcTotal: { fontSize: '0.95rem', fontWeight: '800' },
  rcThanks: { textAlign: 'center', fontSize: '0.74rem', marginTop: '6px', letterSpacing: '0.04em' },
  rcBarcode: {
    display: 'flex',
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: '1px',
    height: '42px',
    marginTop: '10px',
    overflow: 'hidden',      // কাগজের বাইরে যাওয়ার সুযোগ নেই
    maxWidth: '100%',
  },
  rcSmall: { textAlign: 'center', fontSize: '0.6rem', color: '#777', marginTop: '4px' },
  receiptActions: { display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' },
}
