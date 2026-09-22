import React, { useState, useEffect } from 'react'
import { 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Lock,
  Unlock,
  Eye,
  Edit3,
  Users,
  Coffee,
  Sparkles,
  ShoppingBag,
  Grid,
  Package,
  Receipt,
  BookOpen,
  TrendingUp,
  ChefHat,
  Settings
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { MODULE_DEFINITIONS } from '../constants/permissions'

const COLOR_PRESETS = [
  { name: 'Olive Green', color: '#626F48', bg: 'rgba(98, 111, 72, 0.14)' },
  { name: 'Warm Amber', color: '#B26A00', bg: 'rgba(178, 106, 0, 0.14)' },
  { name: 'Slate Blue', color: '#3E6B89', bg: 'rgba(62, 107, 137, 0.14)' },
  { name: 'Espresso Roast', color: '#7D2E2E', bg: 'rgba(125, 46, 46, 0.14)' },
  { name: 'Matcha Sage', color: '#527853', bg: 'rgba(82, 120, 83, 0.14)' },
]

// Icon mapper for modules
const getModuleIcon = (id) => {
  switch (id) {
    case 'orders': return <ShoppingBag size={14} />
    case 'kitchen': return <ChefHat size={14} />
    case 'tables': return <Grid size={14} />
    case 'billing': return <Receipt size={14} />
    case 'inventory': return <Package size={14} />
    case 'menu': return <BookOpen size={14} />
    case 'reports': return <TrendingUp size={14} />
    case 'staff': return <Users size={14} />
    case 'permissions': return <ShieldCheck size={14} />
    default: return <Settings size={14} />
  }
}

export const PermissionGroupsView = () => {
  const { 
    permissionGroups, 
    createPermissionGroup, 
    updatePermissionGroup,
    deletePermissionGroup,
    fetchStaffMembers 
  } = useAuth()

  const [staffList, setStaffList] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  // null হলে নতুন group বানানো হচ্ছে, নাহলে এই group টা edit করা হচ্ছে
  const [editingGroup, setEditingGroup] = useState(null)
  const [toastMessage, setToastMessage] = useState(null)
  const [inspectGroup, setInspectGroup] = useState(null)

  // Form State for new group
  const [groupName, setGroupName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0])
  const [permissionsState, setPermissionsState] = useState(() => {
    const initial = {}
    MODULE_DEFINITIONS.forEach(m => {
      initial[m.id] = { view: true, edit: false }
    })
    return initial
  })

  // Delete Confirmation State
  const [groupToDelete, setGroupToDelete] = useState(null)

  useEffect(() => {
    const loadStaffCounts = async () => {
      try {
        const list = await fetchStaffMembers()
        setStaffList(list || [])
      } catch {}
    }
    loadStaffCounts()
  }, [])

  const showToast = (type, text) => {
    setToastMessage({ type, text })
    setTimeout(() => setToastMessage(null), 3500)
  }

  /** ফর্মটা খালি করে "নতুন group" অবস্থায় নিয়ে যায় */
  const resetForm = () => {
    setGroupName('')
    setDescription('')
    setSelectedColor(COLOR_PRESETS[0])
    const initial = {}
    MODULE_DEFINITIONS.forEach((m) => {
      initial[m.id] = { view: true, edit: false }
    })
    setPermissionsState(initial)
  }

  const openCreateModal = () => {
    setEditingGroup(null)
    resetForm()
    setIsModalOpen(true)
  }

  /**
   * চালু group টার বর্তমান অবস্থা ফর্মে তুলে দেয়।
   * group এ যে module এর কথা লেখা নেই সেটা বন্ধ ধরা হয় — নাহলে পরে
   * যোগ হওয়া নতুন module গুলো ভুল করে চালু দেখাত।
   */
  const openEditModal = (group) => {
    setEditingGroup(group)
    setGroupName(group.name || '')
    setDescription(group.description || '')
    setSelectedColor(
      COLOR_PRESETS.find((c) => c.color === group.color) || COLOR_PRESETS[0]
    )
    const loaded = {}
    MODULE_DEFINITIONS.forEach((m) => {
      const p = group.permissions?.[m.id]
      loaded[m.id] = { view: Boolean(p?.view), edit: Boolean(p?.edit) }
    })
    setPermissionsState(loaded)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingGroup(null)
  }

  const handleTogglePerm = (moduleId, type) => {
    setPermissionsState(prev => {
      const current = prev[moduleId] || { view: false, edit: false }
      const newPerm = { ...current, [type]: !current[type] }
      if (type === 'edit' && newPerm.edit) {
        newPerm.view = true
      }
      if (type === 'view' && !newPerm.view) {
        newPerm.edit = false
      }
      return { ...prev, [moduleId]: newPerm }
    })
  }

  const handleGrantAll = () => {
    const all = {}
    MODULE_DEFINITIONS.forEach(m => {
      all[m.id] = { view: true, edit: true }
    })
    setPermissionsState(all)
  }

  const handleClearAll = () => {
    const cleared = {}
    MODULE_DEFINITIONS.forEach(m => {
      cleared[m.id] = { view: false, edit: false }
    })
    setPermissionsState(cleared)
  }

  const handleSubmitGroup = async (e) => {
    e.preventDefault()
    const name = groupName.trim()
    if (!name) return

    const payload = {
      name,
      description: description.trim() || 'Custom operational permission group.',
      color: selectedColor.color,
      bgColor: selectedColor.bg,
      permissions: permissionsState,
    }

    try {
      if (editingGroup) {
        await updatePermissionGroup(editingGroup.id, payload)
        // এই group এ বসা staff পরের বার পেজ খুললেই নতুন অধিকার পাবে
        showToast('success', `'${name}' updated. Staff in this group get the new access on their next page load.`)
      } else {
        await createPermissionGroup(payload)
        showToast('success', `Permission group '${name}' created successfully.`)
      }
      closeModal()
      resetForm()
    } catch (err) {
      showToast('error', err.message || 'Failed to save permission group.')
    }
  }

  const handleConfirmDelete = async () => {
    if (!groupToDelete) return

    try {
      await deletePermissionGroup(groupToDelete.id)
      showToast('success', `Permission group '${groupToDelete.name}' deleted. Assigned staff moved to Unassigned.`)
      setGroupToDelete(null)
      const list = await fetchStaffMembers()
      setStaffList(list || [])
    } catch (err) {
      showToast('error', err.message || 'Failed to delete permission group.')
    }
  }

  const getStaffCountForGroup = (groupId) => {
    return staffList.filter(s => s.permission_group_id === groupId).length
  }

  return (
    <div style={styles.container}>
      {/* Toast Notification */}
      {toastMessage && (
        <div 
          style={{
            ...styles.toast,
            backgroundColor: toastMessage.type === 'error' ? 'var(--color-danger-bg)' : 'var(--color-success-bg)',
            borderColor: toastMessage.type === 'error' ? 'var(--color-danger)' : 'var(--color-success)',
            color: toastMessage.type === 'error' ? 'var(--color-danger)' : 'var(--color-success)'
          }}
        >
          {toastMessage.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Page Header Banner with Blended Minimal Aesthetic Image */}
      <div style={styles.headerBanner}>
        {/* Blended Background Image Layer - No separate box */}
        <div style={styles.headerBlendWrapper}>
          <img 
            src="/images/permissions_workspace.jpg" 
            alt="Role Permissions Station" 
            style={styles.headerBlendImg}
            loading="lazy"
          />
          <div style={styles.headerBlendGradient} />
        </div>

        <div style={styles.headerTextCol}>
          <div style={styles.badgeRow}>
            <span style={styles.superBadge}>
              <ShieldCheck size={13} />
              <span>Role-Based Access Control (RBAC)</span>
            </span>
          </div>

          <h2 style={styles.pageTitle}>Permission Groups &amp; Roles</h2>
          <p style={styles.pageSubtitle}>
            Configure operational role boundaries. Define exact View and Edit privileges across counter billing, tables, recipe inventory, and reporting.
          </p>

          <div style={{ marginTop: '16px' }}>
            <button 
              onClick={openCreateModal}
              style={styles.createBtn}
            >
              <Plus size={16} />
              <span>+ New Permission Role</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Highlights */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIconBox, backgroundColor: 'rgba(98, 111, 72, 0.12)', color: 'var(--color-primary-active)' }}>
            <Layers size={18} />
          </div>
          <div>
            <div style={styles.statValue}>{permissionGroups.length}</div>
            <div style={styles.statLabel}>Active Role Groups</div>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={{ ...styles.statIconBox, backgroundColor: 'rgba(62, 107, 137, 0.12)', color: '#3E6B89' }}>
            <Lock size={18} />
          </div>
          <div>
            <div style={styles.statValue}>{permissionGroups.filter(g => g.isDefault).length}</div>
            <div style={styles.statLabel}>System Standard Roles</div>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={{ ...styles.statIconBox, backgroundColor: 'rgba(178, 106, 0, 0.12)', color: '#B26A00' }}>
            <Sparkles size={18} />
          </div>
          <div>
            <div style={styles.statValue}>{permissionGroups.filter(g => !g.isDefault).length}</div>
            <div style={styles.statLabel}>Custom Cafe Roles</div>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={{ ...styles.statIconBox, backgroundColor: 'rgba(46, 125, 50, 0.12)', color: '#2E7D32' }}>
            <Users size={18} />
          </div>
          <div>
            <div style={styles.statValue}>{staffList.length}</div>
            <div style={styles.statLabel}>Total Staff Managed</div>
          </div>
        </div>
      </div>

      {/* Permission Groups Cards - Clean & Aesthetic */}
      <div style={styles.groupsGrid}>
        {permissionGroups.map(group => {
          const staffCount = getStaffCountForGroup(group.id)
          const isSuper = group.id === 'grp_super_admin'

          // Extract active capabilities
          const activeModules = MODULE_DEFINITIONS.filter(m => {
            const p = group.permissions?.[m.id]
            return p && (p.view || p.edit)
          })

          return (
            <div key={group.id} style={styles.groupCard}>
              {/* Card Header */}
              <div style={styles.cardHeader}>
                <div style={styles.headerLeft}>
                  <div 
                    style={{
                      ...styles.colorBadge,
                      backgroundColor: group.bgColor || 'rgba(98, 111, 72, 0.14)',
                      borderColor: group.color || 'var(--color-primary-active)',
                      color: group.color || 'var(--color-primary-active)'
                    }}
                  >
                    <ShieldCheck size={14} />
                    <span>{group.name}</span>
                  </div>

                  {group.isDefault ? (
                    <span style={styles.systemBadge}>Default System Role</span>
                  ) : (
                    <span style={styles.customBadge}>Custom Role</span>
                  )}
                </div>

                {!group.isDefault && (
                  <div style={styles.cardActions}>
                    <button
                      onClick={() => openEditModal(group)}
                      style={styles.editGroupBtn}
                      title={`Edit '${group.name}'`}
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => setGroupToDelete(group)}
                      style={styles.deleteGroupBtn}
                      title={`Delete '${group.name}'`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Description */}
              <p style={styles.groupDesc}>{group.description}</p>

              {/* Access Permissions Summary - Clean & Uncluttered */}
              <div style={styles.accessSection}>
                <div style={styles.accessTitleRow}>
                  <span style={styles.accessHeading}>Configured Privileges</span>
                  <span style={styles.accessCount}>
                    {isSuper ? 'Full System' : `${activeModules.length} Modules`}
                  </span>
                </div>

                {isSuper ? (
                  <div style={styles.fullAccessBanner}>
                    <CheckCircle2 size={15} color="var(--color-success)" />
                    <span>Unrestricted Owner Access — All Modules &amp; Governance</span>
                  </div>
                ) : (
                  <div style={styles.chipsContainer}>
                    {activeModules.map(mod => {
                      const p = group.permissions?.[mod.id]
                      const isEdit = p?.edit
                      return (
                        <div 
                          key={mod.id} 
                          style={{
                            ...styles.permChip,
                            backgroundColor: isEdit ? 'rgba(98, 111, 72, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                            borderColor: isEdit ? 'rgba(98, 111, 72, 0.3)' : 'var(--color-border)',
                          }}
                        >
                          {getModuleIcon(mod.id)}
                          <span style={styles.chipText}>{mod.label}</span>
                          <span style={isEdit ? styles.chipEditBadge : styles.chipViewBadge}>
                            {isEdit ? 'Edit' : 'View'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div style={styles.cardFooter}>
                <div style={styles.staffCountBadge}>
                  <Users size={13} />
                  <span>{staffCount} {staffCount === 1 ? 'staff member' : 'staff members'}</span>
                </div>

                <div style={styles.cardActions}>
                  <button
                    onClick={() => setInspectGroup(group)}
                    style={styles.inspectBtn}
                  >
                    <Eye size={13} />
                    <span>View Details</span>
                  </button>

                  {!group.isDefault && (
                    <button
                      onClick={() => openEditModal(group)}
                      style={styles.editAccessBtn}
                    >
                      <Edit3 size={13} />
                      <span>Edit Access</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* =========================================================================
          Inspect Group Details Modal
         ========================================================================= */}
      {inspectGroup && (
        <div style={styles.modalOverlay} onClick={() => setInspectGroup(null)}>
          <div style={{ ...styles.modalCard, maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div 
                  style={{
                    ...styles.modalColorIcon,
                    backgroundColor: inspectGroup.bgColor || 'rgba(98, 111, 72, 0.15)',
                    color: inspectGroup.color || 'var(--color-primary-active)'
                  }}
                >
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 style={styles.modalTitle}>{inspectGroup.name}</h3>
                  <p style={styles.modalSubtitle}>{inspectGroup.description}</p>
                </div>
              </div>

              <button onClick={() => setInspectGroup(null)} style={styles.closeBtn}>
                <X size={18} />
              </button>
            </div>

            <div style={styles.inspectBody}>
              <div style={styles.inspectGridHeader}>
                <span>System Module</span>
                <span style={{ textAlign: 'center' }}>View Rights</span>
                <span style={{ textAlign: 'center' }}>Edit &amp; Control</span>
              </div>

              <div style={styles.inspectList}>
                {MODULE_DEFINITIONS.map(mod => {
                  const perm = inspectGroup.permissions?.[mod.id] || { view: false, edit: false }

                  return (
                    <div key={mod.id} style={styles.inspectRow}>
                      <div style={styles.modInfoCol}>
                        {getModuleIcon(mod.id)}
                        <span style={styles.modNameText}>{mod.label}</span>
                      </div>

                      <div style={styles.statusCol}>
                        {perm.view ? (
                          <span style={styles.activeCheck}><Check size={14} /> Allowed</span>
                        ) : (
                          <span style={styles.inactiveCheck}>—</span>
                        )}
                      </div>

                      <div style={styles.statusCol}>
                        {perm.edit ? (
                          <span style={styles.activeCheck}><Check size={14} /> Allowed</span>
                        ) : (
                          <span style={styles.inactiveCheck}>—</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={styles.modalActions}>
              <button 
                onClick={() => setInspectGroup(null)} 
                style={styles.closeModalBtn}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          Create Permission Group Modal
         ========================================================================= */}
      {isModalOpen && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>
                  {editingGroup ? `Edit '${editingGroup.name}'` : 'Create Permission Role'}
                </h3>
                <p style={styles.modalSubtitle}>
                  {editingGroup
                    ? 'Add or remove module access for this role'
                    : 'Define operational role, visual theme, and module access'}
                </p>
              </div>

              <button onClick={closeModal} style={styles.closeBtn}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitGroup} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Role Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Shift Floor Lead, Junior Barista, Inventory Auditor"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Description</label>
                <input
                  type="text"
                  placeholder="Brief note describing duties and access level"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={styles.input}
                />
              </div>

              {/* Color Preset Picker */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Role Color Badge</label>
                <div style={styles.colorPickerRow}>
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setSelectedColor(preset)}
                      style={{
                        ...styles.colorCircle,
                        backgroundColor: preset.color,
                        outline: selectedColor.name === preset.name ? '3px solid var(--color-primary-active)' : 'none',
                        outlineOffset: '2px',
                      }}
                      title={preset.name}
                    >
                      {selectedColor.name === preset.name && <Check size={14} color="#FFF" />}
                    </button>
                  ))}
                  <span style={styles.colorNameLabel}>{selectedColor.name}</span>
                </div>
              </div>

              {/* Permissions Header with Shortcuts */}
              <div style={styles.permControlHeader}>
                <label style={{ ...styles.label, marginBottom: 0 }}>Module Rights Configuration</label>
                <div style={styles.permShortcuts}>
                  <button 
                    type="button" 
                    onClick={handleGrantAll} 
                    style={styles.shortcutBtn}
                  >
                    Grant All
                  </button>
                  <button 
                    type="button" 
                    onClick={handleClearAll} 
                    style={styles.shortcutBtn}
                  >
                    Revoke All
                  </button>
                </div>
              </div>

              {/* Clean Module Toggle List */}
              <div style={styles.createModuleList}>
                {MODULE_DEFINITIONS.map(mod => {
                  const perm = permissionsState[mod.id] || { view: false, edit: false }

                  return (
                    <div key={mod.id} style={styles.createModuleRow}>
                      <div style={styles.modInfoCol}>
                        {getModuleIcon(mod.id)}
                        <span style={styles.modNameText}>{mod.label}</span>
                      </div>

                      <div style={styles.togglesRow}>
                        <button
                          type="button"
                          onClick={() => handleTogglePerm(mod.id, 'view')}
                          style={{
                            ...styles.togglePill,
                            backgroundColor: perm.view ? 'var(--color-primary)' : 'rgba(0, 0, 0, 0.06)',
                            color: perm.view ? '#FFF' : 'var(--color-text-muted)',
                          }}
                        >
                          <Eye size={12} />
                          <span>View</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleTogglePerm(mod.id, 'edit')}
                          style={{
                            ...styles.togglePill,
                            backgroundColor: perm.edit ? '#B26A00' : 'rgba(0, 0, 0, 0.06)',
                            color: perm.edit ? '#FFF' : 'var(--color-text-muted)',
                          }}
                        >
                          <Edit3 size={12} />
                          <span>Edit</span>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Modal Actions */}
              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={styles.submitBtn}
                >
                  {editingGroup ? <Check size={16} /> : <Plus size={16} />}
                  <span>{editingGroup ? 'Save Changes' : 'Create Role Group'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          Delete Confirmation Modal
         ========================================================================= */}
      {groupToDelete && (
        <div style={styles.modalOverlay} onClick={() => setGroupToDelete(null)}>
          <div style={{ ...styles.modalCard, maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ ...styles.modalHeader, borderBottom: 'none' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ ...styles.statIconBox, backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 style={styles.modalTitle}>Delete Role Group</h3>
                  <p style={styles.modalSubtitle}>Confirm deletion of '{groupToDelete.name}'</p>
                </div>
              </div>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', lineHeight: 1.5, margin: '12px 0 20px' }}>
              Staff members currently assigned to <strong>{groupToDelete.name}</strong> will be moved to <strong>No Role Assigned (Unassigned)</strong>. They will not be automatically given another role.
            </p>

            <div style={styles.modalActions}>
              <button onClick={() => setGroupToDelete(null)} style={styles.cancelBtn}>
                Cancel
              </button>
              <button onClick={handleConfirmDelete} style={styles.deleteConfirmBtn}>
                Delete Role
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
    padding: '28px 32px 64px',
    maxWidth: '1280px',
    margin: '0 auto',
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
    maxWidth: '90vw',
    animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
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
  badgeRow: {
    marginBottom: '8px',
  },
  superBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    backgroundColor: 'rgba(98, 111, 72, 0.12)',
    border: '1px solid rgba(98, 111, 72, 0.25)',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.78rem',
    fontWeight: '700',
    color: 'var(--color-primary-active)',
    letterSpacing: '0.02em',
  },
  pageTitle: {
    fontSize: 'clamp(1.6rem, 2.5vw, 2.1rem)',
    fontWeight: '800',
    color: 'var(--color-text-main)',
    letterSpacing: '-0.02em',
    marginBottom: '6px',
  },
  pageSubtitle: {
    fontSize: '0.92rem',
    color: 'var(--color-text-muted)',
    maxWidth: '680px',
    lineHeight: 1.5,
  },
  createBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    backgroundColor: 'var(--color-primary)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontWeight: '700',
    fontSize: '0.9rem',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(98, 111, 72, 0.28)',
    transition: 'all 0.2s',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '28px',
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
  groupsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: '20px',
  },
  groupCard: {
    backgroundColor: 'var(--color-surface)',
    border: '1.5px solid var(--color-border)',
    borderRadius: '18px',
    padding: '22px 24px',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  colorBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '5px 12px',
    borderRadius: 'var(--radius-full)',
    border: '1px solid',
    fontSize: '0.86rem',
    fontWeight: '800',
    letterSpacing: '-0.01em',
  },
  systemBadge: {
    fontSize: '0.72rem',
    fontWeight: '600',
    color: 'var(--color-text-muted)',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    padding: '3px 8px',
    borderRadius: 'var(--radius-full)',
  },
  customBadge: {
    fontSize: '0.72rem',
    fontWeight: '700',
    color: 'var(--color-primary-active)',
    backgroundColor: 'rgba(98, 111, 72, 0.12)',
    padding: '3px 8px',
    borderRadius: 'var(--radius-full)',
  },
  cardActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  editGroupBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '30px',
    height: '30px',
    minHeight: '30px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-primary-active)',
    flexShrink: 0,
  },
  editAccessBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 13px',
    minHeight: '34px',
    borderRadius: 'var(--radius-sm)',
    border: '1.5px solid var(--color-primary)',
    backgroundColor: 'var(--color-primary-subtle)',
    color: 'var(--color-primary-active)',
    fontSize: '0.78rem',
    fontWeight: '700',
  },
  deleteGroupBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.2s',
  },
  groupDesc: {
    fontSize: '0.86rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.45,
    marginBottom: '16px',
    minHeight: '38px',
  },
  accessSection: {
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    border: '1px solid var(--color-border)',
    borderRadius: '12px',
    padding: '12px 14px',
    marginBottom: '18px',
    flex: 1,
  },
  accessTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  accessHeading: {
    fontSize: '0.75rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: 'var(--color-text-muted)',
  },
  accessCount: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--color-primary-active)',
  },
  fullAccessBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.82rem',
    fontWeight: '700',
    color: 'var(--color-success)',
    padding: '8px 10px',
    backgroundColor: 'var(--color-success-bg)',
    borderRadius: '8px',
  },
  chipsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  permChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '4px 8px',
    borderRadius: '6px',
    border: '1px solid',
    fontSize: '0.74rem',
    fontWeight: '600',
    color: 'var(--color-text-main)',
  },
  chipText: {
    maxWidth: '120px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  chipEditBadge: {
    fontSize: '0.66rem',
    fontWeight: '700',
    backgroundColor: 'rgba(178, 106, 0, 0.15)',
    color: '#B26A00',
    padding: '1px 5px',
    borderRadius: '4px',
  },
  chipViewBadge: {
    fontSize: '0.66rem',
    fontWeight: '600',
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    color: 'var(--color-text-muted)',
    padding: '1px 5px',
    borderRadius: '4px',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '12px',
    borderTop: '1px solid var(--color-border)',
  },
  staffCountBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'var(--color-text-muted)',
  },
  inspectBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '6px 12px',
    backgroundColor: 'transparent',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: '700',
    color: 'var(--color-text-main)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    backdropFilter: 'blur(5px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modalCard: {
    backgroundColor: 'var(--color-surface)',
    border: '1.5px solid var(--color-border)',
    borderRadius: '20px',
    padding: '28px 30px',
    maxWidth: '520px',
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
    marginBottom: '20px',
  },
  modalColorIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  modalTitle: {
    fontSize: '1.25rem',
    fontWeight: '800',
    color: 'var(--color-text-main)',
    marginBottom: '4px',
  },
  modalSubtitle: {
    fontSize: '0.85rem',
    color: 'var(--color-text-muted)',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    padding: '4px',
  },
  form: {
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
  fieldHint: {
    fontSize: '0.76rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.55,
    marginTop: '2px',
  },
  input: {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1.5px solid var(--color-border)',
    backgroundColor: 'var(--color-bg)',
    color: 'var(--color-text-main)',
    fontSize: '0.9rem',
    outline: 'none',
  },
  colorPickerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  colorCircle: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.15s',
  },
  colorNameLabel: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'var(--color-text-muted)',
    marginLeft: '4px',
  },
  permControlHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '6px',
  },
  permShortcuts: {
    display: 'flex',
    gap: '8px',
  },
  shortcutBtn: {
    background: 'none',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    padding: '3px 8px',
    fontSize: '0.72rem',
    fontWeight: '700',
    color: 'var(--color-primary-active)',
    cursor: 'pointer',
  },
  createModuleList: {
    border: '1px solid var(--color-border)',
    borderRadius: '10px',
    overflow: 'hidden',
    maxHeight: '260px',
    overflowY: 'auto',
  },
  createModuleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    borderBottom: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
  },
  modInfoCol: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--color-text-main)',
  },
  modNameText: {
    fontSize: '0.84rem',
  },
  togglesRow: {
    display: 'flex',
    gap: '6px',
  },
  togglePill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    borderRadius: 'var(--radius-full)',
    border: 'none',
    fontSize: '0.74rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '10px',
  },
  cancelBtn: {
    padding: '9px 18px',
    backgroundColor: 'transparent',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    fontSize: '0.88rem',
    fontWeight: '600',
    color: 'var(--color-text-main)',
    cursor: 'pointer',
  },
  submitBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '9px 20px',
    backgroundColor: 'var(--color-primary)',
    color: '#FFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.88rem',
    fontWeight: '700',
    cursor: 'pointer',
  },
  deleteConfirmBtn: {
    padding: '9px 18px',
    backgroundColor: 'var(--color-danger)',
    color: '#FFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.88rem',
    fontWeight: '700',
    cursor: 'pointer',
  },
  inspectBody: {
    marginTop: '4px',
  },
  inspectGridHeader: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr',
    padding: '8px 12px',
    fontSize: '0.74rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    color: 'var(--color-text-muted)',
    borderBottom: '1px solid var(--color-border)',
  },
  inspectList: {
    maxHeight: '340px',
    overflowY: 'auto',
  },
  inspectRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr',
    alignItems: 'center',
    padding: '10px 12px',
    borderBottom: '1px solid var(--color-border)',
  },
  statusCol: {
    textAlign: 'center',
  },
  activeCheck: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    color: 'var(--color-success)',
    fontSize: '0.78rem',
    fontWeight: '700',
  },
  inactiveCheck: {
    color: 'var(--color-text-muted)',
    fontSize: '0.9rem',
  },
  closeModalBtn: {
    padding: '8px 24px',
    backgroundColor: 'var(--color-primary)',
    color: '#FFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.88rem',
    fontWeight: '700',
    cursor: 'pointer',
  }
}
