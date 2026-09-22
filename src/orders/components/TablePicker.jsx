// =========================================================================
// Dine-in টেবিল বাছাই — সব টেবিল, সাথে অবস্থা
//
// আগে একটা ছোট dropdown ছিল যেখানে শুধু occupied টেবিল দেখাত।
// এখন cashier সব টেবিল একসাথে দেখে, অবস্থা বুঝে বেছে নিতে পারেন।
//
//   Available (সবুজ)      → বেছে নিলেই টেবিল OCCUPIED হয়ে যায়
//   Needs cleaning (হলুদ) → বেছে নেওয়া যায়, শুধু একবার জিজ্ঞেস করবে
//   Occupied (নীল)        → কাস্টমার বসে আছেন; দ্বিতীয় দফা অর্ডারের জন্য বেছে নেওয়া যায়
// =========================================================================
import React from 'react'
import { Users, Check } from 'lucide-react'
import { TABLE_STATUS } from '../../tables/tableService'

const STATUS_META = {
  [TABLE_STATUS.EMPTY]: {
    label: 'Available',
    color: 'var(--color-success)',
    bg: 'var(--color-success-bg)',
  },
  [TABLE_STATUS.OCCUPIED]: {
    label: 'Occupied',
    color: 'var(--color-info)',
    bg: 'var(--color-info-bg)',
  },
  [TABLE_STATUS.NEEDS_CLEANING]: {
    label: 'Needs cleaning',
    color: 'var(--color-warning)',
    bg: 'var(--color-warning-bg)',
  },
}

export const TablePicker = ({ tables, selectedTableId, onPick, busyTableId }) => {
  const free = tables.filter((t) => t.status === TABLE_STATUS.EMPTY).length

  return (
    <section style={styles.panel} aria-label="Select a table">
      <div style={styles.head}>
        <div>
          <h3 style={styles.title}>Which table?</h3>
          <p style={styles.subtitle}>
            Tap a table to seat the guest — it becomes occupied straight away.
          </p>
        </div>
        <span style={styles.freeTag}>{free} available</span>
      </div>

      <div style={styles.grid}>
        {tables.map((table) => {
          const meta = STATUS_META[table.status] || STATUS_META[TABLE_STATUS.NEEDS_CLEANING]
          const isSelected = table.table_id === selectedTableId
          const isBusy = table.table_id === busyTableId

          return (
            <button
              key={table.table_id}
              type="button"
              onClick={() => onPick(table)}
              disabled={isBusy}
              aria-pressed={isSelected}
              style={{
                ...styles.card,
                borderColor: isSelected ? 'var(--color-primary)' : meta.color,
                backgroundColor: isSelected ? 'var(--color-primary)' : meta.bg,
                color: isSelected ? '#FFFFFF' : meta.color,
                opacity: isBusy ? 0.6 : 1,
              }}
            >
              <span style={styles.numberRow}>
                <span style={styles.number}>{table.table_number}</span>
                {isSelected && <Check size={16} />}
              </span>

              <span style={styles.seats}>
                <Users size={12} /> {table.capacity} seats
              </span>

              <span
                style={{
                  ...styles.status,
                  color: isSelected ? 'rgba(255,255,255,0.9)' : meta.color,
                }}
              >
                {isBusy ? 'Seating…' : isSelected ? 'Selected' : meta.label}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

const styles = {
  panel: {
    backgroundColor: 'var(--color-surface)',
    border: '1.5px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '18px 20px',
  },
  head: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
    marginBottom: '14px',
  },
  title: { fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: '800' },
  subtitle: { fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '2px' },
  freeTag: {
    padding: '4px 12px',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--color-success-bg)',
    color: 'var(--color-success)',
    fontSize: '0.76rem',
    fontWeight: '800',
    whiteSpace: 'nowrap',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: '12px',
  },
  card: {
    minHeight: '104px',
    padding: '12px',
    borderRadius: 'var(--radius-md)',
    border: '2px solid',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: '4px',
    transition: 'all var(--transition-fast)',
  },
  numberRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  number: { fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: '800', lineHeight: 1 },
  seats: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.74rem',
    fontWeight: '600',
    opacity: 0.85,
  },
  status: { fontSize: '0.74rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.03em' },
}
