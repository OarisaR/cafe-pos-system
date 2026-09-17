// =========================================================================
// MODULE OWNER: Person 2 — Table Management
// Route: /dashboard/tables
//
// Cafe floor map: প্রতিটা টেবিলের অবস্থা (Empty / Occupied / Reserved /
// Needs Cleaning)। কার্ডে চাপলে অবস্থা বদলায়।
//
// Order আর Table একই ডেটা-ফ্লোতে, তাই দুটোই Person 2 এর দায়িত্বে।
// এখনো টেবিলের তালিকা mock — পরে Supabase এর cafe_tables টেবিল থেকে আসবে।
// =========================================================================
import React, { useState } from 'react'

const STATUS_COLORS = {
  empty:    { bg: '#E8F5E9', color: '#2E7D32' },
  occupied: { bg: '#FFF3E0', color: '#E65100' },
  reserved: { bg: '#E3F2FD', color: '#1565C0' },
  cleaning: { bg: '#FFFDE7', color: '#F57F17' },
}

export const TablesPage = () => {
  // Table Management State
  const [tablesList, setTablesList] = useState([
    { id: 1, name: 'Table 01', capacity: 2, status: 'empty', guest: null },
    { id: 2, name: 'Table 02', capacity: 4, status: 'occupied', guest: 'Guest #104' },
    { id: 3, name: 'Table 03', capacity: 4, status: 'occupied', guest: 'Active Order' },
    { id: 4, name: 'Table 04', capacity: 6, status: 'reserved', guest: 'Booking 7 PM' },
    { id: 5, name: 'Table 05', capacity: 2, status: 'cleaning', guest: null },
    { id: 6, name: 'Table 06', capacity: 4, status: 'empty', guest: null },
    { id: 7, name: 'Table 07', capacity: 2, status: 'empty', guest: null },
    { id: 8, name: 'Table 08', capacity: 8, status: 'occupied', guest: 'Family' },
  ])

  const toggleTableStatus = (tableId) => {
    setTablesList(prev => prev.map(t => {
      if (t.id === tableId) {
        const nextStatus = t.status === 'empty' ? 'occupied' : t.status === 'occupied' ? 'cleaning' : 'empty'
        return { ...t, status: nextStatus }
      }
      return t
    }))
  }

  return (
    <div style={styles.container}>
      {/* Floor Map View */}
      <div style={styles.floorCard}>
        <div style={styles.floorHeader}>
          <div>
            <h3 style={styles.cardTitle}>Cafe Floor Layout (8 Tables)</h3>
            <p style={styles.cardSubtitle}>Tap any table card to cycle its state (Empty &rarr; Occupied &rarr; Cleaning)</p>
          </div>
          <div style={styles.statusLegend}>
            <span style={{ ...styles.legendPill, backgroundColor: '#E8F5E9', color: '#2E7D32' }}>● Empty</span>
            <span style={{ ...styles.legendPill, backgroundColor: '#FFF3E0', color: '#E65100' }}>● Occupied</span>
            <span style={{ ...styles.legendPill, backgroundColor: '#E3F2FD', color: '#1565C0' }}>● Reserved</span>
            <span style={{ ...styles.legendPill, backgroundColor: '#FFFDE7', color: '#F57F17' }}>● Needs Cleaning</span>
          </div>
        </div>

        <div style={styles.tablesGrid}>
          {tablesList.map(t => {
            const { bg, color } = STATUS_COLORS[t.status] || STATUS_COLORS.cleaning

            return (
              <div
                key={t.id}
                onClick={() => toggleTableStatus(t.id)}
                style={{ ...styles.tableBox, backgroundColor: bg, borderColor: color }}
              >
                <div style={styles.tableBoxTop}>
                  <span style={{ ...styles.tableBoxName, color }}>{t.name}</span>
                  <span style={styles.tableBoxCap}>{t.capacity} Seats</span>
                </div>
                <div style={{ ...styles.tableBoxStatus, color }}>
                  {t.status.toUpperCase()}
                </div>
                <div style={styles.tableBoxGuest}>
                  {t.guest || 'Tap to seat guest'}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    maxWidth: '1280px',
    margin: '0 auto',
    padding: '0 24px 60px',
  },
  floorCard: {
    backgroundColor: 'var(--color-surface)',
    border: '1.5px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '28px',
    boxShadow: 'var(--shadow-sm)',
  },
  floorHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '14px',
  },
  cardTitle: {
    fontSize: '1.25rem',
    fontWeight: '800',
    color: 'var(--color-text-main)',
    marginBottom: '4px',
  },
  cardSubtitle: {
    fontSize: '0.86rem',
    color: 'var(--color-text-muted)',
  },
  statusLegend: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  legendPill: {
    fontSize: '0.74rem',
    fontWeight: '700',
    padding: '3px 8px',
    borderRadius: 'var(--radius-full)',
  },
  tablesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '18px',
  },
  tableBox: {
    border: '2px solid',
    borderRadius: '12px',
    padding: '18px',
    cursor: 'pointer',
    transition: 'transform 0.15s',
  },
  tableBoxTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  tableBoxName: {
    fontSize: '1.15rem',
    fontWeight: '800',
  },
  tableBoxCap: {
    fontSize: '0.74rem',
    fontWeight: '600',
    color: 'var(--color-text-muted)',
  },
  tableBoxStatus: {
    fontSize: '0.82rem',
    fontWeight: '800',
    letterSpacing: '0.04em',
    marginBottom: '4px',
  },
  tableBoxGuest: {
    fontSize: '0.76rem',
    color: 'var(--color-text-muted)',
  },
}
