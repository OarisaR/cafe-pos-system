import React, { useState, useEffect } from 'react'
import { X, Lock, Mail, Eye, EyeOff, UserCheck, AlertCircle, ArrowRight } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import confetti from 'canvas-confetti'

export const AuthModal = ({ isOpen, onClose, initialRole = 'cashier' }) => {
  const { login, error, setError } = useAuth()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedRole, setSelectedRole] = useState(initialRole)

  // Populate credentials based on role without auto-submitting
  const fillOwnerCredentials = () => {
    setSelectedRole('admin')
    setIdentifier('admin@cafepos.com')
    setPassword('AdminPassword123!')
    setError(null)
  }

  const fillCashierCredentials = () => {
    setSelectedRole('cashier')
    setIdentifier('cashier@cafepos.com')
    setPassword('CashierPassword123!')
    setError(null)
  }

  // Pre-populate on modal open
  useEffect(() => {
    if (isOpen) {
      if (initialRole === 'admin') {
        fillOwnerCredentials()
      } else {
        fillCashierCredentials()
      }
    }
  }, [isOpen, initialRole])

  if (!isOpen) return null

  const handleClose = () => {
    setError(null)
    onClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!identifier || !password) return

    setSubmitting(true)
    try {
      await login(identifier, password)
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } })
      handleClose()
    } catch (err) {
      // Error is set in AuthContext
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-card" style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.modalHeader}>
          <div>
            <h3 style={styles.modalTitle}>Staff Sign In</h3>
            <p style={styles.modalSubtitle}>L'Aroma Cafe POS Terminal</p>
          </div>

          <button onClick={handleClose} style={styles.closeBtn} aria-label="Close modal">
            <X size={18} color="var(--color-text-main)" />
          </button>
        </div>

        {/* Role Selector Tabs (Auto-fills Credentials on Click) */}
        <div style={styles.demoButtonsRow}>
          <button
            type="button"
            onClick={fillOwnerCredentials}
            style={{
              ...styles.demoBtn,
              backgroundColor: selectedRole === 'admin' ? 'var(--color-primary)' : 'var(--color-surface)',
              color: selectedRole === 'admin' ? '#FFFFFF' : 'var(--color-text-main)',
              borderColor: selectedRole === 'admin' ? 'var(--color-primary)' : 'var(--color-border)',
            }}
          >
            <UserCheck size={14} />
            <span>Owner Account</span>
          </button>

          <button
            type="button"
            onClick={fillCashierCredentials}
            style={{
              ...styles.demoBtn,
              backgroundColor: selectedRole === 'cashier' ? 'var(--color-primary)' : 'var(--color-surface)',
              color: selectedRole === 'cashier' ? '#FFFFFF' : 'var(--color-text-main)',
              borderColor: selectedRole === 'cashier' ? 'var(--color-primary)' : 'var(--color-border)',
            }}
          >
            <UserCheck size={14} />
            <span>Cashier Account</span>
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div style={styles.errorBanner}>
            <AlertCircle size={16} color="var(--color-danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={styles.errorText}>{error}</div>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div className="input-group">
            <label className="input-label" htmlFor="user-ident">
              Email or Username
            </label>
            <div style={styles.inputWrapper}>
              <Mail size={16} color="var(--color-text-muted)" style={styles.inputIcon} />
              <input
                id="user-ident"
                type="text"
                className="input-field"
                style={styles.paddedInput}
                placeholder="email@cafepos.com or username"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value)
                  setSelectedRole(null)
                }}
                required
                autoFocus
              />
            </div>
          </div>

          <div className="input-group" style={{ marginBottom: '24px' }}>
            <label className="input-label" htmlFor="user-pwd">
              Password
            </label>
            <div style={styles.inputWrapper}>
              <Lock size={16} color="var(--color-text-muted)" style={styles.inputIcon} />
              <input
                id="user-pwd"
                type={showPassword ? 'text' : 'password'}
                className="input-field"
                style={{ ...styles.paddedInput, paddingRight: '40px' }}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setSelectedRole(null)
                }}
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
            {submitting ? (
              <span>Signing In...</span>
            ) : (
              <>
                <span>Sign In to Terminal</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

const styles = {
  modalCard: {
    backgroundColor: 'var(--color-bg)',
    padding: '28px 26px',
    borderRadius: '20px',
    maxWidth: '420px',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '20px',
  },
  modalTitle: {
    fontSize: '1.3rem',
    color: 'var(--color-text-main)',
    fontWeight: '700',
    lineHeight: 1.2,
  },
  modalSubtitle: {
    fontSize: '0.82rem',
    color: 'var(--color-text-muted)',
    marginTop: '3px',
  },
  closeBtn: {
    minHeight: '32px',
    width: '32px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  demoButtonsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
    marginBottom: '22px',
  },
  demoBtn: {
    minHeight: '38px',
    padding: '8px 12px',
    border: '1px solid var(--color-border)',
    fontSize: '0.8rem',
    fontWeight: '600',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    transition: 'all var(--transition-fast)',
    cursor: 'pointer',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    backgroundColor: 'var(--color-danger-bg)',
    border: '1px solid rgba(192, 57, 43, 0.25)',
    borderRadius: 'var(--radius-md)',
    padding: '10px 12px',
    marginBottom: '16px',
  },
  errorText: {
    fontSize: '0.82rem',
    color: 'var(--color-danger)',
    fontWeight: '600',
    lineHeight: 1.35,
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
    width: '100%',
    paddingLeft: '40px',
  },
  eyeBtn: {
    position: 'absolute',
    right: '8px',
    minHeight: '32px',
    width: '32px',
    padding: 0,
    color: 'var(--color-text-muted)',
  },
  submitBtn: {
    width: '100%',
    padding: '13px',
    fontSize: '0.95rem',
    borderRadius: 'var(--radius-md)',
  }
}
