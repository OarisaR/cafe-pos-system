// =========================================================================
// MODULE OWNER: Person 3 — Menu item card
//
// ডিজাইন: গোল প্লেটে খাবারের ছবি কার্ডের উপরে ভেসে থাকে, নিচে নাম, সময়,
// বর্ণনা, দাম ও বাটন। রং অ্যাপের theme (matcha green + cream) থেকে।
// ছবি না থাকলে বা লোড না হলে category অনুযায়ী icon দেখায়।
// =========================================================================
import React, { useEffect, useState } from 'react'
import { Clock, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { formatTaka } from '../menuService'
import { pickCategoryIcon } from '../categoryIcon'

export const MenuItemCard = ({
  item,
  categoryName,
  editable,
  showCost,
  cost,
  margin,
  hasRecipe,
  shortIngredients,
  busy,
  onEdit,
  onDelete,
  onToggleStatus,
}) => {
  const [imageFailed, setImageFailed] = useState(false)
  // ছবির লিংক বদলালে আবার চেষ্টা করা
  useEffect(() => setImageFailed(false), [item.image_url])
  const isAvailable = item.status === 'available'
  const Icon = pickCategoryIcon(categoryName)
  const showImage = item.image_url && !imageFailed

  return (
    <article
      style={{ ...styles.card, opacity: busy ? 0.6 : 1 }}
      aria-label={`${item.name}, ${formatTaka(item.price)}${isAvailable ? '' : ', unavailable'}`}
    >
      {/* Plate */}
      <div style={styles.plate}>
        {showImage ? (
          <img
            src={item.image_url}
            alt=""
            style={{ ...styles.plateImg, filter: isAvailable ? 'none' : 'grayscale(0.85)' }}
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <Icon size={54} strokeWidth={1.5} color="var(--color-primary-active)" aria-hidden="true" />
        )}
      </div>

      {/* Availability — top right, like the heart in the design */}
      {editable ? (
        <button
          type="button"
          role="switch"
          aria-checked={isAvailable}
          aria-label={`${item.name} is ${isAvailable ? 'available' : 'unavailable'}. Toggle availability`}
          title={isAvailable ? 'Available — click to hide from the POS' : 'Unavailable — click to show on the POS'}
          onClick={onToggleStatus}
          disabled={busy}
          style={styles.statusDotBtn}
        >
          <span style={{ ...styles.statusDot, backgroundColor: isAvailable ? 'var(--color-success)' : 'var(--color-border)', borderColor: isAvailable ? 'var(--color-success)' : 'var(--color-text-subtle)' }} />
        </button>
      ) : (
        <span
          style={{ ...styles.statusDotBtn, cursor: 'default' }}
          title={isAvailable ? 'Available' : 'Unavailable'}
          aria-hidden="true"
        >
          <span style={{ ...styles.statusDot, backgroundColor: isAvailable ? 'var(--color-success)' : 'var(--color-border)', borderColor: isAvailable ? 'var(--color-success)' : 'var(--color-text-subtle)' }} />
        </span>
      )}

      <div style={styles.body}>
        <div style={styles.titleRow}>
          <h3 style={styles.name}>{item.name}</h3>
          {item.prep_time_minutes != null && (
            <span style={styles.time}>
              <Clock size={12} aria-hidden="true" />
              {item.prep_time_minutes} min
            </span>
          )}
        </div>

        {!isAvailable && <span style={styles.unavailableTag}>Unavailable</span>}

        <p style={styles.desc}>{item.description || categoryName}</p>

        {showCost && (
          <div style={styles.costLine}>
            {hasRecipe ? (
              <>
                Cost {formatTaka(cost)} ·{' '}
                <strong style={{ color: margin < 30 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                  {margin == null ? '—' : `${margin.toFixed(0)}% margin`}
                </strong>
              </>
            ) : (
              <span style={{ color: 'var(--color-text-subtle)' }}>No recipe yet</span>
            )}
          </div>
        )}

        {shortIngredients.length > 0 && (
          <div style={styles.warn}>
            <AlertTriangle size={12} aria-hidden="true" />
            <span>Out of stock: {shortIngredients.join(', ')}</span>
          </div>
        )}

        <div style={styles.footer}>
          <span style={styles.price}>{formatTaka(item.price)}</span>

          {editable && (
            <div style={styles.actions}>
              <button
                type="button"
                onClick={onDelete}
                disabled={busy}
                style={styles.deleteBtn}
                aria-label={`Delete ${item.name}`}
                title="Delete"
              >
                <Trash2 size={15} />
              </button>
              <button type="button" onClick={onEdit} disabled={busy} style={styles.editBtn}>
                <span>Edit</span>
                <Pencil size={13} />
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

const PLATE = 132

const styles = {
  card: {
    position: 'relative',
    marginTop: `${PLATE / 2}px`,
    paddingTop: `${PLATE / 2 + 8}px`,
    backgroundColor: 'var(--color-white)',
    border: '1px solid var(--color-border-light)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    transition: 'box-shadow var(--transition-fast), transform var(--transition-fast)',
  },
  plate: {
    position: 'absolute',
    top: `-${PLATE / 2}px`,
    left: '50%',
    transform: 'translateX(-50%)',
    width: `${PLATE}px`,
    height: `${PLATE}px`,
    borderRadius: '50%',
    backgroundColor: 'var(--color-surface)',
    border: '4px solid var(--color-white)',
    boxShadow: 'var(--shadow-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  plateImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  statusDotBtn: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    minHeight: '32px',
    width: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    border: '2px solid',
  },
  body: {
    padding: '4px 16px 16px',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: '8px',
  },
  name: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.08rem',
    fontWeight: '700',
    lineHeight: 1.25,
    color: 'var(--color-text-main)',
  },
  time: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    flexShrink: 0,
    fontSize: '0.72rem',
    fontWeight: '600',
    color: 'var(--color-text-muted)',
    whiteSpace: 'nowrap',
  },
  unavailableTag: {
    alignSelf: 'flex-start',
    marginTop: '4px',
    padding: '1px 8px',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--color-warning-bg)',
    color: 'var(--color-warning)',
    fontSize: '0.68rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  desc: {
    marginTop: '6px',
    fontSize: '0.8rem',
    lineHeight: 1.5,
    color: 'var(--color-text-muted)',
    flex: 1,
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  costLine: {
    marginTop: '8px',
    fontSize: '0.74rem',
    color: 'var(--color-text-muted)',
    fontVariantNumeric: 'tabular-nums',
  },
  warn: {
    marginTop: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.72rem',
    fontWeight: '700',
    color: 'var(--color-danger)',
  },
  footer: {
    marginTop: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
  price: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.1rem',
    fontWeight: '700',
    color: 'var(--color-primary-active)',
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  deleteBtn: {
    minHeight: '36px',
    width: '36px',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text-subtle)',
  },
  editBtn: {
    minHeight: '36px',
    padding: '6px 14px',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--color-primary)',
    color: 'var(--color-white)',
    fontSize: '0.8rem',
    fontWeight: '700',
    gap: '6px',
    boxShadow: '0 3px 10px rgba(139, 154, 110, 0.35)',
  },
}
