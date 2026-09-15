import React, { useState, useEffect } from 'react'
import { 
  UserCheck, 
  Lock, 
  Key, 
  Save, 
  ShieldCheck, 
  Phone, 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Layers,
  Sparkles,
  Check,
  X
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { MODULE_DEFINITIONS } from '../../constants/permissions'

export const UserSettingsView = () => {
  const { 
    user, 
    profile, 
    role, 
    currentRoleInfo, 
    updateUserProfile, 
    updateUserPassword,
    permissionGroups 
  } = useAuth()

  // Profile Form State
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  // Password Form State
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const [toastMessage, setToastMessage] = useState(null)

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '')
      setPhone(profile.phone || '')
    }
  }, [profile])

  const showToast = (type, text) => {
    setToastMessage({ type, text })
    setTimeout(() => setToastMessage(null), 3800)
  }

  // Handle Profile Update
  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!fullName.trim()) {
      showToast('error', 'Full Name cannot be empty.')
      return
    }

    setIsSavingProfile(true)
    try {
      await updateUserProfile({
        fullName,
        phone
      })
      showToast('success', 'Profile information updated successfully!')
    } catch (err) {
      showToast('error', err.message || 'Failed to update profile.')
    } finally {
      setIsSavingProfile(false)
    }
  }

  // Handle Password Change
  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (!newPassword || newPassword.length < 6) {
      showToast('error', 'New password must be at least 6 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      showToast('error', 'New password and confirmation do not match.')
      return
    }

    setIsChangingPassword(true)
    try {
      await updateUserPassword(newPassword)
      showToast('success', 'Account password successfully updated!')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      showToast('error', err.message || 'Failed to update password.')
    } finally {
      setIsChangingPassword(false)
    }
  }

  const assignedGroup = permissionGroups.find(g => g.id === profile?.permission_group_id) || permissionGroups[0]

  return (
    <div style={styles.container}>
      {/* Floating Toast Notification */}
      {toastMessage && (
        <div style={{
          ...styles.toast,
          backgroundColor: toastMessage.type === 'error' ? 'var(--color-danger-bg)' : 'var(--color-success-bg)',
          color: toastMessage.type === 'error' ? 'var(--color-danger)' : 'var(--color-success)',
          borderColor: toastMessage.type === 'error' ? 'var(--color-danger)' : 'var(--color-success)'
        }}>
          {toastMessage.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.badge}>
          <UserCheck size={15} />
          <span>My Profile &amp; Preferences</span>
        </div>
        <h2 style={styles.title}>User Account Settings</h2>
        <p style={styles.subtitle}>
          Manage your personal staff identity, registered contact phone number, and account authentication credentials.
        </p>
      </div>

      <div style={styles.grid}>
        {/* Left Column: Profile & Security */}
        <div style={styles.leftCol}>
          {/* Card 1: Profile Information */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={styles.cardIconBox}>
                <UserCheck size={20} color="#FFFFFF" />
              </div>
              <div>
                <h3 style={styles.cardTitle}>Personal Information</h3>
                <p style={styles.cardSubtitle}>Update your display name and direct phone line</p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Email Address (Account Identifier)</label>
                <div style={styles.inputWithIcon}>
                  <Mail size={16} color="var(--color-text-muted)" style={styles.fieldIcon} />
                  <input
                    type="email"
                    value={user?.email || profile?.email || ''}
                    disabled
                    style={{ ...styles.inputDisabled, paddingLeft: '38px' }}
                  />
                </div>
                <span style={styles.hint}>Email address is linked to your verified staff profile.</span>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Full Name *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Tanvir Ahmed"
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Phone Number *</label>
                <div style={styles.inputWithIcon}>
                  <Phone size={16} color="var(--color-text-muted)" style={styles.fieldIcon} />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+880 1712 345678"
                    required
                    style={{ ...styles.input, paddingLeft: '38px' }}
                  />
                </div>
                <span style={styles.hint}>Used for staff directory records and counter shift contact.</span>
              </div>

              <button
                type="submit"
                disabled={isSavingProfile}
                style={styles.submitBtn}
              >
                <Save size={16} />
                <span>{isSavingProfile ? 'Saving Changes...' : 'Save Profile Changes'}</span>
              </button>
            </form>
          </div>

          {/* Card 2: Security & Password Change */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={{ ...styles.cardIconBox, backgroundColor: '#626F48' }}>
                <Key size={20} color="#FFFFFF" />
              </div>
              <div>
                <h3 style={styles.cardTitle}>Change Password</h3>
                <p style={styles.cardSubtitle}>Update your terminal access password securely</p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>New Password *</label>
                <div style={styles.inputWithIcon}>
                  <Lock size={16} color="var(--color-text-muted)" style={styles.fieldIcon} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 6 chars)"
                    required
                    style={{ ...styles.input, paddingLeft: '38px', paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={styles.eyeBtn}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Confirm New Password *</label>
                <div style={styles.inputWithIcon}>
                  <Lock size={16} color="var(--color-text-muted)" style={styles.fieldIcon} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                    style={{ ...styles.input, paddingLeft: '38px' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isChangingPassword || !newPassword}
                style={{
                  ...styles.submitBtn,
                  backgroundColor: '#626F48',
                  opacity: (!newPassword || isChangingPassword) ? 0.65 : 1
                }}
              >
                <Lock size={16} />
                <span>{isChangingPassword ? 'Updating Password...' : 'Update Password'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Permission Overview */}
        <div style={styles.rightCol}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={{ ...styles.cardIconBox, backgroundColor: assignedGroup?.color || 'var(--color-primary)' }}>
                <ShieldCheck size={20} color="#FFFFFF" />
              </div>
              <div>
                <h3 style={styles.cardTitle}>Role &amp; Permissions</h3>
                <p style={styles.cardSubtitle}>Your authorized terminal modules</p>
              </div>
            </div>

            {/* Role Profile Badge */}
            <div style={styles.roleSummaryBox}>
              <div style={{
                ...styles.avatarLarge,
                backgroundColor: assignedGroup?.color || 'var(--color-primary)'
              }}>
                {(profile?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={styles.userBigName}>{profile?.full_name || 'Staff User'}</div>
                <div style={styles.userRoleTag}>
                  <ShieldCheck size={13} />
                  <span>{assignedGroup?.name || currentRoleInfo?.name || 'Staff'}</span>
                </div>
              </div>
            </div>

            <p style={styles.groupDescText}>
              {assignedGroup?.description || 'Assigned access tier controlled by Super Admin.'}
            </p>

            <div style={styles.modulesHeader}>Assigned Module Access Rights:</div>
            <div style={styles.modulesList}>
              {MODULE_DEFINITIONS.map(m => {
                const rights = assignedGroup?.permissions?.[m.id] || { view: false, edit: false }
                const hasAny = rights.view || rights.edit

                return (
                  <div key={m.id} style={styles.moduleItem}>
                    <div style={styles.moduleItemLeft}>
                      <span style={styles.moduleItemTitle}>{m.label}</span>
                    </div>
                    <div style={styles.moduleItemRight}>
                      <span style={{
                        ...styles.rightBadge,
                        backgroundColor: rights.view ? 'var(--color-success-bg)' : 'rgba(125, 46, 46, 0.08)',
                        color: rights.view ? 'var(--color-success)' : 'var(--color-text-muted)'
                      }}>
                        {rights.view ? <Check size={12} /> : <X size={12} />}
                        <span>View</span>
                      </span>

                      <span style={{
                        ...styles.rightBadge,
                        backgroundColor: rights.edit ? 'rgba(98, 111, 72, 0.16)' : 'rgba(125, 46, 46, 0.08)',
                        color: rights.edit ? 'var(--color-primary-active)' : 'var(--color-text-muted)'
                      }}>
                        {rights.edit ? <Check size={12} /> : <X size={12} />}
                        <span>Control</span>
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={styles.noticeBox}>
              <Sparkles size={16} color="var(--color-primary-active)" />
              <span>Permission groups are managed exclusively by the Super Admin via the Permission Groups menu.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    maxWidth: '1240px',
    margin: '0 auto',
    padding: '0 24px 60px',
  },
  toast: {
    position: 'fixed',
    top: '80px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 24px',
    borderRadius: 'var(--radius-full)',
    border: '1.5px solid',
    boxShadow: 'var(--shadow-lg)',
    fontSize: '0.88rem',
    fontWeight: '600',
    maxWidth: '92vw',
  },
  header: {
    marginBottom: '32px',
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
    fontSize: '1.85rem',
    fontWeight: '800',
    color: 'var(--color-text-main)',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '0.94rem',
    color: 'var(--color-text-muted)',
    maxWidth: '720px',
    lineHeight: 1.55,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)',
    gap: '24px',
    alignItems: 'start',
  },
  leftCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  rightCol: {
    display: 'flex',
    flexDirection: 'column',
  },
  card: {
    backgroundColor: 'var(--color-surface)',
    border: '1.5px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '26px',
    boxShadow: 'var(--shadow-sm)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: '18px',
    marginBottom: '20px',
  },
  cardIconBox: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: 'var(--color-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardTitle: {
    fontSize: '1.15rem',
    fontWeight: '800',
    color: 'var(--color-text-main)',
  },
  cardSubtitle: {
    fontSize: '0.82rem',
    color: 'var(--color-text-muted)',
    marginTop: '2px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '0.82rem',
    fontWeight: '700',
    color: 'var(--color-text-main)',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1.5px solid var(--color-border)',
    backgroundColor: 'var(--color-bg)',
    fontSize: '0.92rem',
    color: 'var(--color-text-main)',
    outline: 'none',
  },
  inputDisabled: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1.5px solid var(--color-border)',
    backgroundColor: 'rgba(220, 211, 196, 0.25)',
    fontSize: '0.92rem',
    color: 'var(--color-text-muted)',
    cursor: 'not-allowed',
    outline: 'none',
  },
  inputWithIcon: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  fieldIcon: {
    position: 'absolute',
    left: '12px',
    pointerEvents: 'none',
  },
  eyeBtn: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    fontSize: '0.74rem',
    color: 'var(--color-text-muted)',
    marginTop: '2px',
  },
  submitBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '11px 20px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    backgroundColor: 'var(--color-primary)',
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: '0.92rem',
    cursor: 'pointer',
    marginTop: '6px',
    boxShadow: 'var(--shadow-sm)',
  },
  roleSummaryBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '14px',
    backgroundColor: 'var(--color-bg)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    marginBottom: '14px',
  },
  avatarLarge: {
    width: '46px',
    height: '46px',
    borderRadius: '50%',
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.25rem',
    fontWeight: '800',
  },
  userBigName: {
    fontSize: '1.05rem',
    fontWeight: '800',
    color: 'var(--color-text-main)',
  },
  userRoleTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '0.8rem',
    fontWeight: '700',
    color: 'var(--color-primary-active)',
    marginTop: '3px',
  },
  groupDescText: {
    fontSize: '0.84rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.5,
    marginBottom: '20px',
  },
  modulesHeader: {
    fontSize: '0.82rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: 'var(--color-text-muted)',
    marginBottom: '10px',
  },
  modulesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  moduleItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg)',
  },
  moduleItemLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  moduleItemTitle: {
    fontSize: '0.86rem',
    fontWeight: '600',
    color: 'var(--color-text-main)',
  },
  moduleItemRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  rightBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.72rem',
    fontWeight: '700',
    padding: '3px 8px',
    borderRadius: 'var(--radius-full)',
  },
  noticeBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    marginTop: '20px',
    padding: '12px',
    backgroundColor: 'rgba(98, 111, 72, 0.08)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.78rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.45,
  }
}
