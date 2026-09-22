// =========================================================================
// MODULE OWNER: Person 3 — Restock (add) / Set stock count (correct)
// =========================================================================
import React, { useEffect, useState } from 'react'
import { X, PackagePlus, ClipboardCheck, AlertCircle } from 'lucide-react'
import { restockIngredient, setStockCount, formatQuantity } from '../inventoryService'

export const StockModal = ({ ingredient, onClose, onSaved }) => {
  const [mode, setMode] = useState('restock') // 'restock' | 'count'
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !saving && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, saving])

  const value = Number(amount)
  const valid = amount !== '' && !Number.isNaN(value) && (mode === 'restock' ? value > 0 : value >= 0)
  const preview = mode === 'restock' ? ingredient.stock_level + (valid ? value : 0) : valid ? value : ingredient.stock_level

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!valid) {
      setError(mode === 'restock' ? 'Enter a quantity greater than 0.' : 'Enter a count of 0 or more.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      if (mode === 'restock') {
        await restockIngredient(ingredient.ingredient_id, value)
        onSaved(`Added ${formatQuantity(value, ingredient.unit)} to ${ingredient.name}.`)
      } else {
        await setStockCount(ingredient.ingredient_id, value)
        onSaved(`${ingredient.name} stock set to ${formatQuantity(value, ingredient.unit)}.`)
      }
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={() => !saving && onClose()}>
      <div
        className="modal-card"
        style={styles.card}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="stock-modal-title"
      >
        <div style={styles.header}>
          <div>
            <h3 id="stock-modal-title" style={styles.title}>{ingredient.name}</h3>
            <p style={styles.subtitle}>
              Current stock: <strong>{formatQuantity(ingredient.stock_level, ingredient.unit)}</strong>
            </p>
          </div>
          <button type="button" onClick={onClose} style={styles.iconBtn} aria-label="Close" disabled={saving}>
            <X size={18} />
          </button>
        </div>

        <div style={styles.segment} role="tablist" aria-label="Stock action">
          {[
            { id: 'restock', label: 'Restock', Icon: PackagePlus },
            { id: 'count', label: 'Set count', Icon: ClipboardCheck },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              onClick={() => {
                setMode(id)
                setAmount('')
                setError(null)
              }}
              style={{
                ...styles.segBtn,
                backgroundColor: mode === id ? 'var(--color-primary)' : 'transparent',
                color: mode === id ? '#FFFFFF' : 'var(--color-text-main)',
              }}
            >
              <Icon size={15} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <p style={styles.modeHint}>
          {mode === 'restock'
            ? 'A delivery arrived — the amount is added to the current stock.'
            : 'You counted the shelf — replaces the stock with the real amount (spillage, waste, mistakes).'}
        </p>

        {error && (
          <div style={styles.errorBanner} role="alert">
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.field}>
            <span style={styles.label}>
              {mode === 'restock' ? `Quantity received (${ingredient.unit})` : `Actual count (${ingredient.unit})`}
            </span>
            <input
              className="input-field"
              type="number"
              min="0"
              step="0.001"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              autoFocus
            />
          </label>

          <div style={styles.preview}>
            <span>Stock after saving</span>
            <strong>{formatQuantity(preview, ingredient.unit)}</strong>
          </div>

          <div style={styles.actions}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving || !valid}>
              <span>{saving ? 'Saving…' : mode === 'restock' ? 'Add to Stock' : 'Save Count'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const styles = {
  card: { maxWidth: '460px', padding: '24px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' },
  title: { fontSize: '1.3rem', fontWeight: '800' },
  subtitle: { fontSize: '0.86rem', color: 'var(--color-text-muted)', marginTop: '2px' },
  iconBtn: { minHeight: '36px', width: '36px', borderRadius: '50%', color: 'var(--color-text-muted)' },
  segment: {
    display: 'flex', padding: '3px', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)',
  },
  segBtn: { flex: 1, minHeight: '40px', borderRadius: '6px', fontSize: '0.86rem', fontWeight: '700' },
  modeHint: { fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '10px 0 14px', lineHeight: 1.5 },
  errorBanner: {
    display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 12px', marginBottom: '12px',
    borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-danger)',
    backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)', fontSize: '0.84rem', fontWeight: '600',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '14px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '0.82rem', fontWeight: '700' },
  preview: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
    padding: '12px 14px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-primary-subtle)',
    fontSize: '0.86rem', fontVariantNumeric: 'tabular-nums',
  },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: '10px' },
}
