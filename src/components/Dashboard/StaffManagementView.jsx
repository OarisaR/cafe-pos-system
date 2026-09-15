import React, { useState, useEffect } from 'react'
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Copy, 
  Check, 
  Mail, 
  Phone, 
  Key, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  ChevronDown,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export const StaffManagementView = () => {
  const { 
    user: currentUser,
    fetchStaffMembers, 
    createStaffUser, 
    deleteStaffUser, 
    updateUserGroup,
    permissionGroups 
  } = useAuth()

  const [staffList, setStaffList] = useState([])
  const [loading, setLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createdStaffCreds, setCreatedStaffCreds] = useState(null)
  const [staffToDelete, setStaffToDelete] = useState(null)
  const [copiedKey, setCopiedKey] = useState(null)
  const [toastMessage, setToastMessage] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form State
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [initialPassword, setInitialPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [selectedGroupId, setSelectedGroupId] = useState(permissionGroups[3]?.id || permissionGroups[1]?.id || 'grp_staff')

  const showToast = (type, text) => {
    setToastMessage({ type, text })
    setTimeout(() => setToastMessage(null), 3800)
  }

  const loadStaff = async () => {
    setLoading(true)
    try {
      const data = await fetchStaffMembers()
      setStaffList(data)
    } catch (err) {
      showToast('error', 'Failed to load staff directory: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStaff()
  }, [])

  // Auto-generate strong initial password
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$'
    let pwd = 'Cafe'
    for (let i = 0; i < 6; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    pwd += '!26'
    setInitialPassword(pwd)
  }

  const handleOpenCreateModal = () => {
    setFullName('')
    setEmail('')
    setPhone('+880 17')
    generateRandomPassword()
    setSelectedGroupId(permissionGroups[3]?.id || permissionGroups[1]?.id || 'grp_staff')
    setIsCreateModalOpen(true)
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    if (!fullName.trim() || !email.trim() || !phone.trim() || !initialPassword) {
      showToast('error', 'Please fill in all staff fields.')
      return
    }

    if (initialPassword.length < 6) {
      showToast('error', 'Initial password must be at least 6 characters.')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await createStaffUser({
        fullName,
        email,
        phone,
        initialPassword,
        groupId: selectedGroupId
      })

      showToast('success', `Staff member ${fullName} created! Confirmation email dispatched.`)
      setIsCreateModalOpen(false)
      setCreatedStaffCreds({
        ...result,
        initialPassword
      })
      await loadStaff()
    } catch (err) {
      showToast('error', err.message || 'Failed to create staff member.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteStaff = async () => {
    if (!staffToDelete) return
    const idToDelete = staffToDelete.id
    const nameToDelete = staffToDelete.full_name || staffToDelete.email

    // Optimistically update the staff directory table immediately
    setStaffList(prev => prev.filter(s => s.id !== idToDelete))
    setStaffToDelete(null)
    showToast('success', `Staff record for ${nameToDelete} removed.`)

    try {
      await deleteStaffUser(idToDelete)
    } catch (err) {
      showToast('error', err.message || 'Failed to delete staff.')
      await loadStaff()
    }
  }

  const handleGroupChange = async (staffId, newGroupId) => {
    try {
      await updateUserGroup(staffId, newGroupId)
      showToast('success', 'Permission group updated successfully.')
      await loadStaff()
    } catch (err) {
      showToast('error', err.message || 'Failed to update group.')
    }
  }

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const copyAllCredentials = () => {
    if (!createdStaffCreds) return
    const text = `Cafe POS Staff Account Credentials:\nFull Name: ${createdStaffCreds.full_name}\nEmail: ${createdStaffCreds.email}\nPhone: ${createdStaffCreds.phone}\nInitial Password: ${createdStaffCreds.initialPassword}\nAssigned Group: ${createdStaffCreds.group_name}\n\nPlease click the confirmation link sent to your email to verify your account, then sign in.`
    copyToClipboard(text, 'all')
  }

  return (
    <div style={styles.container}>
      {/* Toast Notification */}
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
        <div>
          <div style={styles.badge}>
            <Users size={15} />
            <span>Super Admin Personnel Control</span>
          </div>
          <h2 style={styles.title}>Staff / User Management</h2>
          <p style={styles.subtitle}>
            Register cafe team members, generate email verification invites with initial passwords, and dynamically bind them to custom permission groups.
          </p>
        </div>

        <div style={styles.headerActions}>
          <button 
            onClick={loadStaff} 
            style={styles.refreshBtn}
            title="Refresh list"
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'spin-anim' : ''} />
            <span>Refresh</span>
          </button>

          <button onClick={handleOpenCreateModal} style={styles.createBtn}>
            <UserPlus size={18} />
            <span>+ Create Staff &amp; Send Invite</span>
          </button>
        </div>
      </div>

      {/* Staff Table Section */}
      <div style={styles.tableCard}>
        <div style={styles.tableHeader}>
          <div>
            <h3 style={styles.tableTitle}>Staff Directory ({staffList.length} members)</h3>
            <p style={styles.tableDesc}>Active personnel directory, module permissions, and terminal access</p>
          </div>
        </div>

        {loading ? (
          <div style={styles.emptyState}>
            <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary)' }} />
            <p style={{ marginTop: '12px', color: 'var(--color-text-muted)' }}>Loading staff directory...</p>
          </div>
        ) : staffList.length === 0 ? (
          <div style={styles.emptyState}>
            <Users size={44} color="var(--color-text-muted)" />
            <p style={{ marginTop: '12px', fontSize: '1rem', fontWeight: '600' }}>No staff members created yet</p>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', maxWidth: '380px', marginTop: '6px' }}>
              Click "+ Create Staff &amp; Send Invite" above to register cashiers, shift managers, and inventory staff with automatic email confirmation.
            </p>
          </div>
        ) : (
          <div style={styles.tableResponsive}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.trHead}>
                  <th style={styles.th}>Staff Member</th>
                  <th style={styles.th}>Phone Number</th>
                  <th style={styles.th}>Assigned Role</th>
                  <th style={styles.th}>Joined Date</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map((st) => {
                  const group = permissionGroups.find(g => g.id === st.permission_group_id) || permissionGroups[1] || permissionGroups[0]
                  const isCurrent = currentUser?.id === st.id

                  return (
                    <tr key={st.id} style={styles.trBody}>
                      {/* Name & Email */}
                      <td style={styles.td}>
                        <div style={styles.userCell}>
                          <div style={{
                            ...styles.avatar,
                            backgroundColor: group?.color || 'var(--color-primary)'
                          }}>
                            {(st.full_name || st.email || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={styles.userName}>
                              {st.full_name || 'Staff User'}
                              {isCurrent && <span style={styles.youBadge}>You (Current)</span>}
                            </div>
                            <div style={styles.userEmail}>
                              <Mail size={12} style={{ marginRight: '4px', verticalAlign: '-1px' }} />
                              {st.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td style={styles.td}>
                        <div style={styles.phoneCell}>
                          <Phone size={14} color="var(--color-text-muted)" />
                          <span>{st.phone || 'N/A'}</span>
                        </div>
                      </td>

                      {/* Assigned Role (Permission Group Dropdown) */}
                      <td style={styles.td}>
                        <select
                          value={st.permission_group_id || 'grp_staff'}
                          onChange={(e) => handleGroupChange(st.id, e.target.value)}
                          style={{
                            ...styles.groupSelect,
                            backgroundColor: group?.bgColor || 'rgba(98, 111, 72, 0.12)',
                            borderColor: group?.color || 'var(--color-border)',
                            color: group?.color || 'var(--color-primary-active)'
                          }}
                        >
                          {permissionGroups.map(g => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Date */}
                      <td style={styles.td}>
                        <span style={styles.dateText}>
                          {st.created_at ? new Date(st.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ ...styles.td, textAlign: 'right' }}>
                        <div style={styles.actionButtons}>
                          <button
                            onClick={() => {
                              const credsText = `Cafe POS Credentials:\nName: ${st.full_name}\nEmail: ${st.email}\nPhone: ${st.phone}\nGroup: ${group?.name}`
                              copyToClipboard(credsText, `row_${st.id}`)
                            }}
                            style={styles.actionBtn}
                            title="Copy staff info"
                          >
                            {copiedKey === `row_${st.id}` ? <Check size={15} color="var(--color-success)" /> : <Copy size={15} />}
                          </button>

                          <button
                            onClick={() => setStaffToDelete(st)}
                            disabled={isCurrent}
                            style={{
                              ...styles.actionBtn,
                              color: isCurrent ? 'var(--color-border)' : 'var(--color-danger)',
                              cursor: isCurrent ? 'not-allowed' : 'pointer'
                            }}
                            title={isCurrent ? 'Cannot delete your own account' : 'Delete staff record'}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create Staff & Send Email Invite */}
      {isCreateModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <div style={styles.modalHeaderLeft}>
                <div style={styles.modalIconBox}>
                  <UserPlus size={22} color="#FFFFFF" />
                </div>
                <div>
                  <h3 style={styles.modalTitle}>Create Staff &amp; Send Email Invite</h3>
                  <p style={styles.modalSubtitle}>An account verification email will be dispatched to the user</p>
                </div>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} style={styles.closeBtn}>×</button>
            </div>

            <form onSubmit={handleCreateSubmit} style={styles.modalForm}>
              {/* Full Name */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Tanvir Ahmed"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  style={styles.input}
                />
              </div>

              {/* Email Address */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Email Address *</label>
                <div style={styles.inputWithIcon}>
                  <Mail size={16} color="var(--color-text-muted)" style={styles.fieldIcon} />
                  <input
                    type="email"
                    placeholder="e.g. tanvir@cafepos.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{ ...styles.input, paddingLeft: '38px' }}
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Phone Number (Staff Record) *</label>
                <div style={styles.inputWithIcon}>
                  <Phone size={16} color="var(--color-text-muted)" style={styles.fieldIcon} />
                  <input
                    type="tel"
                    placeholder="+880 1712 345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    style={{ ...styles.input, paddingLeft: '38px' }}
                  />
                </div>
              </div>

              {/* Initial Temporary Password with Generator */}
              <div style={styles.formGroup}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={styles.label}>Initial Password (User Receives This) *</label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    style={styles.genBtn}
                  >
                    <Key size={13} />
                    <span>Generate Strong</span>
                  </button>
                </div>

                <div style={styles.inputWithIcon}>
                  <Lock size={16} color="var(--color-text-muted)" style={styles.fieldIcon} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={initialPassword}
                    onChange={(e) => setInitialPassword(e.target.value)}
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
                <span style={styles.fieldHint}>
                  User can change this password anytime inside their User Settings.
                </span>
              </div>

              {/* Assigned Role / Permission Group */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Assign Role (Permission Group) *</label>
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  style={styles.selectInput}
                >
                  {permissionGroups.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.name} — {g.description ? g.description.substring(0, 60) + '...' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Modal Buttons */}
              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={styles.submitBtn}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={16} className="spin-anim" />
                      <span>Sending Invite...</span>
                    </>
                  ) : (
                    <>
                      <Mail size={16} />
                      <span>Send Invite &amp; Create Account</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Card Modal: Copy Credentials */}
      {createdStaffCreds && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalCard, maxWidth: '520px' }}>
            <div style={{ ...styles.modalHeader, borderBottom: 'none', paddingBottom: '8px' }}>
              <div style={styles.modalHeaderLeft}>
                <div style={{ ...styles.modalIconBox, backgroundColor: 'var(--color-success)' }}>
                  <CheckCircle2 size={24} color="#FFFFFF" />
                </div>
                <div>
                  <h3 style={styles.modalTitle}>Staff Account Created!</h3>
                  <p style={styles.modalSubtitle}>Verification &amp; invitation email has been dispatched</p>
                </div>
              </div>
              <button onClick={() => setCreatedStaffCreds(null)} style={styles.closeBtn}>×</button>
            </div>

            <div style={styles.credsBox}>
              <div style={styles.credsNotice}>
                <Mail size={16} color="var(--color-primary-active)" />
                <span>
                  A confirmation email with verification link and the initial password below was dispatched to <strong>{createdStaffCreds.email}</strong>. 
                  When the user clicks the confirmation link, it directs them straight to the terminal sign-in page.
                </span>
              </div>

              <div style={styles.credRow}>
                <span style={styles.credLabel}>Full Name:</span>
                <span style={styles.credValue}>{createdStaffCreds.full_name}</span>
              </div>
              <div style={styles.credRow}>
                <span style={styles.credLabel}>Email / Login:</span>
                <span style={styles.credValue}>{createdStaffCreds.email}</span>
              </div>
              <div style={styles.credRow}>
                <span style={styles.credLabel}>Phone Number:</span>
                <span style={styles.credValue}>{createdStaffCreds.phone}</span>
              </div>
              <div style={styles.credRow}>
                <span style={styles.credLabel}>Assigned Group:</span>
                <span style={{ ...styles.credValue, fontWeight: '700', color: 'var(--color-primary-active)' }}>
                  {createdStaffCreds.group_name}
                </span>
              </div>
              <div style={{ ...styles.credRow, backgroundColor: 'rgba(98, 111, 72, 0.08)', padding: '10px 14px', borderRadius: '8px' }}>
                <span style={styles.credLabel}>Initial Password:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <code style={styles.codeText}>{createdStaffCreds.initialPassword}</code>
                  <button
                    onClick={() => copyToClipboard(createdStaffCreds.initialPassword, 'pwd_box')}
                    style={styles.iconMiniBtn}
                    title="Copy Password"
                  >
                    {copiedKey === 'pwd_box' ? <Check size={14} color="var(--color-success)" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>

            <div style={styles.modalActions}>
              <button
                onClick={copyAllCredentials}
                style={styles.copyAllBtn}
              >
                {copiedKey === 'all' ? <Check size={16} color="var(--color-success)" /> : <Copy size={16} />}
                <span>{copiedKey === 'all' ? 'Copied!' : 'Copy Invitation Info'}</span>
              </button>
              <button
                onClick={() => setCreatedStaffCreds(null)}
                style={styles.submitBtn}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {staffToDelete && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalCard, maxWidth: '440px' }}>
            <div style={styles.modalHeader}>
              <div style={styles.modalHeaderLeft}>
                <div style={{ ...styles.modalIconBox, backgroundColor: 'var(--color-danger)' }}>
                  <Trash2 size={22} color="#FFFFFF" />
                </div>
                <div>
                  <h3 style={styles.modalTitle}>Remove Staff Record</h3>
                  <p style={styles.modalSubtitle}>Irreversible Super Admin action</p>
                </div>
              </div>
              <button onClick={() => setStaffToDelete(null)} style={styles.closeBtn}>×</button>
            </div>

            <p style={{ fontSize: '0.94rem', color: 'var(--color-text-main)', margin: '16px 0', lineHeight: 1.5 }}>
              Are you sure you want to delete staff account <strong>{staffToDelete.full_name || staffToDelete.email}</strong>?
              They will immediately lose terminal access.
            </p>

            <div style={styles.modalActions}>
              <button onClick={() => setStaffToDelete(null)} style={styles.cancelBtn}>
                Cancel
              </button>
              <button onClick={handleDeleteStaff} style={styles.dangerBtn}>
                Yes, Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
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
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '20px',
    marginBottom: '32px',
    flexWrap: 'wrap',
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
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: '6px',
  },
  refreshBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 18px',
    borderRadius: 'var(--radius-sm)',
    border: '1.5px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text-main)',
    fontWeight: '600',
    fontSize: '0.88rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  createBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 22px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    backgroundColor: 'var(--color-primary)',
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: '0.92rem',
    cursor: 'pointer',
    boxShadow: 'var(--shadow-sm)',
    transition: 'background 0.2s',
  },
  tableCard: {
    backgroundColor: 'var(--color-surface)',
    border: '1.5px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-sm)',
  },
  tableHeader: {
    padding: '24px 28px',
    borderBottom: '1px solid var(--color-border)',
  },
  tableTitle: {
    fontSize: '1.2rem',
    fontWeight: '700',
    color: 'var(--color-text-main)',
    marginBottom: '4px',
  },
  tableDesc: {
    fontSize: '0.85rem',
    color: 'var(--color-text-muted)',
  },
  tableResponsive: {
    width: '100%',
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  trHead: {
    backgroundColor: 'var(--color-bg)',
    borderBottom: '1.5px solid var(--color-border)',
  },
  th: {
    padding: '14px 20px',
    fontSize: '0.78rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--color-text-muted)',
  },
  trBody: {
    borderBottom: '1px solid var(--color-border)',
    transition: 'background 0.15s',
  },
  td: {
    padding: '16px 20px',
    fontSize: '0.9rem',
    color: 'var(--color-text-main)',
    verticalAlign: 'middle',
  },
  userCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatar: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '0.95rem',
    flexShrink: 0,
  },
  userName: {
    fontWeight: '700',
    color: 'var(--color-text-main)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  youBadge: {
    fontSize: '0.68rem',
    padding: '2px 6px',
    backgroundColor: 'rgba(98, 111, 72, 0.15)',
    color: 'var(--color-primary-active)',
    borderRadius: '4px',
    fontWeight: '700',
  },
  userEmail: {
    fontSize: '0.8rem',
    color: 'var(--color-text-muted)',
    marginTop: '2px',
  },
  phoneCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.86rem',
    fontWeight: '500',
  },
  groupSelect: {
    padding: '6px 10px',
    borderRadius: 'var(--radius-sm)',
    border: '1.5px solid',
    fontSize: '0.84rem',
    fontWeight: '700',
    cursor: 'pointer',
    outline: 'none',
  },
  rolePill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.74rem',
    fontWeight: '700',
    letterSpacing: '0.04em',
  },
  dateText: {
    fontSize: '0.82rem',
    color: 'var(--color-text-muted)',
  },
  actionButtons: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '8px',
  },
  actionBtn: {
    width: '32px',
    height: '32px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text-main)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  emptyState: {
    padding: '56px 20px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Modal styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(34, 42, 30, 0.65)',
    backdropFilter: 'blur(4px)',
    zIndex: 1100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    animation: 'fadeIn 0.2s ease',
  },
  modalCard: {
    backgroundColor: 'var(--color-surface)',
    borderRadius: 'var(--radius-lg)',
    border: '1.5px solid var(--color-border)',
    boxShadow: 'var(--shadow-lg)',
    width: '100%',
    maxWidth: '540px',
    padding: '28px',
    animation: 'scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: '18px',
    marginBottom: '20px',
  },
  modalHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  modalIconBox: {
    width: '42px',
    height: '42px',
    borderRadius: '10px',
    backgroundColor: 'var(--color-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  modalTitle: {
    fontSize: '1.2rem',
    fontWeight: '800',
    color: 'var(--color-text-main)',
  },
  modalSubtitle: {
    fontSize: '0.82rem',
    color: 'var(--color-text-muted)',
    marginTop: '2px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    lineHeight: 1,
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
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
  genBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--color-primary-active)',
    fontSize: '0.78rem',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 4px',
  },
  fieldHint: {
    fontSize: '0.74rem',
    color: 'var(--color-text-muted)',
    marginTop: '2px',
  },
  selectInput: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1.5px solid var(--color-border)',
    backgroundColor: 'var(--color-bg)',
    fontSize: '0.9rem',
    color: 'var(--color-text-main)',
    fontWeight: '600',
    outline: 'none',
    cursor: 'pointer',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '10px',
  },
  cancelBtn: {
    padding: '10px 20px',
    borderRadius: 'var(--radius-sm)',
    border: '1.5px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text-main)',
    fontWeight: '600',
    fontSize: '0.88rem',
    cursor: 'pointer',
  },
  submitBtn: {
    padding: '10px 22px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    backgroundColor: 'var(--color-primary)',
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: '0.9rem',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  },
  dangerBtn: {
    padding: '10px 20px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    backgroundColor: 'var(--color-danger)',
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: '0.88rem',
    cursor: 'pointer',
  },
  credsBox: {
    backgroundColor: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  credsNotice: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    fontSize: '0.82rem',
    color: 'var(--color-text-main)',
    lineHeight: 1.45,
    backgroundColor: 'rgba(98, 111, 72, 0.1)',
    padding: '10px 12px',
    borderRadius: '6px',
  },
  credRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.88rem',
  },
  credLabel: {
    color: 'var(--color-text-muted)',
    fontWeight: '600',
  },
  credValue: {
    color: 'var(--color-text-main)',
    fontWeight: '600',
  },
  codeText: {
    fontFamily: 'monospace',
    fontWeight: '700',
    fontSize: '0.92rem',
    backgroundColor: 'var(--color-surface)',
    padding: '3px 8px',
    borderRadius: '4px',
    border: '1px solid var(--color-border)',
    color: 'var(--color-primary-active)',
  },
  iconMiniBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
  },
  copyAllBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 18px',
    borderRadius: 'var(--radius-sm)',
    border: '1.5px solid var(--color-primary)',
    backgroundColor: 'rgba(98, 111, 72, 0.08)',
    color: 'var(--color-primary-active)',
    fontWeight: '700',
    fontSize: '0.88rem',
    cursor: 'pointer',
  }
}
