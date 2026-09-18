// =========================================================================
// MODULE OWNER: Person 3 — Ingredient Inventory
// Route: /dashboard/inventory
//
// User Flow (Admin → Manage Inventory): ingredients, stock levels,
// cost/unit, restock items।
//
// কে কী পারবে (rbac.js + Supabase RLS):
//   owner, manager, staff → সব কিছু দেখা ও বদলানো
//   cashier               → এই পেজই খুলতে পারে না
//
// Stock কমে কখন: অর্ডার "paid" হলে ডেটাবেজ trigger recipe অনুযায়ী কমায়।
// এই পেজ শুধু restock (যোগ) আর count (সংশোধন) করে।
//
// Stock এর ইতিহাস এখনো রাখা হয় না। পরে যোগ করতে চাইলে
// supabase_pos_schema.sql এর restock_ingredient() function দেখুন।
//
// ডেটা: src/inventory/inventoryService.js
// =========================================================================
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  PackagePlus,
  RefreshCw,
  Database,
  AlertCircle,
  CheckCircle2,
  Eye,
} from 'lucide-react'
import { useAuth } from '../authentication/context/AuthContext'
import { MODULES } from '../authentication/constants/rbac'
import {
  InventorySchemaMissingError,
  fetchIngredientsWithUsage,
  deleteIngredient,
  getStockStatus,
  formatQuantity,
  formatTaka,
} from './inventoryService'
import { IngredientModal } from './components/IngredientModal'
import { StockModal } from './components/StockModal'

const STATUS_STYLE = {
  ok:  { label: 'In stock',     color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
  low: { label: 'Low stock',    color: 'var(--color-warning)', bg: 'var(--color-warning-bg)' },
  out: { label: 'Out of stock', color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)' },
}

export const InventoryPage = () => {
  const { canEdit } = useAuth()
  const editable = canEdit(MODULES.INVENTORY)

  const [loading, setLoading] = useState(true)
  const [schemaMissing, setSchemaMissing] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [ingredients, setIngredients] = useState([])

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [editModal, setEditModal] = useState(null)   // null | { ingredient: null | ingredient }
  const [stockTarget, setStockTarget] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (type, text) => {
    setToast({ type, text })
    setTimeout(() => setToast(null), 4000)
  }

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      setIngredients(await fetchIngredientsWithUsage())
      setSchemaMissing(false)
    } catch (err) {
      if (err instanceof InventorySchemaMissingError) setSchemaMissing(true)
      else setLoadError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // ---------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------
  const stats = useMemo(() => {
    const byStatus = { ok: 0, low: 0, out: 0 }
    let stockValue = 0
    for (const ing of ingredients) {
      byStatus[getStockStatus(ing)] += 1
      stockValue += Math.max(0, ing.stock_level) * ing.cost_per_unit
    }
    return { total: ingredients.length, ...byStatus, stockValue }
  }, [ingredients])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return ingredients
      .filter((ing) => {
        const status = getStockStatus(ing)
        if (statusFilter === 'attention' && status === 'ok') return false
        if (statusFilter === 'out' && status !== 'out') return false
        if (!q) return true
        return ing.name.toLowerCase().includes(q) || ing.usedIn.some((n) => n.toLowerCase().includes(q))
      })
      // যেগুলোর দিকে নজর দরকার সেগুলো আগে
      .sort((a, b) => {
        const rank = { out: 0, low: 1, ok: 2 }
        return rank[getStockStatus(a)] - rank[getStockStatus(b)] || a.name.localeCompare(b.name)
      })
  }, [ingredients, search, statusFilter])

  // ---------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------
  const handleDelete = async (ing) => {
    if (ing.usedIn.length) {
      showToast('error', `"${ing.name}" is used in: ${ing.usedIn.join(', ')}. Remove it from those recipes first.`)
      return
    }
    if (!window.confirm(`Delete "${ing.name}" from inventory? This cannot be undone.`)) return

    setBusyId(ing.ingredient_id)
    try {
      await deleteIngredient(ing.ingredient_id, ing.usedIn)
      setIngredients((prev) => prev.filter((i) => i.ingredient_id !== ing.ingredient_id))
      showToast('success', `"${ing.name}" was deleted.`)
    } catch (err) {
      showToast('error', err.message)
    } finally {
      setBusyId(null)
    }
  }

  const afterSave = async (message) => {
    setEditModal(null)
    setStockTarget(null)
    await load()
    showToast('success', message)
  }

  const retry = () => {
    setLoading(true)
    load()
  }

  // ---------------------------------------------------------------------
  // Render states
  // ---------------------------------------------------------------------
  if (loading) {
    return (
      <div style={styles.centerState}>
        <RefreshCw size={26} color="var(--color-primary)" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={styles.muted}>Loading inventory…</p>
      </div>
    )
  }

  if (schemaMissing || loadError) {
    return (
      <div style={styles.setupCard}>
        <div
          style={{
            ...styles.setupIcon,
            backgroundColor: schemaMissing ? 'var(--color-warning-bg)' : 'var(--color-danger-bg)',
          }}
        >
          {schemaMissing ? (
            <Database size={28} color="var(--color-warning)" />
          ) : (
            <AlertCircle size={28} color="var(--color-danger)" />
          )}
        </div>
        <h2 style={styles.setupTitle}>
          {schemaMissing ? 'Inventory tables are not set up yet' : 'Could not load the inventory'}
        </h2>
        {schemaMissing ? (
          <>
            <p style={styles.muted}>The Owner needs to run the POS schema script in Supabase once.</p>
            <ol style={styles.setupSteps}>
              <li>Open Supabase Dashboard → SQL Editor → New query</li>
              <li>
                Paste the whole file <code style={styles.code}>supabase/supabase_pos_schema.sql</code>
              </li>
              <li>Click Run, then come back and press Retry</li>
            </ol>
          </>
        ) : (
          <p style={styles.muted}>{loadError}</p>
        )}
        <button className="btn-primary" onClick={retry}>
          <RefreshCw size={16} />
          <span>Retry</span>
        </button>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      {toast && (
        <div
          role="status"
          style={{
            ...styles.toast,
            backgroundColor: toast.type === 'error' ? 'var(--color-danger-bg)' : 'var(--color-success-bg)',
            color: toast.type === 'error' ? 'var(--color-danger)' : 'var(--color-success)',
            borderColor: toast.type === 'error' ? 'var(--color-danger)' : 'var(--color-success)',
          }}
        >
          {toast.type === 'error' ? <AlertCircle size={17} /> : <CheckCircle2 size={17} />}
          <span>{toast.text}</span>
        </div>
      )}

      {!editable && (
        <div style={styles.infoBanner}>
          <Eye size={16} />
          <span>View only — your role can see stock levels but cannot change them.</span>
        </div>
      )}

      {/* Stats */}
      <div style={styles.statsRow}>
        <Stat label="Ingredients" value={stats.total} />
        <Stat label="Low stock" value={stats.low} tone={stats.low ? 'warning' : undefined} />
        <Stat label="Out of stock" value={stats.out} tone={stats.out ? 'danger' : undefined} />
        <Stat label="Stock value" value={formatTaka(stats.stockValue, 0)} />
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
            placeholder="Search ingredients or menu items"
            aria-label="Search inventory"
          />
        </div>

        <select
          className="input-field"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by stock status"
        >
          <option value="all">All ingredients</option>
          <option value="attention">Needs restock</option>
          <option value="out">Out of stock only</option>
        </select>

        <button className="btn-secondary" style={styles.toolbarBtn} onClick={load} aria-label="Refresh inventory">
          <RefreshCw size={16} />
        </button>

        {editable && (
          <button className="btn-primary" style={styles.toolbarBtn} onClick={() => setEditModal({ ingredient: null })}>
            <Plus size={16} />
            <span>Add Ingredient</span>
          </button>
        )}
      </div>

      {/* Table */}
      {visible.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyTitle}>
            {ingredients.length === 0 ? 'No ingredients yet' : 'No ingredients match your filters'}
          </p>
          <p style={styles.muted}>
            {ingredients.length === 0
              ? editable
                ? 'Add your first ingredient with the "Add Ingredient" button.'
                : 'Ingredients will appear here once they are added.'
              : 'Try a different search or filter.'}
          </p>
        </div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Ingredient</th>
                <th style={styles.th}>Stock level</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Restock at</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Cost / unit</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Stock value</th>
                <th style={styles.th}>Status</th>
                {editable && <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {visible.map((ing) => {
                const status = getStockStatus(ing)
                const s = STATUS_STYLE[status]
                const busy = busyId === ing.ingredient_id
                // বার: restock সীমার দ্বিগুণকে "পূর্ণ" ধরা হয়েছে
                const fullAt = Math.max(ing.restock_threshold * 2, 1)
                const pct = Math.max(0, Math.min(100, (ing.stock_level / fullAt) * 100))

                return (
                  <tr key={ing.ingredient_id} style={{ opacity: busy ? 0.55 : 1 }}>
                    <td style={styles.td}>
                      <div style={styles.name}>{ing.name}</div>
                      <div style={styles.usedIn} title={ing.usedIn.join(', ')}>
                        {ing.usedIn.length
                          ? `Used in ${ing.usedIn.length} item${ing.usedIn.length > 1 ? 's' : ''}: ${ing.usedIn.join(', ')}`
                          : 'Not used in any recipe'}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={{ ...styles.qty, color: status === 'out' ? 'var(--color-danger)' : undefined }}>
                        {formatQuantity(ing.stock_level, ing.unit)}
                      </div>
                      <div
                        style={styles.barTrack}
                        role="img"
                        aria-label={`${s.label}, ${Math.round(pct)}% of comfortable level`}
                      >
                        <div style={{ ...styles.barFill, width: `${pct}%`, backgroundColor: s.color }} />
                      </div>
                    </td>
                    <td style={{ ...styles.td, ...styles.num, color: 'var(--color-text-muted)' }}>
                      {formatQuantity(ing.restock_threshold, ing.unit)}
                    </td>
                    <td style={{ ...styles.td, ...styles.num }}>
                      {formatTaka(ing.cost_per_unit, 4)}
                      <span style={styles.perUnit}> / {ing.unit}</span>
                    </td>
                    <td style={{ ...styles.td, ...styles.num }}>
                      {formatTaka(Math.max(0, ing.stock_level) * ing.cost_per_unit, 0)}
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, color: s.color, backgroundColor: s.bg }}>
                        <span style={{ ...styles.dot, backgroundColor: s.color }} />
                        {s.label}
                      </span>
                    </td>
                    {editable && (
                      <td style={{ ...styles.td, textAlign: 'right' }}>
                        <div style={styles.rowActions}>
                          <button
                            type="button"
                            style={styles.restockBtn}
                            onClick={() => setStockTarget(ing)}
                            disabled={busy}
                            aria-label={`Restock ${ing.name}`}
                          >
                            <PackagePlus size={15} />
                            <span>Stock</span>
                          </button>
                          <button
                            type="button"
                            style={styles.iconBtn}
                            onClick={() => setEditModal({ ingredient: ing })}
                            disabled={busy}
                            aria-label={`Edit ${ing.name}`}
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            style={{ ...styles.iconBtn, color: 'var(--color-danger)' }}
                            onClick={() => handleDelete(ing)}
                            disabled={busy}
                            aria-label={`Delete ${ing.name}`}
                            title={ing.usedIn.length ? 'Used in recipes — cannot delete' : 'Delete'}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {editModal && (
        <IngredientModal
          ingredient={editModal.ingredient}
          onClose={() => setEditModal(null)}
          onSaved={(saved) =>
            afterSave(editModal.ingredient ? `"${saved.name}" was updated.` : `"${saved.name}" was added.`)
          }
        />
      )}

      {stockTarget && (
        <StockModal ingredient={stockTarget} onClose={() => setStockTarget(null)} onSaved={afterSave} />
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
          tone === 'danger'
            ? 'var(--color-danger)'
            : tone === 'warning'
              ? 'var(--color-warning)'
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
  centerState: { padding: '80px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' },
  muted: { fontSize: '0.88rem', color: 'var(--color-text-muted)', lineHeight: 1.6 },
  setupCard: {
    maxWidth: '560px', margin: '40px auto', padding: '32px 28px', textAlign: 'center',
    backgroundColor: 'var(--color-surface)', border: '1.5px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
  },
  setupIcon: { width: '60px', height: '60px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  setupTitle: { fontSize: '1.35rem', fontWeight: '800' },
  setupSteps: { textAlign: 'left', fontSize: '0.86rem', lineHeight: 1.8, paddingLeft: '20px', marginBottom: '6px' },
  code: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.8rem', padding: '1px 6px',
    borderRadius: '4px', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)',
  },
  toast: {
    position: 'fixed', top: '84px', left: '50%', transform: 'translateX(-50%)', zIndex: 1100,
    display: 'flex', alignItems: 'center', gap: '8px', maxWidth: 'min(92vw, 560px)', padding: '10px 18px',
    borderRadius: 'var(--radius-full)', border: '1.5px solid', boxShadow: 'var(--shadow-lg)',
    fontSize: '0.86rem', fontWeight: '600',
  },
  infoBanner: {
    display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--color-info-bg)', color: 'var(--color-info)', fontSize: '0.86rem', fontWeight: '600',
  },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' },
  statCard: {
    padding: '14px 16px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface)',
    border: '1.5px solid var(--color-border)',
  },
  statValue: {
    fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: '800', lineHeight: 1.1,
    fontVariantNumeric: 'tabular-nums',
  },
  statLabel: {
    fontSize: '0.74rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em',
    color: 'var(--color-text-muted)', marginTop: '4px',
  },
  toolbar: { display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' },
  searchWrap: { position: 'relative', flex: '1 1 240px', display: 'flex', alignItems: 'center' },
  searchIcon: { position: 'absolute', left: '14px', pointerEvents: 'none' },
  searchInput: { width: '100%', paddingLeft: '40px' },
  toolbarBtn: { padding: '10px 14px', borderRadius: 'var(--radius-sm)' },
  emptyState: {
    padding: '48px 20px', textAlign: 'center', borderRadius: 'var(--radius-md)',
    border: '1.5px dashed var(--color-border)',
  },
  emptyTitle: { fontSize: '1rem', fontWeight: '700', marginBottom: '4px' },
  tableWrap: {
    overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
  },
  table: { width: '100%', minWidth: '860px', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left', padding: '12px 16px', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase',
    letterSpacing: '0.05em', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg)',
  },
  td: { padding: '12px 16px', fontSize: '0.88rem', verticalAlign: 'middle', borderBottom: '1px solid var(--color-border-light)' },
  num: { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' },
  name: { fontWeight: '700' },
  usedIn: {
    fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: '2px', maxWidth: '280px',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  qty: { fontWeight: '700', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' },
  barTrack: {
    height: '6px', width: '140px', marginTop: '6px', borderRadius: '999px',
    backgroundColor: 'var(--color-border-light)', overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: '999px' },
  perUnit: { fontSize: '0.74rem', color: 'var(--color-text-muted)' },
  badge: {
    display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 11px',
    borderRadius: 'var(--radius-full)', fontSize: '0.76rem', fontWeight: '700', whiteSpace: 'nowrap',
  },
  dot: { width: '7px', height: '7px', borderRadius: '50%' },
  rowActions: { display: 'inline-flex', gap: '4px', alignItems: 'center' },
  restockBtn: {
    minHeight: '38px', padding: '6px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem',
    border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-primary-active)',
  },
  iconBtn: { minHeight: '38px', width: '38px', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-muted)' },
}
