import React, { useState, useEffect } from 'react'
import { X, Lock, Mail, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, Sparkles } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export const AuthModal = ({ isOpen, onClose, prefilledEmail = '', authNotice = null }) => {
  const { login, error, setError } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [localSuccess, setLocalSuccess] = useState(null)

  useEffect(() => {
    if (isOpen) {
      if (prefilledEmail) {
        setEmail(prefilledEmail)
      }
      setLocalSuccess(authNotice)
    }
  }, [isOpen, prefilledEmail, authNotice])

  if (!isOpen) return null

  const handleClose = () => {
    setError(null)
    setLocalSuccess(null)
    onClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) return

    setSubmitting(true)
    setError(null)

    try {
      await login(email, password)
      handleClose()
    } catch (err) {
      // Error handled in AuthContext
    } finally {
      setSubmitting(false)
    }
  }

  const fillAdminShortcut = () => {
    setEmail('admin@cafepos.com')
    setPassword('AdminPassword123!')
    setError(null)
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-card" style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.modalHeader}>
          <div>
            <h3 style={styles.modalTitle}>Staff Terminal Sign In</h3>
            <p style={styles.modalSubtitle}>
              Enter your registered credentials to access your station
            </p>
          </div>

          <button onClick={handleClose} style={styles.closeBtn} aria-label="Close modal">
            <X size={18} color="var(--color-text-main)" />
          </button>
        </div>

        {/* Success / Verification Banner */}
        {localSuccess && (
          <div style={styles.successBanner}>
            <CheckCircle2 size={18} color="var(--color-success)" style={{ flexShrink: 0 }} />
            <div style={styles.successText}>{localSuccess}</div>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div style={styles.errorBanner}>
            <AlertCircle size={18} color="var(--color-danger)" style={{ flexShrink: 0 }} />
            <div style={styles.errorText}>{error}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div className="input-group">
            <label className="input-label" htmlFor="user-email">
              Email Address
            </label>
            <div style={styles.inputWrapper}>
              <Mail size={16} color="var(--color-text-muted)" style={styles.inputIcon} />
              <input
                id="user-email"
                type="email"
                className="input-field"
                style={styles.paddedInput}
                placeholder="name@cafepos.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="user-pwd">
              Password
            </label>
            <div style={styles.inputWrapper}>
              <Lock size={16} color="var(--color-text-muted)" style={styles.inputIcon} />
              <input
                id="user-pwd"
                type={showPassword ? 'text' : 'password'}
                className="input-field"
                style={{ ...styles.paddedInput, paddingRight: '42px' }}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
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

          <button
            type="submit"
            className="btn-primary"
            disabled={submitting}
            style={styles.submitBtn}
          >
            <span>{submitting ? 'Authenticating...' : 'Sign In to Terminal'}</span>
            <ArrowRight size={16} />
          </button>

          {/* Quick Demo Autofill Helper */}
          <div style={styles.footerHelp}>
            <button
              type="button"
              onClick={fillAdminShortcut}
              style={styles.shortcutLink}
            >
              <Sparkles size={13} />
              <span>Autofill Super Admin Demo Account</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const styles = {
  modalCard: {
    maxWidth: '440px',
    width: '100%',
    padding: '32px 28px',
    borderRadius: '20px',
    backgroundColor: 'var(--color-surface)',
    border: '1.5px solid var(--color-border)',
    boxShadow: 'var(--shadow-lg)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
  },
  modalTitle: {
    fontSize: '1.4rem',
    fontWeight: '800',
    color: 'var(--color-text-main)',
    letterSpacing: '-0.02em',
  },
  modalSubtitle: {
    fontSize: '0.84rem',
    color: 'var(--color-text-muted)',
    marginTop: '3px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    color: 'var(--color-text-muted)',
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
    gap: '16px',
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
  },
  eyeBtn: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-text-muted)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
  },
  submitBtn: {
    width: '100%',
    padding: '12px 20px',
    fontSize: '0.94rem',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontWeight: '700',
    marginTop: '6px',
  },
  footerHelp: {
    textAlign: 'center',
    paddingTop: '6px',
  },
  shortcutLink: {
    background: 'none',
    border: 'none',
    color: 'var(--color-primary-active)',
    fontSize: '0.8rem',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 8px',
  }
}
