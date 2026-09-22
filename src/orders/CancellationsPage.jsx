// =========================================================================
// MODULE: Cancellation Requests — Manager এর পর্দা
//
// Cashier যখন ready/served অর্ডার বাতিল করতে চায়, অনুরোধটা এখানে আসে।
// Manager একটা complain/সিদ্ধান্তের বার্তা লেখেন, তারপর Approve বা Reject
// করেন। বার্তা ছাড়া সিদ্ধান্ত সেভ হয় না।
//
// pay-last ক্যাফে — বাতিল সবসময় টাকা নেওয়ার আগে, তাই refund এর ধাপ নেই।
// =========================================================================
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Undo2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  Hash,
  Loader2,
  Inbox,
} from 'lucide-react'
import { useAuth } from '../authentication/context/AuthContext'
import { MODULES } from '../authentication/constants/rbac'
import {
  REQUEST_STATUS,
  fetchCancellationRequests,
  resolveCancellation,
  CancellationSchemaMissingError,
} from './cancellationService'

const STAGE_LABEL = {
  ready: 'Ready at the pass',
  served: 'Already served',
}

const taka = (value) =>
  `BDT ${(Number(value) || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const clock = (value) =>
  value
    ? new Date(value).toLocaleString('en-US', {
        timeZone: 'Asia/Dhaka',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'

const TABS = [
  { id: REQUEST_STATUS.PENDING, label: 'Waiting on you' },
  { id: REQUEST_STATUS.APPROVED, label: 'Approved' },
  { id: REQUEST_STATUS.REJECTED, label: 'Rejected' },
]

export const CancellationsPage = () => {
  const { canEdit } = useAuth()
  const canDecide = canEdit(MODULES.CANCELLATIONS)

  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [schemaMissing, setSchemaMissing] = useState(false)
  const [tab, setTab] = useState(REQUEST_STATUS.PENDING)

  // কোন অনুরোধটা এখন খোলা আছে, আর তার ফর্মে কী লেখা হয়েছে
  const [openId, setOpenId] = useState(null)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      const list = await fetchCancellationRequests()
      setRequests(list)
      setSchemaMissing(false)
    } catch (err) {
      if (err instanceof CancellationSchemaMissingError) setSchemaMissing(true)
      else setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    // Manager পর্দা খুলে রাখলে নতুন অনুরোধ নিজে থেকেই আসবে
    const timer = setInterval(load, 20000)
    return () => clearInterval(timer)
  }, [load])

  const counts = useMemo(() => {
    const out = { pending: 0, approved: 0, rejected: 0 }
    requests.forEach((r) => {
      out[r.status] = (out[r.status] || 0) + 1
    })
    return out
  }, [requests])

  const visible = useMemo(
    () => requests.filter((r) => r.status === tab),
    [requests, tab]
  )

  const openReview = (request) => {
    setOpenId(request.id)
    setMessage('')
    setFormError(null)
  }

  const closeReview = () => {
    setOpenId(null)
    setMessage('')
    setFormError(null)
  }

  const decide = async (request, approve) => {
    const note = message.trim()

    if (!note) {
      setFormError('Write a note explaining your decision — the cashier will see it.')
      return
    }

    try {
      setSaving(true)
      setFormError(null)

      await resolveCancellation(request.id, { approve, message: note })

      closeReview()
      await load()
      setTab(approve ? REQUEST_STATUS.APPROVED : REQUEST_STATUS.REJECTED)
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (schemaMissing) {
    return (
      <div style={styles.container}>
        <div style={styles.setupCard}>
          <AlertCircle size={28} color="var(--color-danger)" />
          <h3 style={styles.setupTitle}>Cancellation desk is not installed yet</h3>
          <p style={styles.setupText}>
            Run <code style={styles.code}>supabase/patches/supabase_order_cancellations.sql</code>{' '}
            in your Supabase SQL Editor, then reload this page.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerIcon}>
          <Undo2 size={22} />
        </div>
        <div>
          <h2 style={styles.title}>Cancellation Requests</h2>
          <p style={styles.subtitle}>
            Orders the cashier could not cancel alone, because the food had already
            reached the guest. Nothing has been paid yet — write your note, then
            approve or reject.
          </p>
        </div>
      </div>

      {error && (
        <div style={styles.errorBar}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div style={styles.tabRow}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id)
              closeReview()
            }}
            style={{
              ...styles.tab,
              ...(tab === t.id ? styles.tabActive : null),
            }}
          >
            <span>{t.label}</span>
            {counts[t.id] > 0 && (
              <span
                style={{
                  ...styles.tabCount,
                  ...(t.id === REQUEST_STATUS.PENDING ? styles.tabCountUrgent : null),
                }}
              >
                {counts[t.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={styles.emptyCard}>
          <Loader2 size={22} className="spin" />
          <span>Loading requests…</span>
        </div>
      ) : visible.length === 0 ? (
        <div style={styles.emptyCard}>
          <Inbox size={26} color="var(--color-text-muted)" />
          <span>
            {tab === REQUEST_STATUS.PENDING
              ? 'Nothing waiting. Every cancellation request has been dealt with.'
              : `No ${tab} requests yet.`}
          </span>
        </div>
      ) : (
        <div style={styles.list}>
          {visible.map((request) => {
            const isOpen = openId === request.id
            const orderTotal = request.itemTotal || 0

            return (
              <div key={request.id} style={styles.card}>
                {/* ---- header row ---- */}
                <div style={styles.cardTop}>
                  <div style={styles.orderIdent}>
                    <span style={styles.orderNo}>
                      <Hash size={14} />
                      {request.orderNumber ?? '—'}
                    </span>
                    <span style={styles.stageBadge}>
                      {STAGE_LABEL[request.stage] || request.stage}
                    </span>
                    <span style={styles.metaText}>
                      {request.orderType === 'takeaway'
                        ? 'Take Away'
                        : `Table ${request.tableNumber ?? '—'}`}
                    </span>
                  </div>

                  <span style={styles.amountText}>{taka(orderTotal)}</span>
                </div>

                {/* ---- what the cashier said ---- */}
                <div style={styles.reasonBox}>
                  <div style={styles.reasonHead}>
                    <User size={13} />
                    <span>{request.requestedBy}</span>
                    <span style={styles.dot}>•</span>
                    <Clock size={13} />
                    <span>{clock(request.requestedAt)}</span>
                  </div>
                  <p style={styles.reasonText}>“{request.reason}”</p>
                </div>

                {/* ---- items ---- */}
                {request.items.length > 0 && (
                  <div style={styles.itemsRow}>
                    {request.items.map((item, idx) => (
                      <span key={idx} style={styles.itemChip}>
                        {item.quantity}× {item.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* ---- already decided ---- */}
                {request.status !== REQUEST_STATUS.PENDING && (
                  <div
                    style={{
                      ...styles.verdictBox,
                      borderColor:
                        request.status === REQUEST_STATUS.APPROVED
                          ? 'var(--color-success)'
                          : 'var(--color-danger)',
                    }}
                  >
                    <div style={styles.verdictHead}>
                      {request.status === REQUEST_STATUS.APPROVED ? (
                        <CheckCircle2 size={15} color="var(--color-success)" />
                      ) : (
                        <XCircle size={15} color="var(--color-danger)" />
                      )}
                      <strong>
                        {request.status === REQUEST_STATUS.APPROVED
                          ? 'Approved'
                          : 'Rejected'}
                      </strong>
                      <span style={styles.metaText}>
                        by {request.reviewedBy} · {clock(request.reviewedAt)}
                      </span>
                    </div>

                    <p style={styles.verdictText}>{request.managerMessage}</p>
                  </div>
                )}

                {/* ---- decision form ---- */}
                {request.status === REQUEST_STATUS.PENDING &&
                  (isOpen ? (
                    <div style={styles.form}>
                      <label style={styles.label}>
                        Complaint note / your decision *
                      </label>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={3}
                        placeholder="e.g. Guest said the latte was served cold and refused a remake. Cancelled the order and apologised."
                        style={styles.textarea}
                      />

                      <p style={styles.hint}>
                        Approving cancels the order and frees the table. No money has
                        been taken yet, so there is nothing to refund.
                      </p>

                      {formError && (
                        <div style={styles.formError}>
                          <AlertCircle size={14} />
                          <span>{formError}</span>
                        </div>
                      )}

                      <div style={styles.formActions}>
                        <button
                          onClick={closeReview}
                          disabled={saving}
                          style={styles.ghostBtn}
                        >
                          Close
                        </button>
                        <button
                          onClick={() => decide(request, false)}
                          disabled={saving}
                          style={styles.rejectBtn}
                        >
                          <XCircle size={15} />
                          <span>Reject</span>
                        </button>
                        <button
                          onClick={() => decide(request, true)}
                          disabled={saving}
                          style={styles.approveBtn}
                        >
                          <CheckCircle2 size={15} />
                          <span>{saving ? 'Saving…' : 'Approve Cancellation'}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={styles.cardActions}>
                      {canDecide ? (
                        <button onClick={() => openReview(request)} style={styles.reviewBtn}>
                          Review this request
                        </button>
                      ) : (
                        <span style={styles.waitingNote}>
                          <Clock size={13} /> Waiting for a Manager to decide
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    padding: '28px 32px 64px',
    maxWidth: '1000px',
    margin: '0 auto',
    width: '100%',
  },
  header: {
    display: 'flex',
    gap: '14px',
    alignItems: 'flex-start',
    marginBottom: '22px',
  },
  headerIcon: {
    width: '46px',
    height: '46px',
    borderRadius: '12px',
    backgroundColor: 'rgba(178, 106, 0, 0.12)',
    color: '#B26A00',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    fontSize: '1.6rem',
    fontWeight: '800',
    color: 'var(--color-text-main)',
    letterSpacing: '-0.02em',
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '0.9rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.55,
    maxWidth: '640px',
  },
  errorBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    borderRadius: '10px',
    backgroundColor: 'var(--color-danger-bg)',
    color: 'var(--color-danger)',
    border: '1px solid var(--color-danger)',
    fontSize: '0.86rem',
    fontWeight: '600',
    marginBottom: '16px',
  },
  tabRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  tab: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',
    padding: '8px 16px',
    borderRadius: 'var(--radius-full)',
    border: '1.5px solid var(--color-border)',
    backgroundColor: 'transparent',
    color: 'var(--color-text-muted)',
    fontSize: '0.85rem',
    fontWeight: '700',
    cursor: 'pointer',
  },
  tabActive: {
    backgroundColor: 'var(--color-primary)',
    borderColor: 'var(--color-primary)',
    color: '#FFFFFF',
  },
  tabCount: {
    fontSize: '0.74rem',
    fontWeight: '800',
    padding: '1px 7px',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
  },
  tabCountUrgent: {
    backgroundColor: 'var(--color-danger)',
    color: '#FFFFFF',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  card: {
    backgroundColor: 'var(--color-surface)',
    border: '1.5px solid var(--color-border)',
    borderRadius: '16px',
    padding: '18px 20px',
    boxShadow: 'var(--shadow-sm)',
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    marginBottom: '12px',
  },
  orderIdent: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },
  orderNo: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2px',
    fontSize: '1rem',
    fontWeight: '800',
    color: 'var(--color-text-main)',
  },
  stageBadge: {
    fontSize: '0.72rem',
    fontWeight: '700',
    padding: '3px 9px',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'rgba(178, 106, 0, 0.14)',
    color: '#B26A00',
  },
  metaText: {
    fontSize: '0.8rem',
    color: 'var(--color-text-muted)',
    fontWeight: '600',
  },
  amountText: {
    fontSize: '1.05rem',
    fontWeight: '800',
    color: 'var(--color-text-main)',
  },
  reasonBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: '10px',
    padding: '10px 13px',
    marginBottom: '12px',
  },
  reasonHead: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '0.76rem',
    fontWeight: '600',
    color: 'var(--color-text-muted)',
    marginBottom: '5px',
    flexWrap: 'wrap',
  },
  dot: { opacity: 0.5 },
  reasonText: {
    fontSize: '0.9rem',
    color: 'var(--color-text-main)',
    lineHeight: 1.5,
    fontStyle: 'italic',
  },
  itemsRow: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
    marginBottom: '12px',
  },
  itemChip: {
    fontSize: '0.76rem',
    fontWeight: '600',
    padding: '3px 9px',
    borderRadius: '6px',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-muted)',
  },
  verdictBox: {
    border: '1.5px solid',
    borderRadius: '10px',
    padding: '11px 13px',
  },
  verdictHead: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    fontSize: '0.86rem',
    marginBottom: '6px',
    flexWrap: 'wrap',
  },
  verdictText: {
    fontSize: '0.88rem',
    color: 'var(--color-text-main)',
    lineHeight: 1.55,
  },
  cardActions: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  reviewBtn: {
    padding: '9px 18px',
    backgroundColor: 'var(--color-primary)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.87rem',
    fontWeight: '700',
    cursor: 'pointer',
  },
  waitingNote: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.82rem',
    fontWeight: '600',
    color: 'var(--color-text-muted)',
  },
  form: {
    borderTop: '1px solid var(--color-border)',
    paddingTop: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  label: {
    fontSize: '0.8rem',
    fontWeight: '700',
    color: 'var(--color-text-main)',
  },
  textarea: {
    padding: '10px 13px',
    borderRadius: '8px',
    border: '1.5px solid var(--color-border)',
    backgroundColor: 'var(--color-bg)',
    color: 'var(--color-text-main)',
    fontSize: '0.89rem',
    fontFamily: 'inherit',
    resize: 'vertical',
    outline: 'none',
  },
  input: {
    padding: '9px 13px',
    borderRadius: '8px',
    border: '1.5px solid var(--color-border)',
    backgroundColor: 'var(--color-bg)',
    color: 'var(--color-text-main)',
    fontSize: '0.89rem',
    outline: 'none',
  },
  hint: {
    fontSize: '0.74rem',
    color: 'var(--color-text-muted)',
  },
  formError: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    fontSize: '0.83rem',
    fontWeight: '600',
    color: 'var(--color-danger)',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '9px',
    flexWrap: 'wrap',
  },
  ghostBtn: {
    padding: '9px 16px',
    backgroundColor: 'transparent',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    fontSize: '0.86rem',
    fontWeight: '600',
    color: 'var(--color-text-main)',
    cursor: 'pointer',
  },
  rejectBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '9px 16px',
    backgroundColor: 'transparent',
    border: '1.5px solid var(--color-danger)',
    borderRadius: '8px',
    fontSize: '0.86rem',
    fontWeight: '700',
    color: 'var(--color-danger)',
    cursor: 'pointer',
  },
  approveBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '9px 18px',
    backgroundColor: 'var(--color-success, #2E7D32)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.86rem',
    fontWeight: '700',
    cursor: 'pointer',
  },
  emptyCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    padding: '56px 24px',
    backgroundColor: 'var(--color-surface)',
    border: '1.5px dashed var(--color-border)',
    borderRadius: '16px',
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'var(--color-text-muted)',
    textAlign: 'center',
  },
  setupCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    padding: '48px 28px',
    backgroundColor: 'var(--color-surface)',
    border: '1.5px solid var(--color-border)',
    borderRadius: '16px',
    textAlign: 'center',
  },
  setupTitle: {
    fontSize: '1.15rem',
    fontWeight: '800',
    color: 'var(--color-text-main)',
  },
  setupText: {
    fontSize: '0.9rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.6,
    maxWidth: '520px',
  },
  code: {
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '0.84rem',
  },
}
