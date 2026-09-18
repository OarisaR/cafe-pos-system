// =========================================================================
// MODULE OWNER: Person 3 — Ingredient create / edit
// =========================================================================
import React, { useEffect, useState } from 'react'
import { X, Save, AlertCircle } from 'lucide-react'
import { UNITS, createIngredient, updateIngredient } from '../inventoryService'

export const IngredientModal = ({ ingredient, onClose, onSaved }) => {
  const isNew = !ingredient
  // recipe তে ব্যবহার হলে unit বদলানো যাবে না — নাহলে recipe এর পরিমাণের মানে বদলে যাবে
  const unitLocked = !isNew && ingredient.usedIn.length > 0

  const [name, setName] = useState(ingredient?.name || '')
  const [unit, setUnit] = useState(ingredient?.unit || 'g')
  const [costPerUnit, setCostPerUnit] = useState(ingredient ? String(ingredient.cost_per_unit) : '')
  const [stockLevel, setStockLevel] = useState('')
  const [restockThreshold, setRestockThreshold] = useState(
    ingredient ? String(ingredient.restock_threshold) : ''
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !saving && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, saving])

  const isNonNegative = (v) => v !== '' && !Number.isNaN(Number(v)) && Number(v) >= 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return setError('Ingredient name is required.')
    if (!isNonNegative(costPerUnit)) return setError('Enter a valid cost per unit (0 or more).')
    if (restockThreshold !== '' && !isNonNegative(restockThreshold))
      return setError('Restock level must be 0 or more.')
    if (isNew && stockLevel !== '' && !isNonNegative(stockLevel))
      return setError('Starting stock must be 0 or more.')

    setSaving(true)
    setError(null)
    try {
      const payload = { name, unit, costPerUnit, restockThreshold, stockLevel }
      const saved = isNew
        ? await createIngredient(payload)
        : await updateIngredient(ingredient.ingredient_id, payload)
      onSaved(saved)
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
        aria-labelledby="ingredient-modal-title"
      >
        <div style={styles.header}>
          <div>
            <h3 id="ingredient-modal-title" style={styles.title}>
              {isNew ? 'Add Ingredient' : 'Edit Ingredient'}
            </h3>
            <p style={styles.subtitle}>
              {isNew ? 'Add a new pantry item to track' : 'Update details — use Restock to change stock'}
            </p>
          </div>
          <button type="button" onClick={onClose} style={styles.iconBtn} aria-label="Close" disabled={saving}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={styles.errorBanner} role="alert">
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.field}>
            <span style={styles.label}>Name *</span>
            <input
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Whole Dairy Milk"
              autoFocus
            />
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Unit *</span>
            <select
              className="input-field"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              disabled={unitLocked}
            >
              {UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
            <span style={styles.hint}>
              {unitLocked
                ? `Locked — used in ${ingredient.usedIn.length} recipe${ingredient.usedIn.length > 1 ? 's' : ''}, whose quantities are in ${ingredient.unit}.`
                : 'Use small units (g, ml). Recipes must use the same unit.'}
            </span>
          </label>

          <div style={styles.grid2}>
            <label style={styles.field}>
              <span style={styles.label}>Cost per {unit} (৳) *</span>
              <input
                className="input-field"
                type="number"
                min="0"
                step="0.0001"
                inputMode="decimal"
                value={costPerUnit}
                onChange={(e) => setCostPerUnit(e.target.value)}
                placeholder="0.00"
              />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>Restock when below ({unit})</span>
              <input
                className="input-field"
                type="number"
                min="0"
                step="0.001"
                inputMode="decimal"
                value={restockThreshold}
                onChange={(e) => setRestockThreshold(e.target.value)}
                placeholder="0"
              />
            </label>
          </div>

          {isNew && (
            <label style={styles.field}>
              <span style={styles.label}>Starting stock ({unit})</span>
              <input
                className="input-field"
                type="number"
                min="0"
                step="0.001"
                inputMode="decimal"
                value={stockLevel}
                onChange={(e) => setStockLevel(e.target.value)}
                placeholder="0"
              />
            </label>
          )}

          <div style={styles.actions}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              <Save size={16} />
              <span>{saving ? 'Saving…' : isNew ? 'Add Ingredient' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const styles = {
  card: { maxWidth: '520px', padding: '24px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' },
  title: { fontSize: '1.3rem', fontWeight: '800' },
  subtitle: { fontSize: '0.84rem', color: 'var(--color-text-muted)', marginTop: '2px' },
  iconBtn: { minHeight: '36px', width: '36px', borderRadius: '50%', color: 'var(--color-text-muted)' },
  errorBanner: {
    display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 12px', marginBottom: '12px',
    borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-danger)',
    backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)', fontSize: '0.84rem', fontWeight: '600',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '14px' },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '0.82rem', fontWeight: '700' },
  hint: { fontSize: '0.74rem', color: 'var(--color-text-muted)', lineHeight: 1.45 },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' },
}
