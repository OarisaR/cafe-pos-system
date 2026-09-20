import React, { useEffect, useState } from 'react'
import { Clock, Minus, Plus } from 'lucide-react'
import { pickCategoryIcon } from '../../menu/categoryIcon'

// Order-specific card: deliberately separate from MenuItemCard so the POS
// never exposes menu-management actions such as edit or delete.
//
// CHANGED: now shows a +/- stepper directly on the card once it has a
// quantity in the cart (matches the reference UI's selected-card style),
// instead of only ever "add one more" on tap. quantity/onIncrement/
// onDecrement are new; onSelect is now only used for the zero-quantity
// "tap to add" state.
export const OrderMenuItemCard = ({ item, categoryName, disabled, quantity = 0, onSelect, onIncrement, onDecrement }) => {
  const [imageFailed, setImageFailed] = useState(false)
  const Icon = pickCategoryIcon(categoryName)

  useEffect(() => {
    setImageFailed(false)
  }, [item.image_url])

  const showImage = Boolean(item.image_url) && !imageFailed
  const inCart = quantity > 0

  return (
    <div
      style={{
        ...styles.card,
        opacity: disabled ? 0.55 : 1,
        borderColor: inCart ? 'var(--color-primary)' : 'var(--color-border-light)',
        boxShadow: inCart ? '0 0 0 2px var(--color-primary)' : 'var(--shadow-sm)',
      }}
    >
      <span style={styles.availabilityDot} aria-label="Available" />
      <div style={styles.imageFrame}>
        {showImage ? (
          <img src={item.image_url} alt="" loading="lazy" onError={() => setImageFailed(true)} style={styles.image} />
        ) : (
          <Icon size={42} strokeWidth={1.5} color="var(--color-primary-active)" aria-hidden="true" />
        )}
      </div>
      <div style={styles.content}>
        <div style={styles.titleRow}>
          <div style={styles.name}>{item.name}</div>
          {item.prep_time_minutes != null && (
            <span style={styles.time}><Clock size={13} /> {item.prep_time_minutes} min</span>
          )}
        </div>
        <div style={styles.description}>{item.description || categoryName}</div>
        <div style={styles.footer}>
          <strong style={styles.price}>৳ {item.price}</strong>
        </div>

        {inCart ? (
          <div style={styles.stepper}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onDecrement(item)}
              aria-label={`Remove one ${item.name}`}
              style={styles.stepperBtn}
            >
              <Minus size={14} />
            </button>
            <span style={styles.stepperQty}>{quantity}</span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onIncrement(item)}
              aria-label={`Add one more ${item.name}`}
              style={styles.stepperBtn}
            >
              <Plus size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSelect(item)}
            aria-label={`Add ${item.name} to the order`}
            style={{ ...styles.addBtn, cursor: disabled ? 'default' : 'pointer' }}
          >
            Add to Order
          </button>
        )}
      </div>
    </div>
  )
}

const styles = {
  card: {
    position: 'relative', display: 'flex', flexDirection: 'column', textAlign: 'left',
    marginTop: '64px', minHeight: '286px',
    border: '1.5px solid', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-white)',
    boxShadow: 'var(--shadow-sm)', transition: 'box-shadow var(--transition-fast), transform var(--transition-fast)',
  },
  imageFrame: {
    position: 'absolute', top: '-64px', left: '50%', transform: 'translateX(-50%)',
    width: '132px', height: '132px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', borderRadius: '50%', backgroundColor: 'var(--color-surface)',
    border: '5px solid var(--color-white)', boxShadow: 'var(--shadow-md)',
  },
  image: { width: '100%', height: '100%', objectFit: 'cover' },
  availabilityDot: { position: 'absolute', top: '22px', right: '16px', width: '17px', height: '17px', borderRadius: '50%', backgroundColor: 'var(--color-success)', zIndex: 1 },
  content: { display: 'flex', flexDirection: 'column', flex: 1, gap: '6px', padding: '96px 20px 18px' },
  titleRow: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' },
  name: { minWidth: 0, fontFamily: 'var(--font-display)', color: 'var(--color-text-main)', fontWeight: 800, fontSize: '1.08rem', lineHeight: 1.2 },
  description: { minHeight: '2.7em', color: 'var(--color-text-muted)', fontSize: '0.82rem', lineHeight: 1.45 },
  footer: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: 'auto', paddingTop: '10px' },
  price: { fontFamily: 'var(--font-display)', color: 'var(--color-primary-active)', fontSize: '1.12rem' },
  time: { display: 'inline-flex', alignItems: 'center', gap: '3px', flexShrink: 0, color: 'var(--color-text-muted)', fontSize: '0.72rem', whiteSpace: 'nowrap' },
  addBtn: { marginTop: '8px', padding: '9px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)', color: 'var(--color-text-main)', fontWeight: 700, fontSize: '0.82rem' },
  stepper: { marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', padding: '7px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-primary-subtle)' },
  stepperBtn: { width: '28px', height: '28px', minWidth: '28px', minHeight: '28px', padding: 0, lineHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: '8px', backgroundColor: 'var(--color-primary)', color: '#fff', flexShrink: 0 },
  stepperQty: { fontWeight: 800, minWidth: '16px', textAlign: 'center' },
}