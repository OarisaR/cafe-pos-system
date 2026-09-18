// =========================================================================
// MODULE OWNER: Person 3 — Menu Directory (category বাছাই করার প্যানেল)
//
// প্রতিটা category একটা কার্ড: উপরে stock এর অবস্থা, নিচে নাম ও কতটা আইটেম,
// আর কোণায় হালকা icon। বেছে নেওয়া কার্ড গাঢ় সবুজ।
//
// stock এর অবস্থা recipe + ingredient stock থেকে আসে:
//   Need to re-stock → কোনো ingredient শেষ
//   Running low      → কোনো ingredient restock সীমার নিচে
//   Available        → সব ঠিক আছে
// recipe এর তথ্য না থাকলে (cashier / staff) আইটেম available কিনা সেটা দেখায়।
// =========================================================================
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Search, Plus, RefreshCw, FolderCog, ChevronLeft, ChevronRight } from 'lucide-react'
import { pickCategoryIcon } from '../categoryIcon'

/**
 * Category কার্ডগুলো পর্দায় না আঁটলে ডানে-বাঁয়ে সরানোর তীর দেখায়।
 * সব কার্ড আঁটলে তীর লুকিয়ে থাকে।
 */
const useHorizontalScroll = () => {
  const ref = useRef(null)
  const [edges, setEdges] = useState({ left: false, right: false })

  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft < max - 4 })
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    measure()
    el.addEventListener('scroll', measure, { passive: true })
    // কার্ড যোগ/বাদ হলে বা window এর মাপ বদলালে আবার হিসাব
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => {
      el.removeEventListener('scroll', measure)
      observer.disconnect()
    }
  }, [measure])

  const scrollBy = (direction) =>
    ref.current?.scrollBy({ left: direction * Math.max(ref.current.clientWidth * 0.8, 200), behavior: 'smooth' })

  return { ref, edges, scrollBy, measure }
}

const STATUS_PILL = {
  out:         { label: 'Need to re-stock', color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)' },
  low:         { label: 'Running low',      color: 'var(--color-warning)', bg: 'var(--color-warning-bg)' },
  ok:          { label: 'Available',        color: 'var(--color-text-main)', bg: 'var(--color-white)' },
  partial:     { label: 'Some off menu',    color: 'var(--color-warning)', bg: 'var(--color-warning-bg)' },
  empty:       { label: 'No items',         color: 'var(--color-text-muted)', bg: 'var(--color-bg)' },
}

export const CategoryDirectory = ({
  categories,
  totalItems,
  itemCountByCategory,
  categoryStatus,
  activeCategory,
  onSelectCategory,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  editable,
  onRefresh,
  onAddItem,
  onManageCategories,
}) => {
  const { ref: rowRef, edges, scrollBy } = useHorizontalScroll()

  return (
  <section style={styles.panel} aria-label="Menu directory">
    {/* Header */}
    <div style={styles.header}>
      <div style={styles.headerText}>
        <h2 style={styles.title}>Menu Directory</h2>
        <p style={styles.subtitle}>
          {editable
            ? 'Pick a category, then tap an item to edit its price, photo and recipe'
            : 'Pick a category to browse the menu'}
        </p>
      </div>

      <div style={styles.headerActions}>
        <div style={styles.searchWrap}>
          <Search size={16} color="var(--color-text-muted)" style={styles.searchIcon} />
          <input
            className="input-field"
            style={styles.searchInput}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search menu items..."
            aria-label="Search menu items"
          />
        </div>

        <select
          className="input-field"
          style={styles.statusSelect}
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          aria-label="Filter by availability"
        >
          <option value="all">All statuses</option>
          <option value="available">Available</option>
          <option value="unavailable">Unavailable</option>
        </select>

        <button className="btn-secondary" style={styles.iconBtn} onClick={onRefresh} aria-label="Refresh menu" title="Refresh">
          <RefreshCw size={16} />
        </button>

        {editable && (
          <>
            <button
              className="btn-secondary"
              style={styles.iconBtn}
              onClick={onManageCategories}
              aria-label="Rename or delete categories"
              title="Rename or delete categories"
            >
              <FolderCog size={16} />
            </button>
            <button
              className="btn-primary"
              style={styles.addBtn}
              onClick={onAddItem}
              disabled={categories.length === 0}
              title={categories.length === 0 ? 'Create a category first' : undefined}
            >
              <Plus size={16} />
              <span>Add Item</span>
            </button>
          </>
        )}
      </div>
    </div>

    {/* Category cards — না আঁটলে ডানে-বাঁয়ে সরানোর তীর দেখায় */}
    <div style={styles.rowWrap}>
      {edges.left && (
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          style={{ ...styles.arrow, left: '-6px' }}
          aria-label="Scroll categories left"
        >
          <ChevronLeft size={18} />
        </button>
      )}

      <div ref={rowRef} className="category-scroll" style={styles.cardRow} role="tablist" aria-label="Menu categories">
        <CategoryCard
          label="All Items"
          count={totalItems}
          status={categoryStatus.all}
          active={activeCategory === 'all'}
          onClick={() => onSelectCategory('all')}
        />

        {categories.map((c) => (
          <CategoryCard
            key={c.category_id}
            label={c.name}
            count={itemCountByCategory[c.category_id] || 0}
            status={categoryStatus[c.category_id]}
            active={activeCategory === c.category_id}
            onClick={() => onSelectCategory(c.category_id)}
          />
        ))}

        {editable ? (
          <button type="button" onClick={onManageCategories} style={styles.newCard}>
            <Plus size={20} />
            <span>New category</span>
          </button>
        ) : (
          // cashier / staff এর জন্য "New category" কার্ড নেই — বাকি জায়গা
          // এই ফাঁকা অংশটা নিয়ে নেয়, যাতে কার্ডগুলো টেনে বড় না হয়
          <span style={styles.filler} aria-hidden="true" />
        )}
      </div>

      {edges.right && (
        <button
          type="button"
          onClick={() => scrollBy(1)}
          style={{ ...styles.arrow, right: '-6px' }}
          aria-label="Scroll categories right"
        >
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  </section>
  )
}

const CategoryCard = ({ label, count, status, active, onClick }) => {
  const pill = STATUS_PILL[status] || STATUS_PILL.ok
  const Icon = pickCategoryIcon(label)

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      style={{
        ...styles.card,
        backgroundColor: active ? 'var(--color-primary-active)' : 'var(--color-white)',
        borderColor: active ? 'var(--color-primary-active)' : 'var(--color-border-light)',
        boxShadow: active ? '0 6px 18px rgba(98, 111, 72, 0.35)' : 'var(--shadow-sm)',
      }}
    >
      <span
        style={{
          ...styles.pill,
          backgroundColor: active ? 'rgba(255, 255, 255, 0.16)' : pill.bg,
          color: active ? '#FFFFFF' : pill.color,
          borderColor: active ? 'rgba(255, 255, 255, 0.35)' : 'var(--color-border-light)',
        }}
      >
        {pill.label}
      </span>

      <span style={{ ...styles.cardName, color: active ? '#FFFFFF' : 'var(--color-text-main)' }}>{label}</span>
      <span style={{ ...styles.cardCount, color: active ? 'rgba(255,255,255,0.8)' : 'var(--color-text-muted)' }}>
        {count} item{count === 1 ? '' : 's'}
      </span>

      <Icon
        size={46}
        strokeWidth={1.4}
        aria-hidden="true"
        style={{
          ...styles.cardIcon,
          color: active ? 'rgba(255, 255, 255, 0.35)' : 'var(--color-border)',
        }}
      />
    </button>
  )
}

const styles = {
  panel: {
    backgroundColor: 'var(--color-surface)',
    border: '1.5px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '20px 22px',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '14px',
    marginBottom: '18px',
  },
  headerText: {
    minWidth: '200px',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.3rem',
    fontWeight: '800',
    color: 'var(--color-text-main)',
  },
  subtitle: {
    fontSize: '0.84rem',
    color: 'var(--color-text-muted)',
    marginTop: '3px',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px',
  },
  searchWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    flex: '1 1 220px',
    minWidth: '180px',
  },
  searchIcon: {
    position: 'absolute',
    left: '14px',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    paddingLeft: '40px',
    backgroundColor: 'var(--color-white)',
  },
  statusSelect: {
    backgroundColor: 'var(--color-white)',
    flex: '0 0 auto',
  },
  iconBtn: {
    minHeight: '48px',
    width: '48px',
    padding: 0,
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-white)',
  },
  addBtn: {
    padding: '12px 18px',
    borderRadius: 'var(--radius-md)',
    whiteSpace: 'nowrap',
  },
  rowWrap: {
    position: 'relative',
  },
  cardRow: {
    display: 'flex',
    gap: '12px',
    overflowX: 'auto',
    scrollSnapType: 'x proximity',
    paddingBottom: '8px',
  },
  arrow: {
    position: 'absolute',
    top: '46px',
    zIndex: 2,
    minHeight: '36px',
    width: '36px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-white)',
    border: '1px solid var(--color-border)',
    boxShadow: 'var(--shadow-md)',
    color: 'var(--color-text-main)',
  },
  card: {
    position: 'relative',
    overflow: 'hidden',
    // মাপ স্থির: নতুন category যোগ হলেও আগের কার্ডগুলোর আকার বদলায় না।
    // নতুনগুলো ডানে সারিতে যোগ হয়, আর সারিটা স্লাইড করে দেখা যায়।
    flex: '0 0 186px',
    minWidth: '186px',
    minHeight: '124px',
    scrollSnapAlign: 'start',
    padding: '12px 14px 14px',
    borderRadius: 'var(--radius-md)',
    border: '1.5px solid',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    gap: '2px',
    textAlign: 'left',
    transition: 'all var(--transition-fast)',
  },
  pill: {
    padding: '2px 10px',
    marginBottom: '10px',
    borderRadius: 'var(--radius-full)',
    border: '1px solid',
    fontSize: '0.7rem',
    fontWeight: '700',
    whiteSpace: 'nowrap',
  },
  cardName: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.02rem',
    fontWeight: '800',
    lineHeight: 1.2,
    marginTop: 'auto',
  },
  cardCount: {
    fontSize: '0.76rem',
    fontWeight: '600',
  },
  cardIcon: {
    position: 'absolute',
    right: '-6px',
    bottom: '-6px',
    pointerEvents: 'none',
  },
  filler: {
    flex: '1 0 0',
  },
  newCard: {
    // সারির শেষে থাকে; জায়গা বাকি থাকলে সেটুকু নিজে ভরে নেয়,
    // তাই ডান দিকে ফাঁকা দেখায় না
    flex: '1 0 150px',
    minWidth: '150px',
    minHeight: '124px',
    borderRadius: 'var(--radius-md)',
    border: '1.5px dashed var(--color-border)',
    backgroundColor: 'transparent',
    color: 'var(--color-text-muted)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    fontSize: '0.82rem',
    fontWeight: '700',
  },
}
