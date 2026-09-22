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
  Clock,
  Lock,
  Eye,
  EyeOff,
  Search,
  UserCheck,
  UserX,
  Sparkles,
  Layers
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

/** Supabase timestamptz → "17 Sep 2026, 02:15 PM" (Asia/Dhaka) */
const formatStamp = (value) => {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-GB', {
    timeZone: 'Asia/Dhaka',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const StaffManagementView = () => {
  const { 
    user: currentUser,
    fetchStaffMembers, 
    createStaffUser, 
    deleteStaffUser, 
    updateUserGroup,
    updateStaffPhone,
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
  const [searchQuery, setSearchQuery] = useState('')
  const [phoneEditingStaff, setPhoneEditingStaff] = useState(null)
  const [editingPhoneInput, setEditingPhoneInput] = useState('')
  const [isSavingPhone, setIsSavingPhone] = useState(false)

  // Form State
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [initialPassword, setInitialPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [selectedGroupId, setSelectedGroupId] = useState(permissionGroups[3]?.id || permissionGroups[1]?.id || '')

  const showToast = (type, text) => {
    setToastMessage({ type, text })
    setTimeout(() => setToastMessage(null), 3800)
  }

  const loadStaff = async () => {
    setLoading(true)
    try {
      const data = await fetchStaffMembers()
      setStaffList(data || [])
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
    setSelectedGroupId(permissionGroups[3]?.id || permissionGroups[1]?.id || '')
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
        groupId: selectedGroupId || null
      })

      showToast('success', `Staff member ${fullName} registered! Verification email dispatched.`)
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

  // Moving someone into a permission group also rewrites their role in the
  // database — the group is the single control for what a member can do.
  const handleGroupChange = async (staffId, newGroupId) => {
    if (!newGroupId) return
    const group = permissionGroups.find(g => g.id === newGroupId)
    try {
      const { role, authMetadataSynced } = await updateUserGroup(staffId, newGroupId)

      if (authMetadataSynced) {
        showToast('success', `Moved to "${group?.name}" — role is now "${role}".`)
      } else {
        // profiles.role বদলে গেছে, কিন্তু auth.users metadata পুরনোই রয়ে গেছে
        showToast(
          'error',
          `Saved role "${role}" to the profiles table, but the auth user metadata ` +
          `is not fully updated. Run supabase_fix_group_sync.sql once in the Supabase ` +
          `SQL Editor to enable the set_user_group() function.`
        )
      }
      await loadStaff()
    } catch (err) {
      showToast('error', err.message || 'Failed to update permission group.')
    }
  }

  const handleSavePhone = async (e) => {
    e.preventDefault()
    if (!phoneEditingStaff) return
    setIsSavingPhone(true)
    try {
      await updateStaffPhone(phoneEditingStaff.id, editingPhoneInput)
      showToast('success', `Phone number for ${phoneEditingStaff.full_name || phoneEditingStaff.email} updated!`)
      setPhoneEditingStaff(null)
      await loadStaff()
    } catch (err) {
      showToast('error', err.message || 'Failed to update phone number.')
    } finally {
      setIsSavingPhone(false)
    }
  }

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const copyAllCredentials = () => {
    if (!createdStaffCreds) return
    const text = `Cafe POS Staff Account Credentials:\nFull Name: ${createdStaffCreds.full_name}\nEmail: ${createdStaffCreds.email}\nPhone: ${createdStaffCreds.phone}\nInitial Password: ${createdStaffCreds.initialPassword}\nAssigned Role: ${createdStaffCreds.group_name || 'Unassigned'}\n\nPlease click the confirmation link sent to your email to verify your account, then sign in.`
    copyToClipboard(text, 'all')
  }

  // Filter staff by search query
  const filteredStaff = staffList.filter(s => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    const name = (s.full_name || '').toLowerCase()
    const email = (s.email || '').toLowerCase()
    const phone = (s.phone || '').toLowerCase()
    const group = permissionGroups.find(g => g.id === s.permission_group_id)
    const roleName = (group?.name || 'unassigned').toLowerCase()
    return name.includes(q) || email.includes(q) || phone.includes(q) || roleName.includes(q)
  })

  // Metric stats
  const totalStaff = staffList.length
  const confirmedCount = staffList.filter(s => s.is_confirmed).length
  const pendingCount = staffList.filter(s => !s.is_confirmed).length
  const rolesCount = permissionGroups.length

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

      {/* Header Banner with Blended Minimal Aesthetic Image */}
      <div style={styles.headerBanner}>
        {/* Blended Background Image Layer - No separate box */}
        <div style={styles.headerBlendWrapper}>
          <img 
            src="/images/staff_workspace.jpg" 
            alt="Cafe Shift Roster" 
            style={styles.headerBlendImg}
            loading="lazy"
          />
          <div style={styles.headerBlendGradient} />
        </div>

        <div style={styles.headerTextCol}>
          <div style={styles.badge}>
            <Users size={14} />
            <span>Personnel &amp; Access Governance</span>
          </div>
          <h2 style={styles.title}>Staff / User Management</h2>
          <p style={styles.subtitle}>
            Manage your cafe workforce, assign modular permission roles, and track verification status.
          </p>

          <div style={styles.headerActions}>
            <button 
              onClick={loadStaff} 
              style={styles.refreshBtn}
              title="Refresh directory"
              disabled={loading}
            >
              <RefreshCw size={15} className={loading ? 'spin-anim' : ''} />
              <span>Refresh Directory</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Metric Cards */}
      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIconBox, backgroundColor: 'rgba(98, 111, 72, 0.12)', color: 'var(--color-primary-active)' }}>
            <Users size={18} />
          </div>
          <div>
            <div style={styles.statValue}>{totalStaff}</div>
            <div style={styles.statLabel}>Total Staff Members</div>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={{ ...styles.statIconBox, backgroundColor: 'rgba(46, 125, 50, 0.12)', color: '#2E7D32' }}>
            <UserCheck size={18} />
          </div>
          <div>
            <div style={styles.statValue}>{confirmedCount}</div>
            <div style={styles.statLabel}>Verified &amp; Active</div>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={{ ...styles.statIconBox, backgroundColor: 'rgba(178, 106, 0, 0.12)', color: '#B26A00' }}>
            <Clock size={18} />
          </div>
          <div>
            <div style={styles.statValue}>{pendingCount}</div>
            <div style={styles.statLabel}>Awaiting Confirmation</div>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={{ ...styles.statIconBox, backgroundColor: 'rgba(62, 107, 137, 0.12)', color: '#3E6B89' }}>
            <Layers size={18} />
          </div>
          <div>
            <div style={styles.statValue}>{rolesCount}</div>
            <div style={styles.statLabel}>Active Role Profiles</div>
          </div>
        </div>
      </div>

      {/* Staff Table Section */}
      <div style={styles.tableCard}>
        <div style={styles.tableToolbar}>
          <div>
            <h3 style={styles.tableTitle}>Staff Directory</h3>
            <p style={styles.tableDesc}>Active personnel directory, assigned role boundaries, and credentials</p>
          </div>

          <div style={styles.toolbarActions}>
            {/* Quick Search */}
            <div style={styles.searchWrapper}>
              <Search size={15} color="var(--color-text-muted)" style={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search by name, email, role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
              />
            </div>

            {/* Create Staff Member Button next to search */}
            <button onClick={handleOpenCreateModal} style={styles.createBtn}>
              <UserPlus size={16} />
              <span>+ Create Staff Member</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div style={styles.emptyState}>
            <RefreshCw size={30} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary)' }} />
            <p style={{ marginTop: '12px', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Loading staff directory...</p>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div style={styles.emptyState}>
            <Users size={40} color="var(--color-text-muted)" />
            <p style={{ marginTop: '12px', fontSize: '1rem', fontWeight: '700' }}>
              {searchQuery ? 'No matching staff found' : 'No staff members registered yet'}
            </p>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.86rem', maxWidth: '360px', marginTop: '6px' }}>
              {searchQuery ? 'Try adjusting your search keywords' : 'Click "+ Create Staff Member" above to invite cashiers and managers.'}
            </p>
          </div>
        ) : (
          <div style={styles.tableResponsive}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.trHead}>
                  <th style={styles.th}>Staff Member</th>
                  <th style={styles.th}>Phone Number</th>
                  <th style={styles.th}>Permission Group</th>
                  <th style={styles.th}>Confirmation</th>
                  <th style={styles.th}>Created / Updated</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((st) => {
                  const group = permissionGroups.find(g => g.id === st.permission_group_id) || null
                  const isCurrent = currentUser?.id === st.id

                  return (
                    <tr key={st.id} style={styles.trBody}>
                      {/* Name & Email */}
                      <td style={styles.td}>
                        <div style={styles.userCell}>
                          <div style={{
                            ...styles.avatar,
                            backgroundColor: group?.color || '#7A7A7A'
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

                      {/* Phone Number with Click-to-Edit */}
                      <td style={styles.td}>
                        <div 
                          style={styles.phoneClickable}
                          onClick={() => {
                            setPhoneEditingStaff(st)
                            setEditingPhoneInput(st.phone || '+880 17')
                          }}
                          title="Click to edit or set phone number"
                        >
                          <Phone size={13} color="var(--color-primary-active)" />
                          <span style={st.phone ? styles.phoneText : styles.phoneEmptyText}>
                            {st.phone || '+ Add phone'}
                          </span>
                        </div>
                      </td>

                      {/* Assigned Role (Permission Group Dropdown) */}
                      <td style={styles.td}>
                        <select
                          value={st.permission_group_id || ''}
                          onChange={(e) => handleGroupChange(st.id, e.target.value)}
                          style={{
                            ...styles.groupSelect,
                            backgroundColor: group ? (group.bgColor || 'rgba(98, 111, 72, 0.12)') : 'rgba(0, 0, 0, 0.04)',
                            borderColor: group ? (group.color || 'var(--color-border)') : 'var(--color-border)',
                            color: group ? (group.color || 'var(--color-primary-active)') : 'var(--color-text-muted)',
                            fontWeight: group ? '700' : '500',
                          }}
                        >
                          {/* Legacy rows may have no group yet — show it, but it
                              cannot be re-selected, so every member ends up in a group. */}
                          {!group && (
                            <option value="" disabled>
                              -- No Group Assigned --
                            </option>
                          )}
                          {permissionGroups.map(g => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Confirmation Status */}
                      <td style={styles.td}>
                        {st.is_confirmed ? (
                          <span style={styles.confirmedBadge}>
                            <CheckCircle2 size={13} />
                            <span>Confirmed</span>
                          </span>
                        ) : (
                          <span style={styles.pendingBadge}>
                            <Clock size={13} />
                            <span>Pending Invite</span>
                          </span>
                        )}
                      </td>

                      {/* Timestamps — Supabase এর created_at / updated_at */}
                      <td style={styles.td}>
                        <span style={styles.dateText}>{formatStamp(st.created_at)}</span>
                        <div style={styles.roleRawText}>
                          updated: {formatStamp(st.updated_at)}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ ...styles.td, textAlign: 'right' }}>
                        <div style={styles.actionButtons}>
                          <button
                            onClick={() => {
                              const credsText = `Cafe POS Credentials:\nName: ${st.full_name}\nEmail: ${st.email}\nPhone: ${st.phone || 'N/A'}\nRole: ${group?.name || 'Unassigned'}`
                              copyToClipboard(credsText, `row_${st.id}`)
                            }}
                            style={styles.actionBtn}
                            title="Copy staff credentials info"
                          >
                            {copiedKey === `row_${st.id}` ? <Check size={14} color="var(--color-success)" /> : <Copy size={14} />}
                          </button>

                          <button
                            onClick={() => setStaffToDelete(st)}
                            disabled={isCurrent}
                            style={{
                              ...styles.actionBtn,
                              color: isCurrent ? 'var(--color-border)' : 'var(--color-danger)',
                              cursor: isCurrent ? 'not-allowed' : 'pointer'
                            }}
                            title={isCurrent ? 'Cannot delete your own active account' : 'Delete staff record'}
                          >
                            <Trash2 size={14} />
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
                  <UserPlus size={20} color="#FFFFFF" />
                </div>
                <div>
                  <h3 style={styles.modalTitle}>Create Staff &amp; Send Invite</h3>
                  <p style={styles.modalSubtitle}>An account verification link will be dispatched to their inbox</p>
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
                  <Mail size={15} color="var(--color-text-muted)" style={styles.fieldIcon} />
                  <input
                    type="email"
                    placeholder="e.g. tanvir@cafepos.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{ ...styles.input, paddingLeft: '36px' }}
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Phone Number (Frontline Contact) *</label>
                <div style={styles.inputWithIcon}>
                  <Phone size={15} color="var(--color-text-muted)" style={styles.fieldIcon} />
                  <input
                    type="tel"
                    placeholder="+880 1712 345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    style={{ ...styles.input, paddingLeft: '36px' }}
                  />
                </div>
              </div>

              {/* Initial Password with Generator */}
              <div style={styles.formGroup}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={styles.label}>Initial Password (User Receives This) *</label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    style={styles.genBtn}
                  >
                    <Key size={12} />
                    <span>Generate Strong</span>
                  </button>
                </div>

                <div style={styles.inputWithIcon}>
                  <Lock size={15} color="var(--color-text-muted)" style={styles.fieldIcon} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={initialPassword}
                    onChange={(e) => setInitialPassword(e.target.value)}
                    required
                    style={{ ...styles.input, paddingLeft: '36px', paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={styles.eyeBtn}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <span style={styles.fieldHint}>
                  User can change this password anytime in their User Settings.
                </span>
              </div>

              {/* Assigned Role */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Assign Role (Permission Group)</label>
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  style={styles.selectInput}
                >
                  <option value="">-- No Role Assigned (Unassigned) --</option>
                  {permissionGroups.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.name} — {g.description ? g.description.substring(0, 50) + '...' : ''}
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
                      <RefreshCw size={15} className="spin-anim" />
                      <span>Sending Invite...</span>
                    </>
                  ) : (
                    <>
                      <Mail size={15} />
                      <span>Create Account &amp; Send Invite</span>
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
          <div style={{ ...styles.modalCard, maxWidth: '500px' }}>
            <div style={{ ...styles.modalHeader, borderBottom: 'none', paddingBottom: '8px' }}>
              <div style={styles.modalHeaderLeft}>
                <div style={{ ...styles.modalIconBox, backgroundColor: 'var(--color-success)' }}>
                  <CheckCircle2 size={22} color="#FFFFFF" />
                </div>
                <div>
                  <h3 style={styles.modalTitle}>Staff Account Created!</h3>
                  <p style={styles.modalSubtitle}>Invitation email dispatched with initial credentials</p>
                </div>
              </div>
              <button onClick={() => setCreatedStaffCreds(null)} style={styles.closeBtn}>×</button>
            </div>

            <div style={styles.credsBox}>
              <div style={styles.credsNotice}>
                <Mail size={15} color="var(--color-primary-active)" />
                <span>
                  A confirmation email with verification link was dispatched to <strong>{createdStaffCreds.email}</strong>. 
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
                <span style={styles.credLabel}>Assigned Role:</span>
                <span style={{ ...styles.credValue, fontWeight: '700', color: 'var(--color-primary-active)' }}>
                  {createdStaffCreds.group_name || 'No Role Assigned'}
                </span>
              </div>
              <div style={styles.credRow}>
                <span style={styles.credLabel}>Initial Password:</span>
                <span style={{ ...styles.credValue, fontFamily: 'monospace', fontWeight: '700', color: '#B26A00' }}>
                  {createdStaffCreds.initialPassword}
                </span>
              </div>
            </div>

            <div style={styles.modalActions}>
              <button
                type="button"
                onClick={copyAllCredentials}
                style={styles.copyAllBtn}
              >
                {copiedKey === 'all' ? (
                  <>
                    <Check size={15} color="var(--color-success)" />
                    <span>Credentials Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={15} />
                    <span>Copy All Credentials</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setCreatedStaffCreds(null)}
                style={styles.doneBtn}
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
            <div style={{ ...styles.modalHeader, borderBottom: 'none' }}>
              <div style={styles.modalHeaderLeft}>
                <div style={{ ...styles.modalIconBox, backgroundColor: 'var(--color-danger)' }}>
                  <Trash2 size={20} color="#FFFFFF" />
                </div>
                <div>
                  <h3 style={styles.modalTitle}>Delete Staff Account</h3>
                  <p style={styles.modalSubtitle}>This action cannot be undone</p>
                </div>
              </div>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', lineHeight: 1.5, margin: '14px 0 20px' }}>
              Are you sure you want to permanently delete the staff record for <strong>{staffToDelete.full_name || staffToDelete.email}</strong>? 
              They will immediately lose access to all terminal stations.
            </p>

            <div style={styles.modalActions}>
              <button onClick={() => setStaffToDelete(null)} style={styles.cancelBtn}>
                Cancel
              </button>
              <button onClick={handleDeleteStaff} style={styles.deleteConfirmBtn}>
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Edit Phone Modal */}
      {phoneEditingStaff && (
        <div style={styles.modalOverlay} onClick={() => setPhoneEditingStaff(null)}>
          <div style={{ ...styles.modalCard, maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalHeaderLeft}>
                <div style={{ ...styles.modalIconBox, backgroundColor: 'var(--color-primary)' }}>
                  <Phone size={18} color="#FFFFFF" />
                </div>
                <div>
                  <h3 style={styles.modalTitle}>Update Phone Number</h3>
                  <p style={styles.modalSubtitle}>{phoneEditingStaff.full_name || phoneEditingStaff.email}</p>
                </div>
              </div>
              <button onClick={() => setPhoneEditingStaff(null)} style={styles.closeBtn}>×</button>
            </div>

            <form onSubmit={handleSavePhone} style={styles.modalForm}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Phone Number (Frontline Contact)</label>
                <div style={styles.inputWithIcon}>
                  <Phone size={15} color="var(--color-text-muted)" style={styles.fieldIcon} />
                  <input
                    type="tel"
                    placeholder="+880 1712 345678"
                    value={editingPhoneInput}
                    onChange={(e) => setEditingPhoneInput(e.target.value)}
                    required
                    autoFocus
                    style={{ ...styles.input, paddingLeft: '36px' }}
                  />
                </div>
                <span style={styles.fieldHint}>Saved to staff directory records and Supabase profile.</span>
              </div>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setPhoneEditingStaff(null)}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPhone}
                  style={styles.submitBtn}
                >
                  {isSavingPhone ? 'Saving...' : 'Save Phone'}
                </button>
              </div>
            </form>
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
    padding: '24px 32px 64px',
    width: '100%',
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
  headerBanner: {
    backgroundColor: 'var(--color-surface)',
    border: '1.5px solid var(--color-border)',
    borderRadius: '20px',
    padding: '28px 32px',
    display: 'flex',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: '24px',
    boxShadow: 'var(--shadow-sm)',
    minHeight: '180px',
  },
  headerBlendWrapper: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '48%',
    maxWidth: '520px',
    minWidth: '260px',
    pointerEvents: 'none',
    overflow: 'hidden',
    zIndex: 1,
    WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.25) 20%, rgba(0, 0, 0, 0.85) 60%, black 100%)',
    maskImage: 'linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.25) 20%, rgba(0, 0, 0, 0.85) 60%, black 100%)',
  },
  headerBlendImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center',
    opacity: 0.9,
    display: 'block',
  },
  headerBlendGradient: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(to right, var(--color-surface) 0%, rgba(234, 226, 214, 0.35) 40%, transparent 100%)',
    pointerEvents: 'none',
  },
  headerTextCol: {
    position: 'relative',
    zIndex: 2,
    maxWidth: '640px',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    backgroundColor: 'rgba(98, 111, 72, 0.12)',
    color: 'var(--color-primary-active)',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.78rem',
    fontWeight: '700',
    letterSpacing: '0.02em',
    marginBottom: '8px',
  },
  title: {
    fontSize: 'clamp(1.6rem, 2.5vw, 2.1rem)',
    fontWeight: '800',
    color: 'var(--color-text-main)',
    letterSpacing: '-0.02em',
    marginBottom: '6px',
  },
  subtitle: {
    fontSize: '0.92rem',
    color: 'var(--color-text-muted)',
    maxWidth: '680px',
    lineHeight: 1.5,
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  refreshBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '9px 16px',
    borderRadius: 'var(--radius-md)',
    border: '1.5px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text-main)',
    fontWeight: '600',
    fontSize: '0.86rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  createBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',
    padding: '9px 18px',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    backgroundColor: 'var(--color-primary)',
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: '0.9rem',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(98, 111, 72, 0.28)',
    transition: 'background 0.2s',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    backgroundColor: 'var(--color-surface)',
    border: '1.5px solid var(--color-border)',
    borderRadius: '16px',
    padding: '16px 18px',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    boxShadow: 'var(--shadow-sm)',
  },
  statIconBox: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statValue: {
    fontSize: '1.4rem',
    fontWeight: '800',
    color: 'var(--color-text-main)',
    lineHeight: 1.1,
  },
  statLabel: {
    fontSize: '0.78rem',
    color: 'var(--color-text-muted)',
    fontWeight: '600',
    marginTop: '2px',
  },
  tableCard: {
    backgroundColor: 'var(--color-surface)',
    border: '1.5px solid var(--color-border)',
    borderRadius: '18px',
    overflow: 'hidden',
    boxShadow: 'var(--shadow-sm)',
  },
  tableToolbar: {
    padding: '20px 24px',
    borderBottom: '1px solid var(--color-border)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
  },
  toolbarActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  tableTitle: {
    fontSize: '1.15rem',
    fontWeight: '800',
    color: 'var(--color-text-main)',
    marginBottom: '3px',
  },
  tableDesc: {
    fontSize: '0.84rem',
    color: 'var(--color-text-muted)',
  },
  searchWrapper: {
    position: 'relative',
    minWidth: '260px',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '8px 14px 8px 34px',
    borderRadius: 'var(--radius-md)',
    border: '1.5px solid var(--color-border)',
    backgroundColor: 'var(--color-bg)',
    fontSize: '0.86rem',
    color: 'var(--color-text-main)',
    outline: 'none',
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
    fontSize: '0.76rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: 'var(--color-text-muted)',
  },
  trBody: {
    borderBottom: '1px solid var(--color-border)',
    transition: 'background 0.15s',
  },
  td: {
    padding: '14px 20px',
    fontSize: '0.88rem',
    color: 'var(--color-text-main)',
    verticalAlign: 'middle',
  },
  userCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '0.9rem',
    flexShrink: 0,
  },
  userName: {
    fontWeight: '700',
    color: 'var(--color-text-main)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.9rem',
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
    fontSize: '0.78rem',
    color: 'var(--color-text-muted)',
    marginTop: '2px',
  },
  phoneCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.84rem',
    fontWeight: '500',
    color: 'var(--color-text-main)',
  },
  phoneClickable: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.84rem',
    fontWeight: '500',
    padding: '4px 8px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  phoneText: {
    color: 'var(--color-text-main)',
    fontWeight: '600',
  },
  phoneEmptyText: {
    color: 'var(--color-primary-active)',
    fontSize: '0.78rem',
    fontWeight: '600',
    fontStyle: 'italic',
  },
  groupSelect: {
    padding: '5px 10px',
    borderRadius: '6px',
    border: '1px solid',
    fontSize: '0.82rem',
    cursor: 'pointer',
    outline: 'none',
  },
  confirmedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 8px',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.74rem',
    fontWeight: '700',
    backgroundColor: 'var(--color-success-bg)',
    color: 'var(--color-success)',
  },
  pendingBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 8px',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.74rem',
    fontWeight: '700',
    backgroundColor: 'rgba(178, 106, 0, 0.12)',
    color: '#B26A00',
  },
  dateText: {
    fontSize: '0.8rem',
    color: 'var(--color-text-main)',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  roleBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 11px',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.74rem',
    fontWeight: '800',
    whiteSpace: 'nowrap',
  },
  roleRawText: {
    fontSize: '0.68rem',
    color: 'var(--color-text-subtle)',
    marginTop: '4px',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    whiteSpace: 'nowrap',
  },
  actionButtons: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '6px',
  },
  actionBtn: {
    width: '30px',
    height: '30px',
    borderRadius: '6px',
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
    padding: '48px 20px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    backdropFilter: 'blur(5px)',
    zIndex: 1100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  modalCard: {
    backgroundColor: 'var(--color-surface)',
    border: '1.5px solid var(--color-border)',
    borderRadius: '20px',
    padding: '28px 30px',
    maxWidth: '480px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: 'var(--shadow-lg)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: '16px',
    marginBottom: '18px',
  },
  modalHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  modalIconBox: {
    width: '38px',
    height: '38px',
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
    marginBottom: '3px',
  },
  modalSubtitle: {
    fontSize: '0.82rem',
    color: 'var(--color-text-muted)',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1.4rem',
    lineHeight: 1,
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    padding: '4px',
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  label: {
    fontSize: '0.8rem',
    fontWeight: '700',
    color: 'var(--color-text-main)',
  },
  input: {
    padding: '9px 12px',
    borderRadius: '8px',
    border: '1.5px solid var(--color-border)',
    backgroundColor: 'var(--color-bg)',
    color: 'var(--color-text-main)',
    fontSize: '0.88rem',
    outline: 'none',
    width: '100%',
  },
  inputWithIcon: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  fieldIcon: {
    position: 'absolute',
    left: '11px',
    pointerEvents: 'none',
  },
  genBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    background: 'none',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    padding: '2px 7px',
    fontSize: '0.72rem',
    fontWeight: '700',
    color: 'var(--color-primary-active)',
    cursor: 'pointer',
  },
  eyeBtn: {
    position: 'absolute',
    right: '10px',
    background: 'none',
    border: 'none',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    padding: '4px',
  },
  fieldHint: {
    fontSize: '0.74rem',
    color: 'var(--color-text-muted)',
    marginTop: '2px',
  },
  selectInput: {
    padding: '9px 12px',
    borderRadius: '8px',
    border: '1.5px solid var(--color-border)',
    backgroundColor: 'var(--color-bg)',
    color: 'var(--color-text-main)',
    fontSize: '0.88rem',
    outline: 'none',
    width: '100%',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '12px',
  },
  cancelBtn: {
    padding: '9px 16px',
    backgroundColor: 'transparent',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    fontSize: '0.86rem',
    fontWeight: '600',
    color: 'var(--color-text-main)',
    cursor: 'pointer',
  },
  submitBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '9px 18px',
    backgroundColor: 'var(--color-primary)',
    color: '#FFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.86rem',
    fontWeight: '700',
    cursor: 'pointer',
  },
  credsBox: {
    backgroundColor: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  credsNotice: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    fontSize: '0.82rem',
    color: 'var(--color-text-muted)',
    marginBottom: '6px',
    lineHeight: 1.4,
  },
  credRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.84rem',
  },
  credLabel: {
    color: 'var(--color-text-muted)',
  },
  credValue: {
    color: 'var(--color-text-main)',
    fontWeight: '600',
  },
  copyAllBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '9px 16px',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    fontSize: '0.86rem',
    fontWeight: '700',
    cursor: 'pointer',
    color: 'var(--color-text-main)',
  },
  doneBtn: {
    padding: '9px 20px',
    backgroundColor: 'var(--color-primary)',
    color: '#FFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.86rem',
    fontWeight: '700',
    cursor: 'pointer',
  },
  deleteConfirmBtn: {
    padding: '9px 18px',
    backgroundColor: 'var(--color-danger)',
    color: '#FFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.86rem',
    fontWeight: '700',
    cursor: 'pointer',
  }
}
