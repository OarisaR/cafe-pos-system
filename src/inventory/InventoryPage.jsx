// =========================================================================
// MODULE OWNER: Person 3 — Ingredient Inventory
// Route: /dashboard/inventory
//
// Ingredient এর stock level ও restock সতর্কতা।
//
// Menu item গুলো recipe (BOM) দিয়ে ingredient এর সাথে যুক্ত, তাই
// Menu আর Inventory দুটোই Person 3 এর দায়িত্বে।
// এখনো তালিকা mock — পরে Supabase এর ingredients টেবিল থেকে আসবে।
// =========================================================================
import React from 'react'

const INGREDIENTS = [
  { name: 'Roasted Espresso Blend', level: '8.4 kg', status: 'High', color: 'var(--color-success)' },
  { name: 'Whole Dairy Milk (Aarong)', level: '2.5 L', status: 'Low - Restock Alert', color: 'var(--color-danger)' },
  { name: 'Oat Milk Barista Edition', level: '6.0 L', status: 'Moderate', color: '#B26A00' },
  { name: 'Madagascar Vanilla Syrup', level: '1.2 L', status: 'High', color: 'var(--color-success)' },
  { name: 'Belgian Dark Chocolate Sauce', level: '3.0 kg', status: 'High', color: 'var(--color-success)' },
]

export const InventoryPage = () => (
  <div style={styles.container}>
    {/* Ingredient Stock View */}
    <div style={styles.floorCard}>
      <div style={styles.floorHeader}>
        <div>
          <h3 style={styles.cardTitle}>Ingredient Pantry Inventory</h3>
          <p style={styles.cardSubtitle}>Real-time consumption tracked automatically per drink poured</p>
        </div>
      </div>

      <div style={styles.inventoryList}>
        {INGREDIENTS.map((ing, idx) => (
          <div key={idx} style={styles.inventoryRow}>
            <div>
              <div style={styles.ingName}>{ing.name}</div>
              <div style={styles.ingLevel}>Current Level: {ing.level}</div>
            </div>
            <span style={{ ...styles.statusTag, borderColor: ing.color, color: ing.color }}>
              {ing.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  </div>
)

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
  inventoryList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  inventoryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 18px',
    backgroundColor: 'var(--color-bg)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
  },
  ingName: {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: 'var(--color-text-main)',
  },
  ingLevel: {
    fontSize: '0.82rem',
    color: 'var(--color-text-muted)',
    marginTop: '2px',
  },
  statusTag: {
    fontSize: '0.78rem',
    fontWeight: '700',
    padding: '4px 10px',
    borderRadius: 'var(--radius-full)',
    border: '1.5px solid',
  },
}
