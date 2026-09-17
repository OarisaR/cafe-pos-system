// =========================================================================
// MODULE OWNER: Person 2 — Order Management
// Route: /dashboard/orders
//
// Counter POS: মেনু থেকে আইটেম বেছে cart এ যোগ, টেবিল/টাইপ নির্বাচন,
// আর অর্ডার দিলে thermal receipt দেখানো।
//
// এখনো সব ডেটা mock (POS_MENU_ITEMS ও cart শুধু এই পেজের state এ)।
// Person 2 পরে এখানে Supabase orders / order_items টেবিল যুক্ত করবে,
// আর মেনু আইটেম আসবে Person 3 এর menu_items টেবিল থেকে।
// =========================================================================
import React, { useState } from 'react'
import { ShoppingBag, Coffee, Plus, Minus, Printer } from 'lucide-react'
import { useAuth } from '../authentication/context/AuthContext'

// Mock interactive cafe items for the touch-first terminal
const POS_MENU_ITEMS = [
  { id: 'item_1', name: 'Espresso Double', category: 'coffee', price: 180, desc: 'Rich 100% Arabica double shot' },
  { id: 'item_2', name: 'Spanish Latte', category: 'coffee', price: 280, desc: 'Sweet condensed milk & espresso' },
  { id: 'item_3', name: 'Caramel Macchiato', category: 'coffee', price: 320, desc: 'Vanilla syrup, steamed milk & caramel drizzle' },
  { id: 'item_4', name: 'Matcha Green Latte', category: 'tea', price: 290, desc: 'Ceremonial Uji matcha with oat milk' },
  { id: 'item_5', name: 'Masala Spiced Chai', category: 'tea', price: 160, desc: 'Slow-brewed black tea with aromatic spices' },
  { id: 'item_6', name: 'Butter Croissant', category: 'bakery', price: 180, desc: 'Flaky French layered butter pastry' },
  { id: 'item_7', name: 'Fudge Brownie', category: 'bakery', price: 220, desc: 'Warm Belgian chocolate brownie' },
  { id: 'item_8', name: 'Nitro Cold Brew', category: 'cold', price: 310, desc: 'Infused with nitrogen for creamy foam' },
]

const CATEGORIES = [
  { id: 'all', label: 'All Items' },
  { id: 'coffee', label: 'Espresso & Coffee' },
  { id: 'tea', label: 'Tea & Chai' },
  { id: 'bakery', label: 'Artisan Bakery' },
  { id: 'cold', label: 'Cold Brews' },
]

export const OrdersPage = () => {
  const { profile, user } = useAuth()

  // Terminal Category Filter
  const [activeCategory, setActiveCategory] = useState('all')

  // Cart State
  const [cart, setCart] = useState([
    { id: 'item_2', name: 'Spanish Latte', price: 280, quantity: 2 },
    { id: 'item_6', name: 'Butter Croissant', price: 180, quantity: 1 }
  ])
  const [selectedTable, setSelectedTable] = useState('Table 3')
  const [orderType, setOrderType] = useState('dine-in')
  const [printedOrder, setPrintedOrder] = useState(null)

  // Cart helpers
  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id)
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, { ...item, quantity: 1 }]
    })
  }

  const updateQuantity = (itemId, delta) => {
    setCart(prev => {
      return prev
        .map(i => {
          if (i.id === itemId) {
            const newQty = i.quantity + delta
            return newQty > 0 ? { ...i, quantity: newQty } : null
          }
          return i
        })
        .filter(Boolean)
    })
  }

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0)
  const vat = Math.round(subtotal * 0.075) // 7.5% NBR VAT
  const grandTotal = subtotal + vat

  const handlePlaceOrder = () => {
    if (cart.length === 0) return
    const orderNumber = Math.floor(100 + Math.random() * 900)
    const newOrder = {
      orderId: `#ORD-${orderNumber}`,
      items: [...cart],
      table: selectedTable,
      type: orderType,
      subtotal,
      vat,
      total: grandTotal,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      cashier: profile?.full_name || user?.email || 'Staff'
    }
    setPrintedOrder(newOrder)
  }

  const filteredItems = activeCategory === 'all'
    ? POS_MENU_ITEMS
    : POS_MENU_ITEMS.filter(i => i.category === activeCategory)

  return (
    <div style={styles.container}>
      {/* POS & Orders Register */}
      <div style={styles.posLayout}>
        {/* Menu Catalog (Left) */}
        <div style={styles.catalogCol}>
          {/* Category Filter Pills */}
          <div style={styles.categoryRow}>
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  ...styles.catBtn,
                  backgroundColor: activeCategory === cat.id ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: activeCategory === cat.id ? '#FFFFFF' : 'var(--color-text-main)',
                  borderColor: activeCategory === cat.id ? 'var(--color-primary)' : 'var(--color-border)',
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Menu Items Grid */}
          <div style={styles.itemsGrid}>
            {filteredItems.map(item => (
              <div
                key={item.id}
                onClick={() => addToCart(item)}
                style={styles.itemCard}
              >
                <div style={styles.itemCardTop}>
                  <div style={styles.itemIconBox}>
                    <Coffee size={20} color="var(--color-primary-active)" />
                  </div>
                  <span style={styles.itemPrice}>৳ {item.price}</span>
                </div>

                <h4 style={styles.itemName}>{item.name}</h4>
                <p style={styles.itemDesc}>{item.desc}</p>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    addToCart(item)
                  }}
                  style={styles.addBtn}
                >
                  <Plus size={14} />
                  <span>Add to Order</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Active Order Cart (Right) */}
        <div style={styles.cartCol}>
          <div style={styles.cartCard}>
            <div style={styles.cartHeader}>
              <div>
                <h3 style={styles.cartTitle}>Current Order</h3>
                <div style={styles.cartSubtitle}>Table &amp; Guest Seating</div>
              </div>

              <select
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                style={styles.tableSelect}
              >
                <option value="Table 1">Table 1</option>
                <option value="Table 2">Table 2</option>
                <option value="Table 3">Table 3</option>
                <option value="Table 4">Table 4</option>
                <option value="Takeaway">Takeaway (Counter)</option>
              </select>
            </div>

            {/* Dine-in vs Takeaway Segment */}
            <div style={styles.typeSegment}>
              <button
                onClick={() => setOrderType('dine-in')}
                style={{
                  ...styles.typeBtn,
                  backgroundColor: orderType === 'dine-in' ? 'var(--color-primary)' : 'transparent',
                  color: orderType === 'dine-in' ? '#FFFFFF' : 'var(--color-text-main)',
                }}
              >
                Dine-In
              </button>
              <button
                onClick={() => setOrderType('takeaway')}
                style={{
                  ...styles.typeBtn,
                  backgroundColor: orderType === 'takeaway' ? 'var(--color-primary)' : 'transparent',
                  color: orderType === 'takeaway' ? '#FFFFFF' : 'var(--color-text-main)',
                }}
              >
                Takeaway
              </button>
            </div>

            {/* Items List */}
            <div style={styles.cartItemsList}>
              {cart.length === 0 ? (
                <div style={styles.cartEmpty}>
                  <ShoppingBag size={36} color="var(--color-text-muted)" />
                  <p style={{ marginTop: '10px', fontSize: '0.9rem' }}>No items added yet</p>
                  <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>Tap items on the left to add</span>
                </div>
              ) : (
                cart.map(i => (
                  <div key={i.id} style={styles.cartItemRow}>
                    <div style={styles.cartItemInfo}>
                      <span style={styles.cartItemName}>{i.name}</span>
                      <span style={styles.cartItemUnitPrice}>৳ {i.price} each</span>
                    </div>

                    <div style={styles.qtyControl}>
                      <button onClick={() => updateQuantity(i.id, -1)} style={styles.qtyBtn}>
                        <Minus size={12} />
                      </button>
                      <span style={styles.qtyText}>{i.quantity}</span>
                      <button onClick={() => updateQuantity(i.id, 1)} style={styles.qtyBtn}>
                        <Plus size={12} />
                      </button>
                    </div>

                    <div style={styles.itemTotal}>
                      ৳ {i.price * i.quantity}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Summary Calculations */}
            <div style={styles.cartSummary}>
              <div style={styles.sumRow}>
                <span>Subtotal:</span>
                <span>৳ {subtotal}</span>
              </div>
              <div style={styles.sumRow}>
                <span>VAT (7.5% NBR):</span>
                <span>৳ {vat}</span>
              </div>
              <div style={{ ...styles.sumRow, ...styles.sumGrandTotal }}>
                <span>Grand Total:</span>
                <span>৳ {grandTotal}</span>
              </div>
            </div>

            {/* Place Order CTA */}
            <button
              onClick={handlePlaceOrder}
              disabled={cart.length === 0}
              style={{
                ...styles.orderBtn,
                opacity: cart.length === 0 ? 0.6 : 1,
                cursor: cart.length === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              <Printer size={18} />
              <span>Place Order &amp; Print Thermal Slip</span>
            </button>
          </div>
        </div>
      </div>

      {/* Printed Thermal Slip Modal */}
      {printedOrder && (
        <div style={styles.modalOverlay}>
          <div style={styles.thermalSlip}>
            <div style={styles.slipHeader}>
              <div style={styles.slipCafeName}>L'AROMA CAFE</div>
              <div style={styles.slipCafeSub}>Dhanmondi, Dhaka • NBR VAT #789012</div>
              <div style={styles.slipDivider} />
              <div style={styles.slipMeta}>
                <span>Order: {printedOrder.orderId}</span>
                <span>{printedOrder.time}</span>
              </div>
              <div style={styles.slipMeta}>
                <span>Location: {printedOrder.table}</span>
                <span>Type: {printedOrder.type.toUpperCase()}</span>
              </div>
            </div>

            <div style={styles.slipDivider} />

            <div style={styles.slipItems}>
              {printedOrder.items.map((it, idx) => (
                <div key={idx} style={styles.slipItemRow}>
                  <span>{it.quantity}x {it.name}</span>
                  <span>৳ {it.price * it.quantity}</span>
                </div>
              ))}
            </div>

            <div style={styles.slipDivider} />

            <div style={styles.slipTotalRow}>
              <span>Subtotal:</span>
              <span>৳ {printedOrder.subtotal}</span>
            </div>
            <div style={styles.slipTotalRow}>
              <span>VAT (7.5%):</span>
              <span>৳ {printedOrder.vat}</span>
            </div>
            <div style={{ ...styles.slipTotalRow, fontWeight: '800', fontSize: '1rem', marginTop: '4px' }}>
              <span>TOTAL (BDT):</span>
              <span>৳ {printedOrder.total}</span>
            </div>

            <div style={styles.slipDivider} />

            <div style={styles.slipFooter}>
              <span>Thank you for visiting L'Aroma Cafe!</span>
              <span style={{ fontSize: '0.7rem', color: '#666' }}>Cashier: {printedOrder.cashier}</span>
            </div>

            <button
              onClick={() => {
                setPrintedOrder(null)
                setCart([])
              }}
              style={styles.closeSlipBtn}
            >
              Close &amp; Clear Register
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    maxWidth: '1280px',
    margin: '0 auto',
    padding: '0 24px 60px',
  },
  posLayout: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)',
    gap: '24px',
    alignItems: 'start',
  },
  catalogCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  categoryRow: {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    paddingBottom: '4px',
  },
  catBtn: {
    padding: '8px 16px',
    borderRadius: 'var(--radius-full)',
    border: '1px solid',
    fontSize: '0.84rem',
    fontWeight: '700',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s',
  },
  itemsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '16px',
  },
  itemCard: {
    backgroundColor: 'var(--color-surface)',
    border: '1.5px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '18px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '170px',
    transition: 'transform 0.15s, box-shadow 0.15s',
  },
  itemCardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  itemIconBox: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    backgroundColor: 'rgba(98, 111, 72, 0.14)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemPrice: {
    fontSize: '1rem',
    fontWeight: '800',
    color: 'var(--color-primary-active)',
  },
  itemName: {
    fontSize: '1.05rem',
    fontWeight: '700',
    color: 'var(--color-text-main)',
    marginBottom: '4px',
  },
  itemDesc: {
    fontSize: '0.78rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.4,
    marginBottom: '14px',
    flex: 1,
  },
  addBtn: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg)',
    color: 'var(--color-text-main)',
    fontSize: '0.82rem',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    cursor: 'pointer',
  },
  cartCol: {
    display: 'flex',
    flexDirection: 'column',
  },
  cartCard: {
    backgroundColor: 'var(--color-surface)',
    border: '1.5px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '24px',
    boxShadow: 'var(--shadow-sm)',
  },
  cartHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: '14px',
    marginBottom: '16px',
  },
  cartTitle: {
    fontSize: '1.2rem',
    fontWeight: '800',
    color: 'var(--color-text-main)',
  },
  cartSubtitle: {
    fontSize: '0.78rem',
    color: 'var(--color-text-muted)',
  },
  tableSelect: {
    padding: '6px 10px',
    borderRadius: 'var(--radius-sm)',
    border: '1.5px solid var(--color-border)',
    backgroundColor: 'var(--color-bg)',
    fontSize: '0.84rem',
    fontWeight: '700',
    outline: 'none',
    cursor: 'pointer',
  },
  typeSegment: {
    display: 'flex',
    backgroundColor: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    padding: '3px',
    marginBottom: '18px',
  },
  typeBtn: {
    flex: 1,
    padding: '7px 0',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    fontSize: '0.82rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  cartItemsList: {
    minHeight: '180px',
    maxHeight: '260px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    paddingBottom: '10px',
  },
  cartEmpty: {
    padding: '36px 0',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartItemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    backgroundColor: 'var(--color-bg)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    display: 'block',
    fontSize: '0.88rem',
    fontWeight: '700',
    color: 'var(--color-text-main)',
  },
  cartItemUnitPrice: {
    fontSize: '0.74rem',
    color: 'var(--color-text-muted)',
  },
  qtyControl: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    margin: '0 12px',
  },
  qtyBtn: {
    width: '24px',
    height: '24px',
    borderRadius: '4px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: '0.86rem',
    fontWeight: '700',
    minWidth: '18px',
    textAlign: 'center',
  },
  itemTotal: {
    fontSize: '0.92rem',
    fontWeight: '800',
    color: 'var(--color-text-main)',
    minWidth: '55px',
    textAlign: 'right',
  },
  cartSummary: {
    borderTop: '1px solid var(--color-border)',
    paddingTop: '14px',
    marginTop: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  sumRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.86rem',
    color: 'var(--color-text-muted)',
  },
  sumGrandTotal: {
    fontSize: '1.1rem',
    fontWeight: '800',
    color: 'var(--color-text-main)',
    marginTop: '6px',
    paddingTop: '6px',
    borderTop: '1px dashed var(--color-border)',
  },
  orderBtn: {
    width: '100%',
    padding: '13px 20px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    backgroundColor: 'var(--color-primary)',
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: '0.95rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginTop: '18px',
    boxShadow: 'var(--shadow-sm)',
  },
  // Thermal Slip Modal
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(34, 42, 30, 0.7)',
    backdropFilter: 'blur(4px)',
    zIndex: 1200,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  thermalSlip: {
    backgroundColor: '#FFFFFF',
    color: '#000000',
    width: '320px',
    padding: '24px 20px',
    borderRadius: '6px',
    fontFamily: 'Courier New, monospace',
    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
  },
  slipHeader: {
    textAlign: 'center',
  },
  slipCafeName: {
    fontSize: '1.25rem',
    fontWeight: '900',
    letterSpacing: '0.05em',
  },
  slipCafeSub: {
    fontSize: '0.72rem',
    color: '#444',
    marginTop: '2px',
  },
  slipDivider: {
    borderBottom: '1px dashed #444',
    margin: '10px 0',
  },
  slipMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.74rem',
    color: '#333',
    margin: '2px 0',
  },
  slipItems: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    margin: '10px 0',
  },
  slipItemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.82rem',
  },
  slipTotalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.84rem',
    margin: '2px 0',
  },
  slipFooter: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: '0.76rem',
    margin: '12px 0',
  },
  closeSlipBtn: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#222',
    color: '#FFF',
    border: 'none',
    borderRadius: '4px',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '6px',
  }
}
