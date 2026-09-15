import React, { useState } from 'react'
import { 
  ShoppingBag, 
  Grid, 
  Receipt, 
  Package, 
  BookOpen, 
  Coffee, 
  Plus, 
  Minus, 
  Trash2, 
  CheckCircle2, 
  Printer, 
  ArrowRight,
  ShieldCheck,
  Clock,
  QrCode,
  DollarSign,
  AlertCircle
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { MODULES } from '../../constants/rbac'

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

export const StaffTerminalView = ({ activeTab = MODULES.ORDERS, onSwitchTab }) => {
  const { profile, user, currentRoleInfo } = useAuth()

  // Terminal Category Filter
  const [activeCategory, setActiveCategory] = useState('all')

  // Cart State
  const [cart, setCart] = useState([
    { id: 'item_2', name: 'Spanish Latte', price: 280, quantity: 2 },
    { id: 'item_6', name: 'Butter Croissant', price: 180, quantity: 1 }
  ])
  const [selectedTable, setSelectedTable] = useState('Table 3')
  const [orderType, setOrderType] = useState('dine-in')
  const [orderNotes, setOrderNotes] = useState('')
  const [printedOrder, setPrintedOrder] = useState(null)

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

  // Billing Tender State
  const [tenderCash, setTenderCash] = useState('1000')
  const [billingToast, setBillingToast] = useState(null)

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

  const toggleTableStatus = (tableId) => {
    setTablesList(prev => prev.map(t => {
      if (t.id === tableId) {
        const nextStatus = t.status === 'empty' ? 'occupied' : t.status === 'occupied' ? 'cleaning' : 'empty'
        return { ...t, status: nextStatus }
      }
      return t
    }))
  }

  const filteredItems = activeCategory === 'all'
    ? POS_MENU_ITEMS
    : POS_MENU_ITEMS.filter(i => i.category === activeCategory)

  return (
    <div style={styles.container}>
      {/* Top Banner */}
      <div style={styles.banner}>
        <div style={styles.bannerLeft}>
          <div style={styles.badge}>
            <ShieldCheck size={14} />
            <span>Staff Terminal • {profile?.full_name || 'Frontline User'}</span>
          </div>
          <h2 style={styles.title}>
            {activeTab === MODULES.TABLES ? 'Live Dining Floor & Table Occupancy' :
             activeTab === MODULES.BILLING ? 'Billing Settlement & Cash Tender' :
             activeTab === MODULES.INVENTORY ? 'Ingredient Stock & Pantry Tracker' :
             'Front Counter POS & Order Entry'}
          </h2>
          <p style={styles.subtitle}>
            Fast, touch-first register interface. All transactions, table reservations, and receipt slips are managed right from your station.
          </p>
        </div>

        <div style={styles.shiftCard}>
          <div style={styles.shiftLabel}>Shift Register Terminal</div>
          <div style={styles.shiftTime}>
            <Clock size={15} style={{ display: 'inline', marginRight: '5px' }} />
            {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
          </div>
          <div style={styles.shiftRole}>{currentRoleInfo?.name || 'Staff Member'}</div>
        </div>
      </div>

      {/* RENDER ACTIVE TERMINAL VIEW */}
      {activeTab === MODULES.TABLES ? (
        /* Floor Map View */
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
              const bg = t.status === 'empty' ? '#E8F5E9' : t.status === 'occupied' ? '#FFF3E0' : t.status === 'reserved' ? '#E3F2FD' : '#FFFDE7'
              const color = t.status === 'empty' ? '#2E7D32' : t.status === 'occupied' ? '#E65100' : t.status === 'reserved' ? '#1565C0' : '#F57F17'

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
      ) : activeTab === MODULES.BILLING ? (
        /* Billing & Tender Calculator */
        <div style={styles.billingGrid}>
          <div style={styles.billingCard}>
            <h3 style={styles.cardTitle}>Quick Cash Tender &amp; Change Calculator</h3>
            <p style={styles.cardSubtitle}>Calculate instant return change for BDT (৳) cash payments</p>

            <div style={styles.tenderForm}>
              <div style={styles.tenderRow}>
                <span>Order Total:</span>
                <strong>৳ {grandTotal}</strong>
              </div>

              <div style={styles.tenderInputGroup}>
                <label style={styles.label}>Customer Cash Given (৳):</label>
                <input
                  type="number"
                  value={tenderCash}
                  onChange={(e) => setTenderCash(e.target.value)}
                  style={styles.input}
                />
              </div>

              <div style={styles.changeResultBox}>
                <span>Return Change to Customer:</span>
                <div style={styles.changeBigText}>
                  ৳ {Math.max(0, Number(tenderCash || 0) - grandTotal)}
                </div>
              </div>

              <button
                onClick={() => {
                  setBillingToast('Payment Settled! Cash drawer triggered.')
                  setTimeout(() => setBillingToast(null), 3000)
                }}
                style={styles.settleBtn}
              >
                <CheckCircle2 size={18} />
                <span>Complete Cash Settlement</span>
              </button>
            </div>
          </div>

          <div style={styles.billingCard}>
            <h3 style={styles.cardTitle}>Mobile Financial Services (MFS)</h3>
            <p style={styles.cardSubtitle}>Scan instant QR code for bKash or Nagad counter payments</p>

            <div style={styles.mfsBox}>
              <div style={styles.qrPlaceholder}>
                <QrCode size={120} color="var(--color-primary-active)" />
                <span style={{ marginTop: '8px', fontSize: '0.8rem', fontWeight: '700' }}>bKash / Nagad Merchant QR</span>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button 
                  onClick={() => {
                    setBillingToast('bKash Payment Verified via webhook!')
                    setTimeout(() => setBillingToast(null), 3000)
                  }}
                  style={{ ...styles.mfsBtn, backgroundColor: '#E2136E' }}
                >
                  Verify bKash
                </button>
                <button 
                  onClick={() => {
                    setBillingToast('Nagad Payment Verified!')
                    setTimeout(() => setBillingToast(null), 3000)
                  }}
                  style={{ ...styles.mfsBtn, backgroundColor: '#F7941D' }}
                >
                  Verify Nagad
                </button>
              </div>

              {billingToast && (
                <div style={styles.billingToast}>
                  <CheckCircle2 size={16} />
                  <span>{billingToast}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : activeTab === MODULES.INVENTORY ? (
        /* Ingredient Stock View */
        <div style={styles.floorCard}>
          <div style={styles.floorHeader}>
            <div>
              <h3 style={styles.cardTitle}>Ingredient Pantry Inventory</h3>
              <p style={styles.cardSubtitle}>Real-time consumption tracked automatically per drink poured</p>
            </div>
          </div>

          <div style={styles.inventoryList}>
            {[
              { name: 'Roasted Espresso Blend', level: '8.4 kg', status: 'High', color: 'var(--color-success)' },
              { name: 'Whole Dairy Milk (Aarong)', level: '2.5 L', status: 'Low - Restock Alert', color: 'var(--color-danger)' },
              { name: 'Oat Milk Barista Edition', level: '6.0 L', status: 'Moderate', color: '#B26A00' },
              { name: 'Madagascar Vanilla Syrup', level: '1.2 L', status: 'High', color: 'var(--color-success)' },
              { name: 'Belgian Dark Chocolate Sauce', level: '3.0 kg', status: 'High', color: 'var(--color-success)' },
            ].map((ing, idx) => (
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
      ) : (
        /* POS & Orders Register */
        <div style={styles.posLayout}>
          {/* Menu Catalog (Left) */}
          <div style={styles.catalogCol}>
            {/* Category Filter Pills */}
            <div style={styles.categoryRow}>
              {[
                { id: 'all', label: 'All Items' },
                { id: 'coffee', label: 'Espresso & Coffee' },
                { id: 'tea', label: 'Tea & Chai' },
                { id: 'bakery', label: 'Artisan Bakery' },
                { id: 'cold', label: 'Cold Brews' },
              ].map(cat => (
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
      )}

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
  banner: {
    backgroundColor: 'var(--color-surface)',
    border: '1.5px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '28px 32px',
    marginBottom: '28px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '20px',
    flexWrap: 'wrap',
    boxShadow: 'var(--shadow-sm)',
  },
  bannerLeft: {
    maxWidth: '680px',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    backgroundColor: 'rgba(98, 111, 72, 0.14)',
    color: 'var(--color-primary-active)',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.78rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: '10px',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: '800',
    color: 'var(--color-text-main)',
    marginBottom: '6px',
  },
  subtitle: {
    fontSize: '0.92rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.5,
  },
  shiftCard: {
    backgroundColor: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    padding: '16px 20px',
    borderRadius: 'var(--radius-md)',
    textAlign: 'right',
    minWidth: '200px',
  },
  shiftLabel: {
    fontSize: '0.72rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: 'var(--color-text-muted)',
  },
  shiftTime: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: 'var(--color-primary-active)',
    margin: '4px 0',
  },
  shiftRole: {
    fontSize: '0.78rem',
    color: 'var(--color-text-muted)',
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
  // Floor Tables styles
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
  // Billing styles
  billingGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
  },
  billingCard: {
    backgroundColor: 'var(--color-surface)',
    border: '1.5px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '28px',
    boxShadow: 'var(--shadow-sm)',
  },
  tenderForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginTop: '20px',
  },
  tenderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '1rem',
    color: 'var(--color-text-main)',
    padding: '12px',
    backgroundColor: 'var(--color-bg)',
    borderRadius: 'var(--radius-sm)',
  },
  tenderInputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '0.84rem',
    fontWeight: '700',
    color: 'var(--color-text-main)',
  },
  input: {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1.5px solid var(--color-border)',
    backgroundColor: 'var(--color-bg)',
    fontSize: '1.1rem',
    fontWeight: '700',
    color: 'var(--color-text-main)',
    outline: 'none',
  },
  changeResultBox: {
    padding: '16px',
    backgroundColor: 'rgba(98, 111, 72, 0.12)',
    borderRadius: 'var(--radius-sm)',
    textAlign: 'center',
  },
  changeBigText: {
    fontSize: '2rem',
    fontWeight: '800',
    color: 'var(--color-primary-active)',
    marginTop: '4px',
  },
  settleBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '13px 20px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    backgroundColor: 'var(--color-primary)',
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: '0.94rem',
    cursor: 'pointer',
  },
  mfsBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px 0',
  },
  qrPlaceholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: 'var(--color-bg)',
    borderRadius: '16px',
    border: '1.5px solid var(--color-border)',
  },
  mfsBtn: {
    padding: '10px 20px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: '0.88rem',
    cursor: 'pointer',
  },
  billingToast: {
    marginTop: '16px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--color-success-bg)',
    color: 'var(--color-success)',
    fontSize: '0.84rem',
    fontWeight: '700',
  },
  // Inventory styles
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
