// =========================================================================
// MODULE OWNER: Person 3 — Menu categories: add / rename / delete
// =========================================================================
import React, { useEffect, useState } from 'react'
import { X, Plus, Pencil, Trash2, Check, AlertCircle } from 'lucide-react'
import { createCategory, updateCategory, deleteCategory } from '../menuService'

export const CategoryManagerModal = ({ categories, itemCountByCategory, onClose, onChanged }) => {
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !busy && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, busy])

  const run = async (action) => {
    setBusy(true)
    setError(null)
    try {
      await action()
      await onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleAdd = (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    run(async () => {
      await createCategory({ name: newName })
      setNewName('')
    })
  }

  const handleRename = (category) => {
    if (!editingName.trim() || editingName.trim() === category.name) {
      setEditingId(null)
      return
    }
    run(async () => {
      await updateCategory(category.category_id, { name: editingName, description: category.description })
      setEditingId(null)
    })
  }

  const handleDelete = (category) => {
    const count = itemCountByCategory[category.category_id] || 0
    if (count > 0) {
      setError(`"${category.name}" still has ${count} item${count > 1 ? 's' : ''}. Move or delete them first.`)
      return
    }
    if (!window.confirm(`Delete the category "${category.name}"?`)) return
    run(() => deleteCategory(category.category_id))
  }

  return (
    <div className="modal-overlay" onClick={() => !busy && onClose()}>
      <div
        className="modal-card"
        style={styles.card}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-modal-title"
      >
        <div style={styles.header}>
          <div>
            <h3 id="category-modal-title" style={styles.title}>Menu Categories</h3>
            <p style={styles.subtitle}>Categories group items on the menu and the POS</p>
          </div>
          <button type="button" onClick={onClose} style={styles.iconBtn} aria-label="Close" disabled={busy}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={styles.errorBanner} role="alert">
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleAdd} style={styles.addRow}>
          <input
            className="input-field"
            style={{ flex: 1, minWidth: 0 }}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New category name"
            aria-label="New category name"
            autoFocus
          />
          <button type="submit" className="btn-primary" style={styles.addBtn} disabled={busy || !newName.trim()}>
            <Plus size={16} />
            <span>Add</span>
          </button>
        </form>

        <ul style={styles.list}>
          {categories.length === 0 && <li style={styles.empty}>No categories yet.</li>}
          {categories.map((c) => {
            const count = itemCountByCategory[c.category_id] || 0
            const isEditing = editingId === c.category_id

            return (
              <li key={c.category_id} style={styles.item}>
                {isEditing ? (
                  <input
                    className="input-field"
                    style={styles.renameInput}
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename(c)
                      if (e.key === 'Escape') {
                        e.stopPropagation()
                        setEditingId(null)
                      }
                    }}
                    aria-label={`Rename ${c.name}`}
                    autoFocus
                  />
                ) : (
                  <div style={styles.itemText}>
                    <span style={styles.itemName}>{c.name}</span>
                    <span style={styles.itemCount}>
                      {count} item{count === 1 ? '' : 's'}
                    </span>
                  </div>
                )}

                <div style={styles.itemActions}>
                  {isEditing ? (
                    <button
                      type="button"
                      onClick={() => handleRename(c)}
                      style={styles.smallBtn}
                      aria-label="Save name"
                      disabled={busy}
                    >
                      <Check size={16} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(c.category_id)
                        setEditingName(c.name)
                        setError(null)
                      }}
                      style={styles.smallBtn}
                      aria-label={`Rename ${c.name}`}
                      disabled={busy}
                    >
                      <Pencil size={15} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(c)}
                    style={{ ...styles.smallBtn, color: 'var(--color-danger)' }}
                    aria-label={`Delete ${c.name}`}
                    disabled={busy}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

const styles = {
  card: {
    maxWidth: '480px',
    padding: '24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '16px',
  },
  title: {
    fontSize: '1.3rem',
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
    marginBottom: '12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-danger)',
    backgroundColor: 'var(--color-danger-bg)',
    color: 'var(--color-danger)',
    fontSize: '0.84rem',
    fontWeight: '600',
  },
  addRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '14px',
  },
  addBtn: {
    padding: '10px 16px',
    borderRadius: 'var(--radius-sm)',
  },
  list: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  empty: {
    fontSize: '0.86rem',
    color: 'var(--color-text-muted)',
    padding: '8px 0',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    padding: '6px 6px 6px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
  },
  itemText: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  itemName: {
    fontSize: '0.92rem',
    fontWeight: '700',
  },
  itemCount: {
    fontSize: '0.74rem',
    color: 'var(--color-text-muted)',
  },
  renameInput: {
    flex: 1,
    minWidth: 0,
    padding: '8px 10px',
  },
  itemActions: {
    display: 'flex',
    gap: '4px',
    flexShrink: 0,
  },
  smallBtn: {
    minHeight: '40px',
    width: '40px',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text-muted)',
  },
}
