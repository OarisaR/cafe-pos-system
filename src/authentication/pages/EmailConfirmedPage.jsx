// =========================================================================
// MODULE OWNER: Person 1 — Auth
// Route: /auth/confirmed   (public — লগইন ছাড়াই খোলে)
//
// ইমেইলের "Confirm your account" লিংকে চাপ দিলে Supabase এখানে ফেরত
// পাঠায়, সাথে URL এর শেষে একটা লম্বা `#access_token=...`।
//
// এখানে তিনটা কাজ হয়:
//   ১. লিংকটা কাজ করেছে না ফেল করেছে (মেয়াদ শেষ?) সেটা বোঝা
//   ২. লিংক দিয়ে যে session টা নিজে থেকে তৈরি হয়ে গেছে সেটা বাতিল করা —
//      নাহলে পাসওয়ার্ড না দিয়েই কেউ ঢুকে পড়ত, আর owner নিজের লিংক
//      খুললে তিনি নিজের অ্যাকাউন্ট থেকে ছিটকে নতুন স্টাফ হয়ে যেতেন
//   ৩. কুৎসিত hash টা ঠিকানা থেকে মুছে একটা পরিষ্কার কার্ড দেখানো
// =========================================================================
import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Coffee, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react'
import { supabase, INITIAL_URL_HASH } from '../../shared/lib/supabase'

const REDIRECT_SECONDS = 6

/** `#access_token=..&type=signup` বা `#error=..&error_description=..` পড়া */
const readHash = () => {
  const raw = (INITIAL_URL_HASH || window.location.hash || '').replace(/^#/, '')
  const params = new URLSearchParams(raw)
  return {
    hasToken: Boolean(params.get('access_token')),
    type: params.get('type'),
    error: params.get('error') || params.get('error_code'),
    // Supabase এর বার্তায় + চিহ্ন দিয়ে ফাঁকা বোঝায়
    message: (params.get('error_description') || '').replace(/\+/g, ' '),
  }
}

export const EmailConfirmedPage = () => {
  const navigate = useNavigate()
  const [state] = useState(readHash)
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS)

  const failed = Boolean(state.error)

  // লিংক থেকে তৈরি হওয়া session টা বাতিল, আর ঠিকানা পরিষ্কার
  useEffect(() => {
    let active = true

    const tidyUp = async () => {
      try {
        await supabase.auth.signOut()
      } catch {
        // session না থাকলেও সমস্যা নেই — উদ্দেশ্য ছিল না রাখা
      }
      if (!active) return
      window.history.replaceState(null, '', window.location.pathname)
    }

    tidyUp()
    return () => {
      active = false
    }
  }, [])

  // কয়েক সেকেন্ড পর নিজে থেকেই লগইন পেজে
  useEffect(() => {
    if (failed) return undefined

    const timer = setInterval(() => {
      setSecondsLeft((left) => {
        if (left <= 1) {
          clearInterval(timer)
          navigate('/login?verified=true', { replace: true })
          return 0
        }
        return left - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [failed, navigate])

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.brand}>
          <div style={styles.brandIcon}>
            <Coffee size={20} color="#FFFFFF" strokeWidth={2.4} />
          </div>
          <div>
            <div style={styles.brandName}>L'Aroma Cafe</div>
            <div style={styles.brandSub}>POS &amp; Management System</div>
          </div>
        </div>

        <div
          style={{
            ...styles.statusIcon,
            backgroundColor: failed ? 'var(--color-danger-bg)' : 'var(--color-success-bg)',
          }}
        >
          {failed ? (
            <AlertTriangle size={34} color="var(--color-danger)" />
          ) : (
            <CheckCircle2 size={36} color="var(--color-success)" />
          )}
        </div>

        {failed ? (
          <>
            <h1 style={styles.title}>This link has expired</h1>
            <p style={styles.text}>
              {state.message ||
                'The confirmation link is no longer valid. Ask the cafe owner to create your invite again.'}
            </p>
          </>
        ) : (
          <>
            <h1 style={styles.title}>Email confirmed</h1>
            <p style={styles.text}>
              Your staff account is now active. Sign in with the password the cafe
              owner gave you — you can change it later from <strong>My Profile</strong>.
            </p>
          </>
        )}

        <Link to="/login?verified=true" replace style={styles.button}>
          <span>Go to sign in</span>
          <ArrowRight size={16} />
        </Link>

        {!failed && (
          <div style={styles.countdown}>
            Taking you there in {secondsLeft}s…
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    backgroundColor: 'var(--color-bg)',
  },
  card: {
    width: '100%',
    maxWidth: '440px',
    textAlign: 'center',
    backgroundColor: 'var(--color-surface)',
    border: '1.5px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '36px 32px 30px',
    boxShadow: 'var(--shadow-lg)',
    animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '11px',
    marginBottom: '28px',
  },
  brandIcon: {
    width: '38px',
    height: '38px',
    borderRadius: '11px',
    backgroundColor: 'var(--color-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  brandName: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.02rem',
    fontWeight: '800',
    letterSpacing: '-0.01em',
    textAlign: 'left',
    lineHeight: 1.2,
  },
  brandSub: {
    fontSize: '0.68rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    color: 'var(--color-text-muted)',
    textAlign: 'left',
  },
  statusIcon: {
    width: '74px',
    height: '74px',
    borderRadius: '22px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
  },
  title: {
    fontSize: '1.45rem',
    fontWeight: '800',
    letterSpacing: '-0.02em',
    marginBottom: '10px',
  },
  text: {
    fontSize: '0.9rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.65,
    marginBottom: '24px',
  },
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    minHeight: '48px',
    padding: '13px 20px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--color-primary)',
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: '0.92rem',
    textDecoration: 'none',
    boxShadow: '0 4px 14px rgba(139, 154, 110, 0.35)',
  },
  countdown: {
    marginTop: '14px',
    fontSize: '0.78rem',
    color: 'var(--color-text-subtle)',
  },
}
