// =========================================================================
// MODULE OWNER: Person 1 — Reporting
//
// PDF এ যা ছাপা হবে ঠিক সেই কাগজটা। পর্দায় এটা লুকানো থাকে
// (`.print-only`), শুধু print/Save-as-PDF এর সময় দেখা যায়।
// রঙ ছাড়া সাদা-কালো, যাতে যেকোনো প্রিন্টারে পরিষ্কার আসে।
// =========================================================================
import React from 'react'
import { taka, dateTime, clockTime, generatedStamp, METHOD_LABEL } from '../reportsService'

const Row = ({ label, value, strong, big }) => (
  <tr>
    <td style={{ ...s.sumLabel, fontWeight: strong ? 700 : 400 }}>{label}</td>
    <td
      style={{
        ...s.sumValue,
        fontWeight: strong ? 700 : 400,
        fontSize: big ? '13pt' : '10pt',
        borderTop: strong ? '1px solid #000' : 'none',
      }}
    >
      {value}
    </td>
  </tr>
)

export const ReportSheet = ({ report, generatedBy }) => {
  if (!report) return null
  const { range, totals, topItems, byMethod, byCashier, transactions } = report

  return (
    <div id="print-report" className="print-only" style={s.sheet}>
      {/* ---------------- Header ---------------- */}
      <div style={s.head}>
        <div>
          <div style={s.brand}>L'AROMA CAFE</div>
          <div style={s.brandSub}>Sales &amp; Profit Report</div>
        </div>
        <div style={s.headRight}>
          <div>
            <strong>Period:</strong> {range.label}
          </div>
          <div>
            <strong>Generated:</strong> {generatedStamp()}
          </div>
          <div>
            <strong>By:</strong> {generatedBy || 'Owner'}
          </div>
        </div>
      </div>

      {/* ---------------- Summary ---------------- */}
      <div style={s.sectionTitle}>1. Financial summary</div>
      <table style={s.sumTable}>
        <tbody>
          <Row label="Gross sales (items)" value={taka(totals.grossSales)} />
          <Row label="Discount given" value={`- ${taka(totals.discount)}`} />
          <Row label="Service charge" value={`+ ${taka(totals.serviceCharge)}`} />
          <Row label="Net income (excl. VAT)" value={taka(totals.netIncome)} strong />
          <Row label="Ingredient cost" value={`- ${taka(totals.cost)}`} />
          <Row label={`Gross profit (${totals.margin}% margin)`} value={taka(totals.profit)} strong big />
          <Row label="VAT collected (payable to NBR)" value={taka(totals.vat)} />
          <Row label="Total collected from customers" value={taka(totals.collected)} strong big />
        </tbody>
      </table>

      {!totals.costTracked && (
        <div style={s.note}>
          Note: ingredient cost is recorded as zero because menu recipes (BOM) are not configured yet,
          so gross profit equals net income for this period.
        </div>
      )}

      {/* ---------------- Counts ---------------- */}
      <div style={s.sectionTitle}>2. Volume</div>
      <table style={s.grid}>
        <tbody>
          <tr>
            <td style={s.gridCell}>
              <div style={s.gridNum}>{totals.transactions}</div>
              <div style={s.gridLabel}>Transactions</div>
            </td>
            <td style={s.gridCell}>
              <div style={s.gridNum}>{totals.itemsSold}</div>
              <div style={s.gridLabel}>Items sold</div>
            </td>
            <td style={s.gridCell}>
              <div style={s.gridNum}>{taka(totals.avgTicket)}</div>
              <div style={s.gridLabel}>Average bill</div>
            </td>
            <td style={s.gridCell}>
              <div style={s.gridNum}>
                {totals.dineIn} / {totals.takeaway}
              </div>
              <div style={s.gridLabel}>Dine-in / Takeaway</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ---------------- Payment methods ---------------- */}
      <div style={s.sectionTitle}>3. Payment methods</div>
      <table style={s.table}>
        <thead>
          <tr>
            <th style={s.th}>Method</th>
            <th style={s.thNum}>Transactions</th>
            <th style={s.thNum}>Amount</th>
            <th style={s.thNum}>Share</th>
          </tr>
        </thead>
        <tbody>
          {byMethod.length === 0 && (
            <tr>
              <td style={s.td} colSpan={4}>
                No payments in this period.
              </td>
            </tr>
          )}
          {byMethod.map((m) => (
            <tr key={m.method}>
              <td style={s.td}>{METHOD_LABEL[m.method] || m.method}</td>
              <td style={s.tdNum}>{m.count}</td>
              <td style={s.tdNum}>{taka(m.amount)}</td>
              <td style={s.tdNum}>
                {totals.collected ? Math.round((m.amount / totals.collected) * 100) : 0}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ---------------- Items ---------------- */}
      <div style={s.sectionTitle}>4. Item-wise sales</div>
      <table style={s.table}>
        <thead>
          <tr>
            <th style={s.th}>Item</th>
            <th style={s.thNum}>Qty</th>
            <th style={s.thNum}>Revenue</th>
            <th style={s.thNum}>Profit</th>
          </tr>
        </thead>
        <tbody>
          {topItems.length === 0 && (
            <tr>
              <td style={s.td} colSpan={4}>
                No items sold in this period.
              </td>
            </tr>
          )}
          {topItems.map((i) => (
            <tr key={i.name}>
              <td style={s.td}>{i.name}</td>
              <td style={s.tdNum}>{i.quantity}</td>
              <td style={s.tdNum}>{taka(i.revenue)}</td>
              <td style={s.tdNum}>{taka(i.profit)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ---------------- Staff ---------------- */}
      <div style={s.sectionTitle}>5. Sales by staff</div>
      <table style={s.table}>
        <thead>
          <tr>
            <th style={s.th}>Taken by</th>
            <th style={s.thNum}>Orders</th>
            <th style={s.thNum}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {byCashier.length === 0 && (
            <tr>
              <td style={s.td} colSpan={3}>
                No orders in this period.
              </td>
            </tr>
          )}
          {byCashier.map((c) => (
            <tr key={c.name}>
              <td style={s.td}>{c.name}</td>
              <td style={s.tdNum}>{c.count}</td>
              <td style={s.tdNum}>{taka(c.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ---------------- Transactions ---------------- */}
      <div style={s.sectionTitle}>6. Transaction log ({transactions.length})</div>
      <table style={s.table}>
        <thead>
          <tr>
            <th style={s.th}>Time</th>
            <th style={s.th}>Order</th>
            <th style={s.th}>Where</th>
            <th style={s.th}>Taken by</th>
            <th style={s.th}>Method</th>
            <th style={s.thNum}>Items</th>
            <th style={s.thNum}>Paid</th>
          </tr>
        </thead>
        <tbody>
          {transactions.length === 0 && (
            <tr>
              <td style={s.td} colSpan={7}>
                No transactions in this period.
              </td>
            </tr>
          )}
          {transactions.map((t) => (
            <tr key={t.billId}>
              <td style={s.td}>
                {range.bucket === 'hour' ? clockTime(t.paidAt) : dateTime(t.paidAt)}
              </td>
              <td style={s.td}>#{t.orderNumber ?? '—'}</td>
              <td style={s.td}>
                {t.type === 'takeaway' ? 'Takeaway' : `Table ${t.tableNumber ?? '—'}`}
              </td>
              <td style={s.td}>{t.takenBy}</td>
              <td style={s.td}>{METHOD_LABEL[t.paymentMethod] || t.paymentMethod}</td>
              <td style={s.tdNum}>{t.itemCount}</td>
              <td style={s.tdNum}>{taka(t.collected)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={s.footer}>
        Computer-generated report · L'Aroma POS · VAT registered under NBR · Page printed {generatedStamp()}
      </div>
    </div>
  )
}

// প্রিন্টের জন্য pt একক, রঙ নেই — যেকোনো প্রিন্টারে পরিষ্কার আসে
const s = {
  sheet: {
    backgroundColor: '#FFFFFF',
    color: '#000000',
    fontFamily: 'Inter, Arial, sans-serif',
    fontSize: '10pt',
    padding: '14pt',
    lineHeight: 1.45,
  },
  head: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '20pt',
    borderBottom: '2px solid #000',
    paddingBottom: '8pt',
    marginBottom: '14pt',
  },
  brand: {
    fontSize: '19pt',
    fontWeight: 800,
    letterSpacing: '0.06em',
  },
  brandSub: {
    fontSize: '10pt',
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
  },
  headRight: {
    fontSize: '9pt',
    textAlign: 'right',
    lineHeight: 1.7,
  },
  sectionTitle: {
    fontSize: '11pt',
    fontWeight: 800,
    marginTop: '16pt',
    marginBottom: '6pt',
    borderBottom: '1px solid #000',
    paddingBottom: '3pt',
  },
  sumTable: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  sumLabel: {
    padding: '3pt 0',
  },
  sumValue: {
    padding: '3pt 0',
    textAlign: 'right',
    whiteSpace: 'nowrap',
  },
  grid: {
    width: '100%',
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
  },
  gridCell: {
    border: '1px solid #000',
    padding: '7pt',
    textAlign: 'center',
  },
  gridNum: {
    fontSize: '14pt',
    fontWeight: 800,
  },
  gridLabel: {
    fontSize: '8pt',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    borderBottom: '1px solid #000',
    padding: '4pt 5pt',
    fontSize: '8.5pt',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  thNum: {
    textAlign: 'right',
    borderBottom: '1px solid #000',
    padding: '4pt 5pt',
    fontSize: '8.5pt',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  td: {
    padding: '4pt 5pt',
    borderBottom: '0.5px solid #999',
  },
  tdNum: {
    padding: '4pt 5pt',
    borderBottom: '0.5px solid #999',
    textAlign: 'right',
    whiteSpace: 'nowrap',
  },
  note: {
    marginTop: '6pt',
    fontSize: '8.5pt',
    fontStyle: 'italic',
  },
  footer: {
    marginTop: '18pt',
    paddingTop: '6pt',
    borderTop: '1px solid #000',
    fontSize: '8pt',
    textAlign: 'center',
  },
}
