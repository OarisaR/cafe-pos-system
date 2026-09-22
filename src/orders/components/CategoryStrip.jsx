// =========================================================================
// POS এর category বাছাই — Menu Directory এর মতো কার্ড ডিজাইনে
// (আগে একটা সাধারণ dropdown ছিল)
//
// কার্ডের মাপ স্থির; বেশি category হলে ডানে-বাঁয়ে স্লাইড করা যায়।
// =========================================================================
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { pickCategoryIcon } from '../../menu/categoryIcon'

export const CategoryStrip = ({ categories, menuItems, activeCategory, onChange }) => {
  const rowRef = useRef(null)
  const [edges, setEdges] = useState({ left: false, right: false })

  const measure = useCallback(() => {
    const el = rowRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft < max - 4 })
  }, [])

  useEffect(() => {
    const el = rowRef.current
    if (!el) return
    measure()
    el.addEventListener('scroll', measure, { passive: true })
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => {
      el.removeEventListener('scroll', measure)
      observer.disconnect()
    }
  }, [measure])

  const scrollBy = (dir) =>
    rowRef.current?.scrollBy({
      left: dir * Math.max(rowRef.current.clientWidth * 0.8, 200),
      behavior: 'smooth',
    })

  const countFor = (categoryId) =>
    categoryId === 'all'
      ? menuItems.length
      : menuItems.filter((item) => item.category_id === categoryId).length

  return (
    <div style={styles.wrap}>
      {edges.left && (
        <button type="button" onClick={() => scrollBy(-1)} style={{ ...styles.arrow, left: '-6px' }}
          aria-label="Scroll categories left">
          <ChevronLeft size={18} />
        </button>
      )}

      <div ref={rowRef} className="category-scroll" style={styles.row} role="tablist" aria-label="Menu categories">
        <CategoryCard
          label="All Items"
          count={countFor('all')}
          active={activeCategory === 'all'}
          onClick={() => onChange('all')}
        />

        {categories.map((category) => (
          <CategoryCard
            key={category.category_id}
            label={category.name}
            count={countFor(category.category_id)}
            active={activeCategory === category.category_id}
            onClick={() => onChange(category.category_id)}
          />
        ))}
      </div>

      {edges.right && (
        <button type="button" onClick={() => scrollBy(1)} style={{ ...styles.arrow, right: '-6px' }}
          aria-label="Scroll categories right">
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  )
}

const CategoryCard = ({ label, count, active, onClick }) => {
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
        boxShadow: active ? '0 5px 14px rgba(98, 111, 72, 0.32)' : 'var(--shadow-sm)',
      }}
    >
      <span style={{ ...styles.name, color: active ? '#FFFFFF' : 'var(--color-text-main)' }}>{label}</span>
      <span style={{ ...styles.count, color: active ? 'rgba(255,255,255,0.8)' : 'var(--color-text-muted)' }}>
        {count} item{count === 1 ? '' : 's'}
      </span>

      <Icon
        size={38}
        strokeWidth={1.4}
        aria-hidden="true"
        style={{ ...styles.icon, color: active ? 'rgba(255,255,255,0.32)' : 'var(--color-border)' }}
      />
    </button>
  )
}

const styles = {
  wrap: { position: 'relative' },
  row: { display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '8px' },
  arrow: {
    position: 'absolute', top: '24px', zIndex: 2, minHeight: '34px', width: '34px',
    borderRadius: '50%', backgroundColor: 'var(--color-white)',
    border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)',
    color: 'var(--color-text-main)',
  },
  card: {
    position: 'relative', overflow: 'hidden', flex: '0 0 152px', minWidth: '152px',
    minHeight: '84px', padding: '12px 14px', borderRadius: 'var(--radius-md)',
    border: '1.5px solid', display: 'flex', flexDirection: 'column',
    alignItems: 'flex-start', justifyContent: 'center', gap: '2px', textAlign: 'left',
    transition: 'all var(--transition-fast)',
  },
  name: {
    fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: '800', lineHeight: 1.2,
  },
  count: { fontSize: '0.74rem', fontWeight: '600' },
  icon: { position: 'absolute', right: '-4px', bottom: '-6px', pointerEvents: 'none' },
}
