// =========================================================================
// MODULE OWNER: Person 3 — Menu item create / edit + Recipe (BOM) editor
// =========================================================================
import React, { useEffect, useMemo, useState } from 'react'
import { X, Plus, Trash2, AlertCircle, Save, ImageIcon } from 'lucide-react'
import {
  createMenuItem,
  updateMenuItem,
  saveRecipe,
  calculateUnitCost,
  formatTaka,
  areCardFieldsSupported,
} from '../menuService'

// শুধু React list key এর জন্য। randomUUID ব্যবহার করা হয়নি, কারণ http:// LAN
// ঠিকানায় (যেমন 192.168.x.x:5173) ব্রাউজার ওটা দেয় না
let rowSeq = 0
const nextRowKey = () => `row-${Date.now()}-${rowSeq++}`

const emptyRow = () => ({ key: nextRowKey(), ingredientId: '', quantity: '' })

// recipeLoaded = false হলে (ingredient/recipe লোড হয়নি) recipe সেভ করা হয় না —
// নাহলে খালি তালিকা পাঠিয়ে আসল recipe মুছে যেত
export const MenuItemModal = ({ item, categories, ingredients, recipe, recipeLoaded, onClose, onSaved }) => {
  const isNew = !item

  const [name, setName] = useState(item?.name || '')
  const [description, setDescription] = useState(item?.description || '')
  const [categoryId, setCategoryId] = useState(item?.category_id || categories[0]?.category_id || '')
  const [price, setPrice] = useState(item ? String(item.price) : '')
  const [status, setStatus] = useState(item?.status || 'available')
  const [imageUrl, setImageUrl] = useState(item?.image_url || '')
  const [prepTime, setPrepTime] = useState(item?.prep_time_minutes != null ? String(item.prep_time_minutes) : '')
  const [previewFailed, setPreviewFailed] = useState(false)
  const cardFields = areCardFieldsSupported()
  const [rows, setRows] = useState(() =>
    (recipe || []).map((r) => ({
      key: nextRowKey(),
      ingredientId: r.ingredient.ingredient_id,
      quantity: String(r.quantity),
    }))
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !saving && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, saving])

  const ingredientById = useMemo(
    () => Object.fromEntries(ingredients.map((i) => [i.ingredient_id, i])),
    [ingredients]
  )

  // ফর্মে যা লেখা আছে তা থেকেই live খরচ ও লাভ
  const liveRecipe = rows
    .filter((r) => ingredientById[r.ingredientId] && Number(r.quantity) > 0)
    .map((r) => ({ ingredient: ingredientById[r.ingredientId], quantity: Number(r.quantity) }))
  const unitCost = calculateUnitCost(liveRecipe)
  const numericPrice = Number(price) || 0
  const margin = numericPrice > 0 ? ((numericPrice - unitCost) / numericPrice) * 100 : 0

  const updateRow = (key, patch) => setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  const removeRow = (key) => setRows((prev) => prev.filter((r) => r.key !== key))

  const validate = () => {
    if (!name.trim()) return 'Item name is required.'
    if (!categoryId) return 'Please choose a category.'
    if (price === '' || Number.isNaN(Number(price)) || Number(price) < 0) return 'Enter a valid price (0 or more).'
    if (imageUrl.trim() && !/^https?:\/\//i.test(imageUrl.trim()))
      return 'The photo link must start with https:// (or http://).'
    if (prepTime !== '' && !(Number.isInteger(Number(prepTime)) && Number(prepTime) >= 0 && Number(prepTime) <= 600))
      return 'Prep time must be a whole number of minutes between 0 and 600.'

    const used = new Set()
    for (const r of rows) {
      if (!r.ingredientId && !r.quantity) continue // সম্পূর্ণ খালি row বাদ
      if (!r.ingredientId) return 'Choose an ingredient for every recipe row, or remove the empty row.'
      if (!(Number(r.quantity) > 0)) return 'Every recipe quantity must be greater than 0.'
      if (used.has(r.ingredientId)) return `"${ingredientById[r.ingredientId]?.name}" is listed twice in the recipe.`
      used.add(r.ingredientId)
    }
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const problem = validate()
    if (problem) {
      setError(problem)
      return
    }

    setSaving(true)
    setError(null)
    try {
      const payload = { categoryId, name, description, price, status, imageUrl, prepTime }
      const saved = isNew ? await createMenuItem(payload) : await updateMenuItem(item.menu_item_id, payload)

      if (!recipeLoaded) {
        onSaved(saved, 'Item saved. The recipe was not changed because ingredients could not be loaded.')
        return
      }

      const recipeRows = rows.filter((r) => r.ingredientId && Number(r.quantity) > 0)
      try {
        await saveRecipe(saved.menu_item_id, recipeRows)
      } catch (recipeErr) {
        // আইটেম সেভ হয়েছে, শুধু recipe হয়নি — সেটা স্পষ্ট করে জানানো
        onSaved(saved, `Item saved, but the recipe could not be saved: ${recipeErr.message}`)
        return
      }

      onSaved(saved)
    } catch (err) {
      setError(err.message)
    } finally {
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
        aria-labelledby="menu-item-modal-title"
      >
        <div style={styles.header}>
          <div>
            <h3 id="menu-item-modal-title" style={styles.title}>
              {isNew ? 'Add Menu Item' : 'Edit Menu Item'}
            </h3>
            <p style={styles.subtitle}>Price, category, availability and recipe ingredients</p>
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
          <div style={styles.grid2}>
            <label style={styles.field}>
              <span style={styles.label}>Item name *</span>
              <input
                className="input-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Spanish Latte"
                autoFocus
              />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>Category *</span>
              <select className="input-field" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                {categories.length === 0 && <option value="">Create a category first</option>}
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label style={styles.field}>
              <span style={styles.label}>Price (৳) *</span>
              <input
                className="input-field"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
              />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>Availability</span>
              <select className="input-field" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="available">Available</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </label>
          </div>

          <label style={styles.field}>
            <span style={styles.label}>Description</span>
            <input
              className="input-field"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description shown on the POS"
            />
          </label>

          {/* Card photo + prep time */}
          <div style={styles.photoRow}>
            <div style={styles.photoPreview} aria-hidden="true">
              {imageUrl.trim() && !previewFailed ? (
                <img
                  src={imageUrl.trim()}
                  alt=""
                  style={styles.photoImg}
                  onError={() => setPreviewFailed(true)}
                />
              ) : (
                <ImageIcon size={26} color="var(--color-text-subtle)" />
              )}
            </div>

            <div style={styles.photoFields}>
              <label style={{ ...styles.field, flex: '1 1 220px' }}>
                <span style={styles.label}>Photo link</span>
                <input
                  className="input-field"
                  type="url"
                  inputMode="url"
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value)
                    setPreviewFailed(false)
                  }}
                  placeholder="https://…/spanish-latte.jpg"
                  disabled={!cardFields}
                />
                {imageUrl.trim() && previewFailed && (
                  <span style={{ ...styles.hint, color: 'var(--color-danger)' }}>
                    This link did not load as an image. Check that it points directly to a .jpg / .png.
                  </span>
                )}
              </label>

              <label style={{ ...styles.field, maxWidth: '160px' }}>
                <span style={styles.label}>Prep time (min)</span>
                <input
                  className="input-field"
                  type="number"
                  min="0"
                  max="600"
                  step="1"
                  inputMode="numeric"
                  value={prepTime}
                  onChange={(e) => setPrepTime(e.target.value)}
                  placeholder="5"
                  disabled={!cardFields}
                />
              </label>
            </div>
          </div>
          {!cardFields && (
            <p style={styles.hint}>
              Photo and prep time are turned off until the Owner runs
              supabase/patches/supabase_menu_card_fields.sql in Supabase.
            </p>
          )}

          {/* Recipe / BOM */}
          <div style={styles.recipeBox}>
            <div style={styles.recipeHead}>
              <div>
                <div style={styles.recipeTitle}>Recipe (ingredients per serving)</div>
                <div style={styles.recipeHint}>
                  Stock is deducted by these amounts every time the item is sold.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRows((prev) => [...prev, emptyRow()])}
                style={styles.addRowBtn}
                disabled={!recipeLoaded || ingredients.length === 0}
              >
                <Plus size={14} />
                <span>Add ingredient</span>
              </button>
            </div>

            {!recipeLoaded ? (
              <p style={styles.recipeEmpty}>
                Ingredients could not be loaded, so the recipe cannot be edited right now.
              </p>
            ) : ingredients.length === 0 ? (
              <p style={styles.recipeEmpty}>
                No ingredients exist yet. Add ingredients in the Inventory module first.
              </p>
            ) : rows.length === 0 ? (
              <p style={styles.recipeEmpty}>No recipe yet — this item will not use any stock.</p>
            ) : (
              <div style={styles.rowList}>
                {rows.map((r) => {
                  const ing = ingredientById[r.ingredientId]
                  const lineCost = ing ? Number(r.quantity || 0) * Number(ing.cost_per_unit) : 0
                  return (
                    <div key={r.key} style={styles.recipeRow}>
                      <select
                        className="input-field"
                        style={styles.ingSelect}
                        value={r.ingredientId}
                        onChange={(e) => updateRow(r.key, { ingredientId: e.target.value })}
                        aria-label="Ingredient"
                      >
                        <option value="">Choose ingredient…</option>
                        {ingredients.map((i) => (
                          <option key={i.ingredient_id} value={i.ingredient_id}>
                            {i.name}
                          </option>
                        ))}
                      </select>

                      <div style={styles.qtyWrap}>
                        <input
                          className="input-field"
                          style={styles.qtyInput}
                          type="number"
                          min="0"
                          step="0.001"
                          inputMode="decimal"
                          value={r.quantity}
                          onChange={(e) => updateRow(r.key, { quantity: e.target.value })}
                          placeholder="Qty"
                          aria-label="Quantity"
                        />
                        <span style={styles.unit}>{ing?.unit || ''}</span>
                      </div>

                      <span style={styles.lineCost}>{formatTaka(lineCost)}</span>

                      <button
                        type="button"
                        onClick={() => removeRow(r.key)}
                        style={styles.removeBtn}
                        aria-label="Remove ingredient"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            <div style={styles.costSummary}>
              <div>
                <span style={styles.costLabel}>Cost per serving</span>
                <strong style={styles.costValue}>{formatTaka(unitCost)}</strong>
              </div>
              <div>
                <span style={styles.costLabel}>Gross margin</span>
                <strong
                  style={{
                    ...styles.costValue,
                    color: margin < 30 ? 'var(--color-danger)' : 'var(--color-success)',
                  }}
                >
                  {numericPrice > 0 ? `${margin.toFixed(1)}%` : '—'}
                </strong>
              </div>
            </div>
          </div>

          <div style={styles.actions}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving || categories.length === 0}>
              <Save size={16} />
              <span>{saving ? 'Saving…' : isNew ? 'Create Item' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const styles = {
  card: {
    maxWidth: '720px',
    padding: '26px 26px 22px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '16px',
  },
  title: {
    fontSize: '1.35rem',
    fontWeight: '800',
  },
  subtitle: {
    fontSize: '0.84rem',
    color: 'var(--color-text-muted)',
    marginTop: '2px',
  },
  iconBtn: {
    minHeight: '36px',
    width: '36px',
    borderRadius: '50%',
    color: 'var(--color-text-muted)',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    padding: '10px 12px',
    marginBottom: '14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-danger)',
    backgroundColor: 'var(--color-danger-bg)',
    color: 'var(--color-danger)',
    fontSize: '0.84rem',
    fontWeight: '600',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '14px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '0.82rem',
    fontWeight: '700',
  },
  hint: {
    fontSize: '0.74rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.45,
  },
  photoRow: {
    display: 'flex',
    gap: '14px',
    alignItems: 'flex-start',
  },
  photoPreview: {
    width: '76px',
    height: '76px',
    flexShrink: 0,
    marginTop: '22px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-surface)',
    border: '3px solid var(--color-white)',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  photoFields: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
  },
  recipeBox: {
    border: '1.5px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-surface)',
    padding: '16px',
  },
  recipeHead: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    marginBottom: '12px',
  },
  recipeTitle: {
    fontSize: '0.92rem',
    fontWeight: '800',
  },
  recipeHint: {
    fontSize: '0.76rem',
    color: 'var(--color-text-muted)',
  },
  addRowBtn: {
    minHeight: '38px',
    padding: '6px 12px',
    fontSize: '0.82rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg)',
    color: 'var(--color-primary-active)',
  },
  recipeEmpty: {
    fontSize: '0.84rem',
    color: 'var(--color-text-muted)',
    padding: '6px 0 10px',
  },
  rowList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  recipeRow: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) 130px 80px 40px',
    gap: '8px',
    alignItems: 'center',
  },
  ingSelect: {
    minWidth: 0,
    padding: '8px 10px',
  },
  qtyWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  qtyInput: {
    width: '100%',
    padding: '8px 36px 8px 10px',
  },
  unit: {
    position: 'absolute',
    right: '10px',
    fontSize: '0.74rem',
    fontWeight: '700',
    color: 'var(--color-text-muted)',
    pointerEvents: 'none',
  },
  lineCost: {
    fontSize: '0.8rem',
    fontWeight: '700',
    textAlign: 'right',
    color: 'var(--color-text-muted)',
    fontVariantNumeric: 'tabular-nums',
  },
  removeBtn: {
    minHeight: '40px',
    width: '40px',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-danger)',
  },
  costSummary: {
    display: 'flex',
    gap: '28px',
    marginTop: '14px',
    paddingTop: '12px',
    borderTop: '1px dashed var(--color-border)',
  },
  costLabel: {
    display: 'block',
    fontSize: '0.72rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: 'var(--color-text-muted)',
  },
  costValue: {
    fontSize: '1.15rem',
    fontWeight: '800',
    fontVariantNumeric: 'tabular-nums',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '4px',
  },
}
