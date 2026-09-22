// =========================================================================
// MODULE OWNER: Person 1 — Reporting
//
// Progression graph — কোনো chart লাইব্রেরি ছাড়াই, সরাসরি SVG.
// বার = সেই সময়ের আয় (net income), লাইন = লাভ (profit)।
// =========================================================================
import React, { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { takaShort, taka } from '../reportsService'

// SVG এর স্থানাঙ্ক = আসল CSS পিক্সেল। তাই কনটেইনারের প্রস্থ মেপে আঁকা হয় —
// এতে চওড়া মনিটরে গ্রাফটা টেনে লম্বা হয়ে যায় না, আর লেখাও ঝাপসা হয় না।
const H = 300
const MIN_W = 320
const PAD = { top: 22, right: 18, bottom: 34, left: 62 }
const PLOT_H = H - PAD.top - PAD.bottom

/** ২৩৭ → ২৫০, ৪১০০ → ৫০০০ — অক্ষের মাথায় গোল সংখ্যা */
const niceCeil = (value) => {
  if (value <= 0) return 100
  const pow = Math.pow(10, Math.floor(Math.log10(value)))
  const n = value / pow
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10
  return step * pow
}

export const SalesChart = ({ series = [], bucket = 'hour' }) => {
  const [hover, setHover] = useState(null)
  const wrapRef = useRef(null)
  const [W, setW] = useState(MIN_W)

  // কনটেইনারের প্রস্থ পরিবর্তন হলেই গ্রাফ নতুন করে মাপে (sidebar খোলা/বন্ধ, resize)
  useLayoutEffect(() => {
    const node = wrapRef.current
    if (!node) return undefined

    const measure = () => setW(Math.max(MIN_W, Math.round(node.clientWidth)))
    measure()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure)
      return () => window.removeEventListener('resize', measure)
    }
    const ro = new ResizeObserver(measure)
    ro.observe(node)
    return () => ro.disconnect()
  }, [])

  const PLOT_W = W - PAD.left - PAD.right

  const { max, ticks, bars, linePoints, hasData } = useMemo(() => {
    const peak = series.reduce((m, s) => Math.max(m, s.revenue, s.profit), 0)
    const max = niceCeil(peak)
    const y = (v) => PAD.top + PLOT_H - (v / max) * PLOT_H

    const slotW = PLOT_W / Math.max(series.length, 1)
    const barW = Math.max(4, Math.min(34, slotW * 0.54))

    const bars = series.map((s, i) => {
      const cx = PAD.left + slotW * i + slotW / 2
      return {
        ...s,
        index: i,
        cx,
        x: cx - barW / 2,
        w: barW,
        y: y(s.revenue),
        h: Math.max(s.revenue > 0 ? 2 : 0, PAD.top + PLOT_H - y(s.revenue)),
        slotW,
      }
    })

    return {
      max,
      ticks: [0, 0.25, 0.5, 0.75, 1].map((f) => ({ value: max * f, y: y(max * f) })),
      bars,
      linePoints: bars.map((b) => `${b.cx},${y(b.profit)}`).join(' '),
      hasData: peak > 0,
    }
  }, [series, PLOT_W])

  // x-অক্ষে সব লেবেল ধরে না — মাসিক রিপোর্টে প্রতি ৩ দিনে একটা করে দেখাই
  const labelEvery = bucket === 'day' && series.length > 16 ? 3 : bucket === 'hour' ? 2 : 1

  return (
    <div ref={wrapRef} style={styles.wrap}>
      <div style={styles.legend}>
        <span style={styles.legendItem}>
          <span style={{ ...styles.swatch, backgroundColor: 'var(--color-primary)' }} />
          Income
        </span>
        <span style={styles.legendItem}>
          <span style={{ ...styles.swatchLine, backgroundColor: 'var(--color-warning)' }} />
          Profit
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        style={styles.svg}
        role="img"
        aria-label="Sales progression chart"
      >
        {/* y-অক্ষের দাগ ও টাকার লেবেল */}
        {ticks.map((t) => (
          <g key={t.value}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={t.y}
              y2={t.y}
              stroke="var(--color-border)"
              strokeWidth="1"
              strokeDasharray={t.value === 0 ? '0' : '4 5'}
            />
            <text x={PAD.left - 10} y={t.y + 4} textAnchor="end" style={styles.axisText}>
              {takaShort(t.value)}
            </text>
          </g>
        ))}

        {/* আয়ের বার */}
        {bars.map((b) => (
          <g
            key={b.key}
            onMouseEnter={() => setHover(b.index)}
            onMouseLeave={() => setHover(null)}
          >
            {/* পুরো কলামটাই hover এলাকা, নাহলে সরু বারে মাউস ধরা কঠিন */}
            <rect
              x={b.cx - b.slotW / 2}
              y={PAD.top}
              width={b.slotW}
              height={PLOT_H}
              fill={hover === b.index ? 'rgba(139, 154, 110, 0.10)' : 'transparent'}
            />
            <rect
              x={b.x}
              y={b.y}
              width={b.w}
              height={b.h}
              rx="4"
              fill={hover === b.index ? 'var(--color-primary-active)' : 'var(--color-primary)'}
            />
          </g>
        ))}

        {/* লাভের রেখা */}
        {hasData && (
          <polyline
            points={linePoints}
            fill="none"
            stroke="var(--color-warning)"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* x-অক্ষের লেবেল */}
        {bars.map((b, i) =>
          i % labelEvery === 0 ? (
            <text key={`l-${b.key}`} x={b.cx} y={H - 12} textAnchor="middle" style={styles.axisText}>
              {b.label}
            </text>
          ) : null
        )}
      </svg>

      {/* Tooltip — SVG এর বাইরে সাধারণ div, তাই লেখা ঝকঝকে থাকে */}
      {hover !== null && bars[hover] && (
        <div
          style={{
            ...styles.tip,
            left: `${bars[hover].cx}px`,
          }}
        >
          <div style={styles.tipTitle}>
            {bucket === 'hour'
              ? `${bars[hover].key}:00`
              : bucket === 'day'
                ? `Day ${bars[hover].label}`
                : bars[hover].label}
          </div>
          <div style={styles.tipRow}>
            <span>Income</span>
            <strong>{taka(bars[hover].revenue)}</strong>
          </div>
          <div style={styles.tipRow}>
            <span>Profit</span>
            <strong>{taka(bars[hover].profit)}</strong>
          </div>
          <div style={styles.tipRow}>
            <span>Orders</span>
            <strong>{bars[hover].orders}</strong>
          </div>
        </div>
      )}

      {!hasData && <div style={styles.empty}>No sales recorded in this period</div>}
    </div>
  )
}

const styles = {
  wrap: {
    position: 'relative',
    width: '100%',
  },
  svg: {
    display: 'block',
    maxWidth: '100%',
    overflow: 'visible',
  },
  legend: {
    display: 'flex',
    gap: '16px',
    marginBottom: '6px',
  },
  legendItem: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.74rem',
    fontWeight: '700',
    color: 'var(--color-text-muted)',
  },
  swatch: {
    width: '11px',
    height: '11px',
    borderRadius: '3px',
  },
  swatchLine: {
    width: '14px',
    height: '3px',
    borderRadius: '2px',
  },
  axisText: {
    fontSize: '11px',
    fill: 'var(--color-text-subtle)',
    fontWeight: 600,
  },
  tip: {
    position: 'absolute',
    top: '4px',
    transform: 'translateX(-50%)',
    backgroundColor: 'var(--color-text-main)',
    color: '#FFFFFF',
    borderRadius: 'var(--radius-sm)',
    padding: '8px 11px',
    fontSize: '0.74rem',
    minWidth: '132px',
    pointerEvents: 'none',
    boxShadow: 'var(--shadow-md)',
    zIndex: 5,
  },
  tipTitle: {
    fontWeight: '800',
    marginBottom: '4px',
    opacity: 0.85,
  },
  tipRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '14px',
    lineHeight: 1.6,
  },
  empty: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.86rem',
    fontWeight: '700',
    color: 'var(--color-text-subtle)',
    pointerEvents: 'none',
  },
}
