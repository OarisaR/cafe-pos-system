import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import {
  Coffee,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  ShoppingBag,
  Grid,
  Package,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

/**
 * পুরো স্ক্রিন জুড়ে Login পেজ — অ্যাপের একমাত্র প্রবেশপথ।
 * localhost:5173 এ গেলে সবার আগে এই পেজটাই আসবে।
 */
export const LoginPage = () => {
  const { login, user, initializing, error, setError } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState(null)

  // পেজে ঢোকার সময় আগের error পরিষ্কার করা হয়
  useEffect(() => {
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ইমেইল confirm লিঙ্ক থেকে ফিরে এলে সবুজ ব্যানার দেখানো হয়
  useEffect(() => {
    const hash = window.location.hash
    const search = window.location.search
    if (hash.includes('type=signup') || search.includes('verified=true')) {
      setNotice('🎉 Email confirmed! Please sign in with the password you were given.')
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  // ইতিমধ্যে লগইন করা থাকলে সরাসরি নিজের dashboard এ পাঠিয়ে দেওয়া হয়।
  // কোন পেজে নামবে সেটা এখানে ঠিক করা হয় না — `/` এর RootRedirect করে,
  // কারণ profile আর permission group দুটোই তখন হাতে থাকে।
  if (!initializing && user) {
    return <Navigate to="/" replace state={{ from: location.state?.from }} />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) return

    setSubmitting(true)
    setNotice(null)
    try {
      await login(email, password)
      // role দেখে এখানে পেজ ঠিক করা হয় না — permission group এ সেই module
      // বন্ধ থাকতে পারে। `/` এ পাঠালে RootRedirect আসল অনুমতি দেখে নামাবে।
      navigate('/', { replace: true, state: { from: location.state?.from } })
    } catch {
      // error টা AuthContext এ সেট হয়ে যায়, নিচে ব্যানারে দেখা যাবে
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-split" style={styles.page}>
      {/* বাঁ পাশ: ব্র্যান্ডিং ও কোন role কী দেখবে তার সারাংশ */}
      <aside style={styles.brandPanel}>
        <div style={styles.brandTop}>
          <div style={styles.logoBadge}>
            <Coffee size={26} color="#FFFFFF" strokeWidth={2.2} />
          </div>
          <div>
            <div style={styles.brandName}>L'Aroma Cafe</div>
            <div style={styles.brandTagline}>POS &amp; Management System</div>
          </div>
        </div>

        <div>
          <h1 style={styles.heroTitle}>
            Sign in to your
            <br />
            station
          </h1>
          <p style={styles.heroText}>
            Every account opens a workspace built for its role. You will only see the
            modules your permission group allows.
          </p>
        </div>

        <div style={styles.roleList}>
          {ROLE_PREVIEW.map((r) => (
            <div key={r.label} style={styles.roleRow}>
              <div style={{ ...styles.roleIcon, backgroundColor: r.bg, color: r.color }}>
                <r.Icon size={16} />
              </div>
              <div>
                <div style={styles.roleLabel}>{r.label}</div>
                <div style={styles.roleDesc}>{r.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* ডান পাশ: আসল sign-in ফর্ম */}
      <main style={styles.formPanel}>
        <div style={styles.formCard}>
          <div style={styles.formHeader}>
            <div style={styles.formBadge}>
              <ShieldCheck size={13} />
              <span>Secure Staff Access</span>
            </div>
            <h2 style={styles.formTitle}>Staff Terminal Sign In</h2>
            <p style={styles.formSubtitle}>
              Enter your registered credentials to open your workspace.
            </p>
          </div>

          {notice && (
            <div style={styles.successBanner}>
              <CheckCircle2 size={18} color="var(--color-success)" style={{ flexShrink: 0 }} />
              <div style={styles.successText}>{notice}</div>
            </div>
          )}

          {error && (
            <div style={styles.errorBanner}>
              <AlertCircle size={18} color="var(--color-danger)" style={{ flexShrink: 0 }} />
              <div style={styles.errorText}>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} style={styles.form}>
            <div className="input-group">
              <label className="input-label" htmlFor="login-email">
                Email Address
              </label>
              <div style={styles.inputWrapper}>
                <Mail size={16} color="var(--color-text-muted)" style={styles.inputIcon} />
                <input
                  id="login-email"
                  type="email"
                  className="input-field"
                  style={styles.paddedInput}
                  placeholder="name@cafepos.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="login-password">
                Password
              </label>
              <div style={styles.inputWrapper}>
                <Lock size={16} color="var(--color-text-muted)" style={styles.inputIcon} />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  style={{ ...styles.paddedInput, paddingRight: '44px' }}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={submitting} style={styles.submitBtn}>
              <span>{submitting ? 'Authenticating…' : 'Sign In to Terminal'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          <p style={styles.helpText}>
            No account yet? Ask the cafe Owner to create one for you from Staff
            Management — your credentials will be sent to your email.
          </p>
        </div>
      </main>
    </div>
  )
}

const ROLE_PREVIEW = [
  {
    label: 'Owner',
    desc: 'All modules, staff accounts and permissions',
    Icon: ShieldCheck,
    color: '#626F48',
    bg: 'rgba(139, 154, 110, 0.18)',
  },
  {
    label: 'Manager',
    desc: 'Daily operations, inventory and reports',
    Icon: Grid,
    color: '#3E6B89',
    bg: 'rgba(62, 107, 137, 0.18)',
  },
  {
    label: 'Cashier',
    desc: 'Order entry, tables and billing only',
    Icon: ShoppingBag,
    color: '#B26A00',
    bg: 'rgba(178, 106, 0, 0.18)',
  },
  {
    label: 'Floor & Kitchen Staff',
    desc: 'Table status and ingredient stock',
    Icon: Package,
    color: '#2D6A4F',
    bg: 'rgba(45, 106, 79, 0.18)',
  },
]

const styles = {
  page: {
    minHeight: '100vh',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    backgroundColor: 'var(--color-bg)',
  },
  brandPanel: {
    backgroundColor: 'var(--color-surface)',
    borderRight: '1.5px solid var(--color-border)',
    padding: '48px 44px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: '40px',
  },
  brandTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  logoBadge: {
    width: '48px',
    height: '48px',
    borderRadius: '14px',
    backgroundColor: 'var(--color-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  brandName: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.3rem',
    fontWeight: '800',
    color: 'var(--color-text-main)',
    lineHeight: 1.2,
  },
  brandTagline: {
    fontSize: '0.8rem',
    color: 'var(--color-text-muted)',
  },
  heroTitle: {
    fontSize: '2.6rem',
    fontWeight: '800',
    letterSpacing: '-0.03em',
    marginBottom: '14px',
  },
  heroText: {
    fontSize: '0.95rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.65,
    maxWidth: '420px',
  },
  roleList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  roleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  roleIcon: {
    width: '34px',
    height: '34px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  roleLabel: {
    fontSize: '0.88rem',
    fontWeight: '700',
    color: 'var(--color-text-main)',
  },
  roleDesc: {
    fontSize: '0.8rem',
    color: 'var(--color-text-muted)',
  },
  formPanel: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 28px',
  },
  formCard: {
    width: '100%',
    maxWidth: '420px',
  },
  formHeader: {
    marginBottom: '24px',
  },
  formBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--color-primary-subtle)',
    color: 'var(--color-primary-active)',
    fontSize: '0.72rem',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '12px',
  },
  formTitle: {
    fontSize: '1.7rem',
    fontWeight: '800',
    letterSpacing: '-0.02em',
  },
  formSubtitle: {
    fontSize: '0.9rem',
    color: 'var(--color-text-muted)',
    marginTop: '5px',
  },
  successBanner: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '12px 14px',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--color-success-bg)',
    border: '1px solid var(--color-success)',
    marginBottom: '16px',
  },
  successText: {
    fontSize: '0.84rem',
    color: 'var(--color-success)',
    fontWeight: '600',
    lineHeight: 1.4,
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '12px 14px',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'var(--color-danger-bg)',
    border: '1px solid var(--color-danger)',
    marginBottom: '16px',
  },
  errorText: {
    fontSize: '0.84rem',
    color: 'var(--color-danger)',
    fontWeight: '600',
    lineHeight: 1.4,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '14px',
    pointerEvents: 'none',
  },
  paddedInput: {
    paddingLeft: '40px',
    width: '100%',
  },
  eyeBtn: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-text-muted)',
    minHeight: 'auto',
    padding: '4px',
  },
  submitBtn: {
    width: '100%',
    padding: '13px 20px',
    fontSize: '0.95rem',
    borderRadius: 'var(--radius-sm)',
    fontWeight: '700',
    marginTop: '4px',
  },
  helpText: {
    marginTop: '20px',
    fontSize: '0.8rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.6,
    textAlign: 'center',
  },
}
