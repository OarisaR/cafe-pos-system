import React, { useState } from 'react'
import { 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Info,
  Lock,
  Unlock,
  Eye,
  Edit3
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { MODULE_DEFINITIONS } from '../../constants/permissions'

const COLOR_PRESETS = [
  { name: 'Olive Green', color: '#626F48', bg: 'rgba(98, 111, 72, 0.16)' },
  { name: 'Matcha Accent', color: '#8B9A6E', bg: 'rgba(139, 154, 110, 0.16)' },
  { name: 'Warm Amber', color: '#B26A00', bg: 'rgba(178, 106, 0, 0.16)' },
  { name: 'Slate Blue', color: '#3E6B89', bg: 'rgba(62, 107, 137, 0.16)' },
  { name: 'Espresso Maroon', color: '#7D2E2E', bg: 'rgba(125, 46, 46, 0.16)' },
]

export const PermissionGroupsView = () => {
  const { 
    permissionGroups, 
    createPermissionGroup, 
    deletePermissionGroup 
  } = useAuth()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)

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

  const showToast = (type, text) => {
    setToastMessage({ type, text })
    setTimeout(() => setToastMessage(null), 3500)
  }

  const handleTogglePerm = (moduleId, type) => {
    setPermissionsState(prev => {
      const current = prev[moduleId] || { view: false, edit: false }
      const newPerm = { ...current, [type]: !current[type] }
      // If edit is enabled, auto-enable view
      if (type === 'edit' && newPerm.edit) {
        newPerm.view = true
      }
      // If view is disabled, auto-disable edit
      if (type === 'view' && !newPerm.view) {
        newPerm.edit = false
      }
      return { ...prev, [moduleId]: newPerm }
    })
  }

  const handleCreateGroupSubmit = (e) => {
    e.preventDefault()
    if (!groupName.trim()) return

    try {
      createPermissionGroup({
        name: groupName.trim(),
        description: description.trim() || 'Custom operational permission group.',
        color: selectedColor.color,
        bgColor: selectedColor.bg,
        permissions: permissionsState,
      })

      showToast('success', `Permission group '${groupName.trim()}' created successfully.`)
      setIsModalOpen(false)
      setGroupName('')
      setDescription('')
      setSelectedColor(COLOR_PRESETS[0])
    } catch (err) {
      showToast('error', err.message || 'Failed to create permission group.')
    }
  }

  const handleConfirmDelete = () => {
    if (!groupToDelete) return

    try {
      deletePermissionGroup(groupToDelete.id)
      showToast('success', `Permission group '${groupToDelete.name}' deleted.`)
      setGroupToDelete(null)
    } catch (err) {
      showToast('error', err.message || 'Failed to delete permission group.')
    }
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

      {/* Page Header */}
      <div style={styles.pageHeader}>
        <div>
          <div style={styles.badgeRow}>
            <span style={styles.superBadge}>
              <ShieldCheck size={13} />
              <span>Access Control Engine</span>
            </span>
            <span style={styles.metaBadge}>
              <span>{permissionGroups.length} Active Groups</span>
            </span>
          </div>

          <h2 style={styles.pageTitle}>Permission &amp; Role Groups</h2>
          <p style={styles.pageSubtitle}>
            Create custom permission groups (e.g. Shift Manager, Senior Barista, Floor Lead) and configure granular View and Edit rights across modules.
          </p>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-primary"
          style={styles.createBtn}
        >
          <Plus size={16} />
          <span>Create Permission Group</span>
        </button>
      </div>

      {/* Permission Groups Grid */}
      <div style={styles.groupsGrid}>
        {permissionGroups.map(group => (
          <div key={group.id} style={styles.groupCard}>
            {/* Card Header */}
            <div style={styles.cardHeader}>
              <div style={styles.headerLeft}>
                <span 
                  style={{
                    ...styles.groupPill,
                    backgroundColor: group.bgColor || 'rgba(139, 154, 110, 0.16)',
                    color: group.color || 'var(--color-primary-active)',
                  }}
                >
                  <ShieldCheck size={12} />
                  <span>{group.name}</span>
                </span>
                {group.isDefault && (
                  <span style={styles.systemBadge}>System Default</span>
                )}
              </div>

              {!group.isDefault && (
                <button
                  onClick={() => setGroupToDelete(group)}
                  style={styles.deleteGroupBtn}
                  title={`Delete group '${group.name}'`}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            <p style={styles.groupDesc}>{group.description}</p>

            {/* Permissions Matrix */}
            <div style={styles.permissionsMatrix}>
              <div style={styles.matrixTitleRow}>
                <span style={styles.matrixHeading}>Module Access Rights</span>
                <span style={styles.matrixSub}>View / Edit</span>
              </div>

              <div style={styles.modulesList}>
                {MODULE_DEFINITIONS.map(mod => {
                  const perm = group.permissions?.[mod.id] || { view: false, edit: false }

                  return (
                    <div key={mod.id} style={styles.moduleRow}>
                      <span style={styles.moduleLabel}>{mod.label}</span>

                      <div style={styles.permBadgesRow}>
                        {perm.view ? (
                          <span style={styles.viewBadgeActive}>
                            <Eye size={11} /> View
                          </span>
                        ) : (
                          <span style={styles.badgeDisabled}>No View</span>
                        )}

                        {perm.edit ? (
                          <span style={styles.editBadgeActive}>
                            <Edit3 size={11} /> Edit / Control
                          </span>
                        ) : (
                          <span style={styles.badgeDisabled}>No Edit</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* =========================================================================
          Create Permission Group Modal
         ========================================================================= */}
      {isModalOpen && (
        <div style={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>Create Permission Group</h3>
                <p style={styles.modalSubtitle}>Define role title, description, and module-level access</p>
              </div>

              <button onClick={() => setIsModalOpen(false)} style={styles.closeBtn}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateGroupSubmit} style={styles.form}>
              <div className="input-group">
                <label className="input-label" htmlFor="group-name-input">
                  Permission Group Title
                </label>
                <input
                  id="group-name-input"
                  type="text"
                  className="input-field"
                  placeholder="e.g. Kitchen Supervisor, Senior Barista, Inventory Auditor"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="group-desc-input">
                  Role Description
                </label>
                <input
                  id="group-desc-input"
                  type="text"
                  className="input-field"
                  placeholder="Briefly describe what this staff group is responsible for"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Color Preset Picker */}
              <div className="input-group">
                <label className="input-label">Theme Color Accent</label>
                <div style={styles.colorRow}>
                  {COLOR_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedColor(preset)}
                      style={{
                        ...styles.colorCircle,
                        backgroundColor: preset.color,
                        boxShadow: selectedColor.name === preset.name ? '0 0 0 3px #FFFFFF, 0 0 0 5px ' + preset.color : 'none',
                      }}
                      title={preset.name}
                    />
                  ))}
                </div>
              </div>

              {/* Granular Module Checkboxes Matrix */}
              <div className="input-group" style={{ marginBottom: '22px' }}>
                <label className="input-label">
                  Configure Module Rights (View &amp; Edit / Control)
                </label>

                <div style={styles.matrixBox}>
                  {MODULE_DEFINITIONS.map(mod => {
                    const perm = permissionsState[mod.id] || { view: false, edit: false }

                    return (
                      <div key={mod.id} style={styles.modCheckRow}>
                        <div style={styles.modCheckInfo}>
                          <div style={styles.modCheckName}>{mod.label}</div>
                          <div style={styles.modCheckDesc}>{mod.desc}</div>
                        </div>

                        <div style={styles.checkActions}>
                          <label style={styles.checkLabel}>
                            <input
                              type="checkbox"
                              checked={perm.view}
                              onChange={() => handleTogglePerm(mod.id, 'view')}
                              style={styles.checkbox}
                            />
                            <span>View</span>
                          </label>

                          <label style={styles.checkLabel}>
                            <input
                              type="checkbox"
                              checked={perm.edit}
                              onChange={() => handleTogglePerm(mod.id, 'edit')}
                              style={styles.checkbox}
                            />
                            <span>Edit / Control</span>
                          </label>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div style={styles.modalBtnRow}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1.3 }}
                >
                  Save Group
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
          <div style={styles.deleteConfirmCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.deleteWarnIcon}>
              <Trash2 size={24} color="var(--color-danger)" />
            </div>

            <h3 style={styles.deleteTitle}>Delete Group?</h3>
            <p style={styles.deleteDesc}>
              Are you sure you want to delete <strong>'{groupToDelete.name}'</strong>? Staff members assigned to this group will revert to standard staff permissions.
            </p>

            <div style={styles.deleteBtnRow}>
              <button
                onClick={() => setGroupToDelete(null)}
                className="btn-secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmDelete}
                style={styles.confirmDeleteBtn}
              >
                Yes, Delete
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
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  toast: {
    position: 'fixed',
    top: '75px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1100,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 22px',
    borderRadius: 'var(--radius-full)',
    border: '1.5px solid',
    boxShadow: 'var(--shadow-lg)',
    fontSize: '0.86rem',
    fontWeight: '700',
    maxWidth: '90vw',
    animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '16px',
  },
  badgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '8px',
  },
  superBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '3px 10px',
    backgroundColor: 'var(--color-primary-subtle)',
    color: 'var(--color-primary-active)',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.72rem',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metaBadge: {
    fontSize: '0.72rem',
    color: 'var(--color-text-muted)',
    fontWeight: '600',
  },
  pageTitle: {
    fontSize: '1.5rem',
    color: 'var(--color-text-main)',
    marginBottom: '4px',
  },
  pageSubtitle: {
    fontSize: '0.88rem',
    color: 'var(--color-text-muted)',
    maxWidth: '680px',
    lineHeight: 1.5,
  },
  createBtn: {
    padding: '10px 18px',
    fontSize: '0.88rem',
    minHeight: '40px',
  },
  groupsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: '20px',
  },
  groupCard: {
    backgroundColor: 'var(--color-surface)',
    border: '1.5px solid var(--color-border)',
    borderRadius: '20px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: 'var(--shadow-sm)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '10px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  groupPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.8rem',
    fontWeight: '700',
  },
  systemBadge: {
    fontSize: '0.66rem',
    color: 'var(--color-text-muted)',
    backgroundColor: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    padding: '2px 8px',
    borderRadius: 'var(--radius-full)',
    fontWeight: '600',
  },
  deleteGroupBtn: {
    minHeight: '28px',
    width: '28px',
    borderRadius: 'var(--radius-sm)',
    padding: 0,
    backgroundColor: 'var(--color-danger-bg)',
    color: 'var(--color-danger)',
    border: '1px solid rgba(192, 57, 43, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupDesc: {
    fontSize: '0.82rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.45,
    marginBottom: '18px',
    minHeight: '36px',
  },
  permissionsMatrix: {
    backgroundColor: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: '14px',
    padding: '14px',
  },
  matrixTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '8px',
    borderBottom: '1px solid var(--color-border)',
    marginBottom: '10px',
  },
  matrixHeading: {
    fontSize: '0.72rem',
    fontWeight: '800',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  matrixSub: {
    fontSize: '0.7rem',
    color: 'var(--color-text-subtle)',
    fontWeight: '600',
  },
  modulesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  moduleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.78rem',
  },
  moduleLabel: {
    fontWeight: '600',
    color: 'var(--color-text-main)',
  },
  permBadgesRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  viewBadgeActive: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '0.68rem',
    fontWeight: '700',
    color: 'var(--color-primary-active)',
    backgroundColor: 'var(--color-primary-subtle)',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  editBadgeActive: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '0.68rem',
    fontWeight: '700',
    color: 'var(--color-success)',
    backgroundColor: 'var(--color-success-bg)',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  badgeDisabled: {
    fontSize: '0.66rem',
    color: 'var(--color-text-subtle)',
    backgroundColor: 'rgba(220, 211, 196, 0.4)',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(34, 42, 30, 0.6)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1200,
    padding: '20px',
  },
  modalCard: {
    backgroundColor: 'var(--color-bg)',
    border: '1.5px solid var(--color-border)',
    borderRadius: '20px',
    padding: '28px 26px',
    width: '100%',
    maxWidth: '560px',
    boxShadow: 'var(--shadow-modal)',
    maxHeight: '92vh',
    overflowY: 'auto',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
  },
  modalTitle: {
    fontSize: '1.3rem',
    color: 'var(--color-text-main)',
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: '0.8rem',
    color: 'var(--color-text-muted)',
    marginTop: '2px',
  },
  closeBtn: {
    minHeight: '30px',
    width: '30px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
  },
  colorRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '4px',
  },
  colorCircle: {
    width: '28px',
    height: '28px',
    minHeight: '28px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    transition: 'transform var(--transition-fast)',
  },
  matrixBox: {
    backgroundColor: 'var(--color-surface)',
    border: '1.5px solid var(--color-border)',
    borderRadius: '12px',
    padding: '10px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  modCheckRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '8px',
    borderBottom: '1px solid var(--color-border-light)',
  },
  modCheckInfo: {
    flex: 1,
  },
  modCheckName: {
    fontSize: '0.84rem',
    fontWeight: '700',
    color: 'var(--color-text-main)',
  },
  modCheckDesc: {
    fontSize: '0.72rem',
    color: 'var(--color-text-muted)',
  },
  checkActions: {
    display: 'flex',
    gap: '14px',
  },
  checkLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '0.78rem',
    fontWeight: '600',
    color: 'var(--color-text-main)',
    cursor: 'pointer',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
  },
  modalBtnRow: {
    display: 'flex',
    gap: '10px',
    marginTop: '10px',
  },
  deleteConfirmCard: {
    backgroundColor: 'var(--color-bg)',
    border: '1.5px solid var(--color-border)',
    borderRadius: '20px',
    padding: '28px 26px',
    width: '100%',
    maxWidth: '400px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  deleteWarnIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-danger-bg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '14px',
  },
  deleteTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: 'var(--color-text-main)',
    marginBottom: '8px',
  },
  deleteDesc: {
    fontSize: '0.86rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.5,
    marginBottom: '22px',
  },
  deleteBtnRow: {
    display: 'flex',
    gap: '10px',
    width: '100%',
  },
  confirmDeleteBtn: {
    flex: 1.3,
    backgroundColor: 'var(--color-danger)',
    color: '#FFFFFF',
    borderRadius: 'var(--radius-md)',
    fontWeight: '700',
    fontSize: '0.88rem',
    padding: '10px 16px',
    minHeight: '44px',
  }
}
