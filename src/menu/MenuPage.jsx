// =========================================================================
// MODULE OWNER: Person 3 — Menu Management
// Route: /dashboard/menu
//
// User Flow (Admin → Manage Menu): add / edit / remove items, categories,
// set prices — সাথে প্রতিটা আইটেমের recipe (BOM) আর খরচ/লাভ।
//
// কে কী পারবে (rbac.js + Supabase RLS):
//   owner, manager  → সব কিছু দেখা ও বদলানো, খরচ ও margin দেখা
//   cashier, staff  → শুধু মেনু দেখা (খরচের তথ্য দেখায় না)
//
// ডেটা: src/menu/menuService.js
// =========================================================================
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  RefreshCw,
  AlertTriangle,
  Database,
  CheckCircle2,
  AlertCircle,
  Eye,
} from 'lucide-react'
import { useAuth } from '../authentication/context/AuthContext'
import { MODULES } from '../authentication/constants/rbac'
import {
  MenuSchemaMissingError,
  fetchCategories,
  fetchMenuItems,
  fetchIngredients,
  fetchAllRecipes,
  groupRecipesByItem,
  calculateUnitCost,
  findShortIngredients,
  setMenuItemStatus,
  deleteMenuItem,
} from './menuService'
import { MenuItemModal } from './components/MenuItemModal'
import { CategoryManagerModal } from './components/CategoryManagerModal'
import { MenuItemCard } from './components/MenuItemCard'
import { CategoryDirectory } from './components/CategoryDirectory'

export const MenuPage = () => {
  const { canEdit } = useAuth()
  const editable = canEdit(MODULES.MENU)

  const [loading, setLoading] = useState(true)
  const [schemaMissing, setSchemaMissing] = useState(false)
  const [loadError, setLoadError] = useState(null)

  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  const [ingredients, setIngredients] = useState([])
  const [recipes, setRecipes] = useState({})
  const [recipeLoaded, setRecipeLoaded] = useState(false)

  // খরচ ও stock এর তথ্য দেখানো হবে কিনা (owner/manager, আর recipe লোড হলে)
  const showCost = editable && recipeLoaded

  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const [itemModal, setItemModal] = useState(null) // null | { item: null | item }
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [busyItemId, setBusyItemId] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (type, text) => {
    setToast({ type, text })
    setTimeout(() => setToast(null), 4000)
  }

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      const [cats, menu] = await Promise.all([fetchCategories(), fetchMenuItems()])
      setCategories(cats)
      setItems(menu)
      setSchemaMissing(false)

      // খরচ ও recipe শুধু editor দের জন্য লোড হয়; ব্যর্থ হলেও মেনু দেখা যাবে
      if (editable) {
        const [ingResult, recipeResult] = await Promise.allSettled([fetchIngredients(), fetchAllRecipes()])
        const ok = ingResult.status === 'fulfilled' && recipeResult.status === 'fulfilled'
        setIngredients(ok ? ingResult.value : [])
        setRecipes(ok ? groupRecipesByItem(recipeResult.value) : {})
        setRecipeLoaded(ok)
      }
    } catch (err) {
      if (err instanceof MenuSchemaMissingError) setSchemaMissing(true)
      else setLoadError(err.message)
    } finally {
      setLoading(false)
    }
  }, [editable])

  useEffect(() => {
    load()
  }, [load])

  // ---------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------
  const categoryById = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.category_id, c])),
    [categories]
  )

  const itemCountByCategory = useMemo(
    () => items.reduce((acc, i) => ({ ...acc, [i.category_id]: (acc[i.category_id] || 0) + 1 }), {}),
    [items]
  )

  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((i) => {
      if (activeCategory !== 'all' && i.category_id !== activeCategory) return false
      if (statusFilter !== 'all' && i.status !== statusFilter) return false
      if (!q) return true
      return (
        i.name.toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q) ||
        (categoryById[i.category_id]?.name || '').toLowerCase().includes(q)
      )
    })
  }, [items, search, activeCategory, statusFilter, categoryById])

  /**
   * প্রতিটা category এর কার্ডে কোন pill দেখাবে।
   * recipe + ingredient stock জানা থাকলে stock অনুযায়ী, নাহলে আইটেম
   * available কিনা সেটা অনুযায়ী।
   */
  const categoryStatus = useMemo(() => {
    const statusFor = (list) => {
      if (list.length === 0) return 'empty'

      if (showCost) {
        let low = false
        for (const item of list) {
          for (const line of recipes[item.menu_item_id] || []) {
            const stock = Number(line.ingredient.stock_level)
            if (stock < line.quantity) return 'out' // এক সার্ভিং বানানোর মতোও নেই
            if (stock <= Number(line.ingredient.restock_threshold ?? 0)) low = true
          }
        }
        if (low) return 'low'
        return list.every((i) => i.status === 'available') ? 'ok' : 'partial'
      }

      return list.every((i) => i.status === 'available') ? 'ok' : 'partial'
    }

    const map = { all: statusFor(items) }
    for (const c of categories) {
      map[c.category_id] = statusFor(items.filter((i) => i.category_id === c.category_id))
    }
    return map
  }, [items, categories, recipes, showCost])

  const stats = useMemo(() => {
    const available = items.filter((i) => i.status === 'available').length
    const margins = items
      .filter((i) => Number(i.price) > 0 && recipes[i.menu_item_id]?.length)
      .map((i) => ((Number(i.price) - calculateUnitCost(recipes[i.menu_item_id])) / Number(i.price)) * 100)
    const avgMargin = margins.length ? margins.reduce((a, b) => a + b, 0) / margins.length : null
    return { total: items.length, available, unavailable: items.length - available, avgMargin }
  }, [items, recipes])

  // ---------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------
  const handleToggleStatus = async (item) => {
    const next = item.status === 'available' ? 'unavailable' : 'available'
    setBusyItemId(item.menu_item_id)
    try {
      await setMenuItemStatus(item.menu_item_id, next)
      setItems((prev) => prev.map((i) => (i.menu_item_id === item.menu_item_id ? { ...i, status: next } : i)))
      showToast('success', `"${item.name}" is now ${next}.`)
    } catch (err) {
      showToast('error', err.message)
    } finally {
      setBusyItemId(null)
    }
  }

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.name}" from the menu? This cannot be undone.`)) return
    setBusyItemId(item.menu_item_id)
    try {
      await deleteMenuItem(item.menu_item_id)
      setItems((prev) => prev.filter((i) => i.menu_item_id !== item.menu_item_id))
      showToast('success', `"${item.name}" was deleted.`)
    } catch (err) {
      showToast('error', err.message)
    } finally {
      setBusyItemId(null)
    }
  }

  const handleItemSaved = async (saved, warning) => {
    setItemModal(null)
    await load()
    if (warning) showToast('error', warning)
    else showToast('success', `"${saved.name}" was saved.`)
  }

  // ---------------------------------------------------------------------
  // Render states
  // ---------------------------------------------------------------------
  if (loading) {
    return (
      <div style={styles.centerState}>
        <RefreshCw size={26} color="var(--color-primary)" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={styles.stateText}>Loading menu…</p>
      </div>
    )
  }

  if (schemaMissing) {
    return (
      <div style={styles.setupCard}>
        <div style={styles.setupIcon}>
          <Database size={28} color="var(--color-warning)" />
        </div>
        <h2 style={styles.setupTitle}>Menu tables are not set up yet</h2>
        <p style={styles.setupText}>
          The Supabase database does not have the menu tables. The Owner needs to run the POS
          schema script once.
        </p>
        <ol style={styles.setupSteps}>
          <li>Open Supabase Dashboard → SQL Editor → New query</li>
          <li>
            Paste the whole file <code style={styles.code}>supabase/supabase_pos_schema.sql</code>
          </li>
          <li>Click Run, then come back and press Retry</li>
        </ol>
        <button className="btn-primary" onClick={() => { setLoading(true); load() }}>
          <RefreshCw size={16} />
          <span>Retry</span>
        </button>
      </div>
    )
  }

  if (loadError) {
    return (
      <div style={styles.setupCard}>
        <div style={{ ...styles.setupIcon, backgroundColor: 'var(--color-danger-bg)' }}>
          <AlertCircle size={28} color="var(--color-danger)" />
        </div>
        <h2 style={styles.setupTitle}>Could not load the menu</h2>
        <p style={styles.setupText}>{loadError}</p>
        <button className="btn-primary" onClick={() => { setLoading(true); load() }}>
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
        <div style={styles.readOnlyBanner}>
          <Eye size={16} />
          <span>View only — your role can see the menu but cannot change it.</span>
        </div>
      )}

      {editable && !recipeLoaded && (
        <div style={{ ...styles.readOnlyBanner, ...styles.warnBanner }}>
          <AlertTriangle size={16} />
          <span>Ingredients could not be loaded, so costs and recipes are hidden.</span>
        </div>
      )}

      {/* Stats */}
      <div style={styles.statsRow}>
        <Stat label="Menu items" value={stats.total} />
        <Stat label="Available" value={stats.available} tone="success" />
        <Stat label="Unavailable" value={stats.unavailable} tone={stats.unavailable ? 'warning' : undefined} />
        {showCost && (
          <Stat
            label="Average margin"
            value={stats.avgMargin == null ? '—' : `${stats.avgMargin.toFixed(1)}%`}
          />
        )}
      </div>

      {/* Menu Directory — category বাছাই, search ও action একসাথে */}
      <CategoryDirectory
        categories={categories}
        totalItems={items.length}
        itemCountByCategory={itemCountByCategory}
        categoryStatus={categoryStatus}
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        editable={editable}
        onRefresh={load}
        onAddItem={() => setItemModal({ item: null })}
        onManageCategories={() => setCategoryModalOpen(true)}
      />

      {/* Items */}
      {visibleItems.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyTitle}>
            {items.length === 0 ? 'The menu is empty' : 'No items match your filters'}
          </p>
          <p style={styles.stateText}>
            {items.length === 0
              ? editable
                ? categories.length === 0
                  ? 'Start by creating a category, then add your first item.'
                  : 'Add your first item with the "Add Item" button.'
                : 'Menu items will appear here once the Owner adds them.'
              : 'Try a different search or category.'}
          </p>
        </div>
      ) : (
        <div style={styles.cardGrid}>
          {visibleItems.map((item) => {
            const recipe = recipes[item.menu_item_id] || []
            const cost = calculateUnitCost(recipe)
            const price = Number(item.price)

            return (
              <MenuItemCard
                key={item.menu_item_id}
                item={item}
                categoryName={categoryById[item.category_id]?.name || ''}
                editable={editable}
                showCost={showCost}
                cost={cost}
                margin={price > 0 ? ((price - cost) / price) * 100 : null}
                hasRecipe={recipe.length > 0}
                shortIngredients={showCost ? findShortIngredients(recipe) : []}
                busy={busyItemId === item.menu_item_id}
                onEdit={() => setItemModal({ item })}
                onDelete={() => handleDelete(item)}
                onToggleStatus={() => handleToggleStatus(item)}
              />
            )
          })}
        </div>
      )}

      {itemModal && (
        <MenuItemModal
          item={itemModal.item}
          categories={categories}
          ingredients={ingredients}
          recipe={itemModal.item ? recipes[itemModal.item.menu_item_id] : []}
          recipeLoaded={recipeLoaded}
          onClose={() => setItemModal(null)}
          onSaved={handleItemSaved}
        />
      )}

      {categoryModalOpen && (
        <CategoryManagerModal
          categories={categories}
          itemCountByCategory={itemCountByCategory}
          onClose={() => setCategoryModalOpen(false)}
          onChanged={load}
        />
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
          tone === 'success'
            ? 'var(--color-success)'
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
  page: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  centerState: {
    padding: '80px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
  },
  stateText: {
    fontSize: '0.88rem',
    color: 'var(--color-text-muted)',
  },
  setupCard: {
    maxWidth: '560px',
    margin: '40px auto',
    padding: '32px 28px',
    textAlign: 'center',
    backgroundColor: 'var(--color-surface)',
    border: '1.5px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  setupIcon: {
    width: '60px',
    height: '60px',
    borderRadius: '16px',
    backgroundColor: 'var(--color-warning-bg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  setupTitle: {
    fontSize: '1.35rem',
    fontWeight: '800',
  },
  setupText: {
    fontSize: '0.9rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.6,
  },
  setupSteps: {
    textAlign: 'left',
    fontSize: '0.86rem',
    lineHeight: 1.8,
    paddingLeft: '20px',
    marginBottom: '6px',
  },
  code: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: '0.8rem',
    padding: '1px 6px',
    borderRadius: '4px',
    backgroundColor: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
  },
  toast: {
    position: 'fixed',
    top: '84px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1100,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    maxWidth: 'min(92vw, 560px)',
    padding: '10px 18px',
    borderRadius: 'var(--radius-full)',
    border: '1.5px solid',
    boxShadow: 'var(--shadow-lg)',
    fontSize: '0.86rem',
    fontWeight: '600',
  },
  readOnlyBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--color-info-bg)',
    color: 'var(--color-info)',
    fontSize: '0.86rem',
    fontWeight: '600',
  },
  warnBanner: {
    backgroundColor: 'var(--color-warning-bg)',
    color: 'var(--color-warning)',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
  },
  statCard: {
    padding: '14px 16px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-surface)',
    border: '1.5px solid var(--color-border)',
  },
  statValue: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.6rem',
    fontWeight: '800',
    lineHeight: 1.1,
    fontVariantNumeric: 'tabular-nums',
  },
  statLabel: {
    fontSize: '0.74rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: 'var(--color-text-muted)',
    marginTop: '4px',
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(238px, 1fr))',
    columnGap: '18px',
    rowGap: '26px',
    paddingTop: '4px',
  },
  emptyState: {
    padding: '48px 20px',
    textAlign: 'center',
    borderRadius: 'var(--radius-md)',
    border: '1.5px dashed var(--color-border)',
  },
  emptyTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    marginBottom: '4px',
  },
}
