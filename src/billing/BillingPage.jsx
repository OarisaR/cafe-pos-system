// =========================================================================
// MODULE OWNER: Person 4 — Billing & Payment + External Interfaces
// Route: /dashboard/billing
//
// Cash tender calculator আর bKash/Nagad QR mock।
// Person 4 পরে আসল payment gateway callback আর receipt printer driver
// এখানেই যুক্ত করবে।
// =========================================================================
import React, { useState } from 'react'
import { CheckCircle2, QrCode } from 'lucide-react'

// এখনো আসল অর্ডার এই পেজে আসে না, তাই একটা ডেমো অর্ডারের মোট দেখানো হয়
// (২টা Spanish Latte + ১টা Butter Croissant — Orders পেজের শুরুর cart)।
// পরে এটা Person 2 এর Supabase orders টেবিল থেকে বেছে নেওয়া অর্ডার থেকে আসবে।
const DEMO_ORDER_ITEMS = [
  { name: 'Spanish Latte', price: 280, quantity: 2 },
  { name: 'Butter Croissant', price: 180, quantity: 1 },
]

export const BillingPage = () => {
  // Billing Tender State
  const [tenderCash, setTenderCash] = useState('1000')
  const [billingToast, setBillingToast] = useState(null)

  const subtotal = DEMO_ORDER_ITEMS.reduce((acc, item) => acc + (item.price * item.quantity), 0)
  const vat = Math.round(subtotal * 0.075) // 7.5% NBR VAT
  const grandTotal = subtotal + vat

  const flashToast = (message) => {
    setBillingToast(message)
    setTimeout(() => setBillingToast(null), 3000)
  }

  return (
    <div style={styles.container}>
      {/* Billing & Tender Calculator */}
      <div style={styles.billingGrid}>
        <div style={styles.billingCard}>
          <h3 style={styles.cardTitle}>Quick Cash Tender &amp; Change Calculator</h3>
          <p style={styles.cardSubtitle}>Calculate instant return change for BDT (৳) cash payments</p>

          <div style={styles.tenderForm}>
            <div style={styles.tenderRow}>
              <span>Order Total:</span>
              <strong>৳ {grandTotal}</strong>
            </div>

            <div style={styles.tenderInputGroup}>
              <label style={styles.label}>Customer Cash Given (৳):</label>
              <input
                type="number"
                value={tenderCash}
                onChange={(e) => setTenderCash(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.changeResultBox}>
              <span>Return Change to Customer:</span>
              <div style={styles.changeBigText}>
                ৳ {Math.max(0, Number(tenderCash || 0) - grandTotal)}
              </div>
            </div>

            <button
              onClick={() => flashToast('Payment Settled! Cash drawer triggered.')}
              style={styles.settleBtn}
            >
              <CheckCircle2 size={18} />
              <span>Complete Cash Settlement</span>
            </button>
          </div>
        </div>

        <div style={styles.billingCard}>
          <h3 style={styles.cardTitle}>Mobile Financial Services (MFS)</h3>
          <p style={styles.cardSubtitle}>Scan instant QR code for bKash or Nagad counter payments</p>

          <div style={styles.mfsBox}>
            <div style={styles.qrPlaceholder}>
              <QrCode size={120} color="var(--color-primary-active)" />
              <span style={{ marginTop: '8px', fontSize: '0.8rem', fontWeight: '700' }}>bKash / Nagad Merchant QR</span>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                onClick={() => flashToast('bKash Payment Verified via webhook!')}
                style={{ ...styles.mfsBtn, backgroundColor: '#E2136E' }}
              >
                Verify bKash
              </button>
              <button
                onClick={() => flashToast('Nagad Payment Verified!')}
                style={{ ...styles.mfsBtn, backgroundColor: '#F7941D' }}
              >
                Verify Nagad
              </button>
            </div>

            {billingToast && (
              <div style={styles.billingToast}>
                <CheckCircle2 size={16} />
                <span>{billingToast}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    maxWidth: '1280px',
    margin: '0 auto',
    padding: '0 24px 60px',
  },
  cardTitle: {
    fontSize: '1.25rem',
    fontWeight: '800',
    color: 'var(--color-text-main)',
    marginBottom: '4px',
  },
  cardSubtitle: {
    fontSize: '0.86rem',
    color: 'var(--color-text-muted)',
  },
  billingGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
  },
  billingCard: {
    backgroundColor: 'var(--color-surface)',
    border: '1.5px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '28px',
    boxShadow: 'var(--shadow-sm)',
  },
  tenderForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginTop: '20px',
  },
  tenderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '1rem',
    color: 'var(--color-text-main)',
    padding: '12px',
    backgroundColor: 'var(--color-bg)',
    borderRadius: 'var(--radius-sm)',
  },
  tenderInputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '0.84rem',
    fontWeight: '700',
    color: 'var(--color-text-main)',
  },
  input: {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1.5px solid var(--color-border)',
    backgroundColor: 'var(--color-bg)',
    fontSize: '1.1rem',
    fontWeight: '700',
    color: 'var(--color-text-main)',
    outline: 'none',
  },
  changeResultBox: {
    padding: '16px',
    backgroundColor: 'rgba(98, 111, 72, 0.12)',
    borderRadius: 'var(--radius-sm)',
    textAlign: 'center',
  },
  changeBigText: {
    fontSize: '2rem',
    fontWeight: '800',
    color: 'var(--color-primary-active)',
    marginTop: '4px',
  },
  settleBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '13px 20px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    backgroundColor: 'var(--color-primary)',
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: '0.94rem',
    cursor: 'pointer',
  },
  mfsBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px 0',
  },
  qrPlaceholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: 'var(--color-bg)',
    borderRadius: '16px',
    border: '1.5px solid var(--color-border)',
  },
  mfsBtn: {
    padding: '10px 20px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: '0.88rem',
    cursor: 'pointer',
  },
  billingToast: {
    marginTop: '16px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--color-success-bg)',
    color: 'var(--color-success)',
    fontSize: '0.84rem',
    fontWeight: '700',
  },
}
