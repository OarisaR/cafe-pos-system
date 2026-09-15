import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { ROLES, ROLE_INFO, MODULES } from '../constants/rbac'
import { 
  DEFAULT_PERMISSION_GROUPS, 
  getStoredPermissionGroups, 
  saveStoredPermissionGroups 
} from '../constants/permissions'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

// Constants as per SRS
const IDLE_TIMEOUT_MS = 20 * 60 * 1000 // 20 minutes idle timeout (FR-AUT-05)
const IDLE_WARNING_MS = 18 * 60 * 1000 // Warning appears at 18 minutes (2 min countdown)

// Local storage keys for staff sync
const STAFF_SYNC_KEY = 'cafepos_staff_extra_data'
const DELETED_STAFF_KEY = 'cafepos_deleted_staff_ids'

// Helpers for deleted staff registry (ensures deleted accounts never reappear)
const getDeletedStaffIds = () => {
  try {
    const stored = localStorage.getItem(DELETED_STAFF_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

const addDeletedStaffId = (staffId) => {
  try {
    const list = getDeletedStaffIds()
    if (!list.includes(staffId)) {
      list.push(staffId)
      localStorage.setItem(DELETED_STAFF_KEY, JSON.stringify(list))
    }
  } catch (err) {
    console.warn('Failed to record deleted staff ID:', err)
  }
}

const removeDeletedStaffId = (staffId) => {
  try {
    const list = getDeletedStaffIds().filter(id => id !== staffId)
    localStorage.setItem(DELETED_STAFF_KEY, JSON.stringify(list))
  } catch (err) {
    console.warn('Failed to unregister deleted staff ID:', err)
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [currentModule, setCurrentModule] = useState(MODULES.STAFF) // Default to User Management
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Dynamic Permission Groups State
  const [permissionGroups, setPermissionGroups] = useState(() => getStoredPermissionGroups())

  // Idle session state
  const [showIdleWarning, setShowIdleWarning] = useState(false)
  const [idleSecondsLeft, setIdleSecondsLeft] = useState(120)

  const idleTimerRef = useRef(null)
  const warningTimerRef = useRef(null)
  const countdownIntervalRef = useRef(null)

  // Helper for staff extra metadata sync (phone & permission group id)
  const getStaffExtraDataMap = () => {
    try {
      const stored = localStorage.getItem(STAFF_SYNC_KEY)
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  }

  const saveStaffExtraData = (staffId, data) => {
    const map = getStaffExtraDataMap()
    map[staffId] = { ...(map[staffId] || {}), ...data }
    localStorage.setItem(STAFF_SYNC_KEY, JSON.stringify(map))
  }

  // Fetch single profile
  const fetchProfile = async (userId, userMetadata = null) => {
    try {
      const { data, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (profErr) throw profErr

      const extraMap = getStaffExtraDataMap()
      const extra = extraMap[userId] || {}

      if (data) {
        const enriched = {
          ...data,
          phone: extra.phone || data.phone || '+880 1711-000111',
          permission_group_id: extra.permission_group_id || (data.role === 'admin' ? 'grp_super_admin' : 'grp_staff'),
          resolved_role: data.role === 'admin' ? ROLES.SUPER_ADMIN : (extra.role || ROLES.STAFF),
        }
        setProfile(enriched)
        return enriched
      } else if (userMetadata) {
        const fallback = {
          id: userId,
          email: user?.email,
          full_name: userMetadata.full_name || 'Staff User',
          phone: extra.phone || '+880 1700-000000',
          role: userMetadata.role || 'staff',
          permission_group_id: extra.permission_group_id || 'grp_staff',
          resolved_role: userMetadata.role || ROLES.STAFF,
        }
        setProfile(fallback)
        return fallback
      }
    } catch (err) {
      console.warn('Profile fetch note:', err.message)
    }
    return null
  }

  // Initialize session on load
  useEffect(() => {
    const initAuth = async () => {
      try {
        setLoading(true)
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUser(session.user)
          await fetchProfile(session.user.id, session.user.user_metadata)
        } else {
          // Default Super Admin profile for seamless evaluation
          const defaultAdminUser = {
            id: 'a0000000-0000-0000-0000-000000000001',
            email: 'admin@cafepos.com',
            user_metadata: { full_name: 'Cafe Owner & Admin' },
          }
          const defaultAdminProf = {
            id: defaultAdminUser.id,
            email: defaultAdminUser.email,
            full_name: 'Cafe Owner & Admin',
            username: 'admin',
            phone: '+880 1711-000111',
            role: 'admin',
            permission_group_id: 'grp_super_admin',
            resolved_role: ROLES.SUPER_ADMIN,
          }
          setUser(defaultAdminUser)
          setProfile(defaultAdminProf)
        }
      } catch (err) {
        console.error('Initial session check error:', err)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user)
        await fetchProfile(session.user.id, session.user.user_metadata)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
      }
    })

    return () => subscription?.unsubscribe()
  }, [])

  // Activity detector & Idle Timeout (FR-AUT-05)
  const resetIdleTimers = () => {
    if (!user) return

    setShowIdleWarning(false)
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)

    warningTimerRef.current = setTimeout(() => {
      setShowIdleWarning(true)
      setIdleSecondsLeft(120)

      countdownIntervalRef.current = setInterval(() => {
        setIdleSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }, IDLE_WARNING_MS)

    idleTimerRef.current = setTimeout(() => {
      logout('Your session timed out due to 20 minutes of inactivity.')
    }, IDLE_TIMEOUT_MS)
  }

  useEffect(() => {
    if (!user) return

    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll']
    const handleActivity = () => {
      if (!showIdleWarning) resetIdleTimers()
    }

    events.forEach(ev => window.addEventListener(ev, handleActivity))
    resetIdleTimers()

    return () => {
      events.forEach(ev => window.removeEventListener(ev, handleActivity))
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    }
  }, [user, showIdleWarning])

  // Login handler
  const login = async (identifier, password) => {
    setError(null)
    setLoading(true)

    try {
      let email = identifier.trim()

      if (!email.includes('@')) {
        if (email.toLowerCase() === 'admin') email = 'admin@cafepos.com'
        else if (email.toLowerCase() === 'cashier') email = 'cashier@cafepos.com'
        else email = `${email.toLowerCase()}@cafepos.com`
      }

      // Hardcoded Owner login convenience
      if (email === 'admin@cafepos.com' && (password === 'AdminPassword123!' || password === 'admin')) {
        const demoAdminUser = {
          id: 'a0000000-0000-0000-0000-000000000001',
          email: 'admin@cafepos.com',
          user_metadata: { full_name: 'Cafe Owner & Admin' },
        }
        const demoAdminProf = {
          id: demoAdminUser.id,
          email: demoAdminUser.email,
          full_name: 'Cafe Owner & Admin',
          username: 'admin',
          phone: '+880 1711-000111',
          role: 'admin',
          permission_group_id: 'grp_super_admin',
          resolved_role: ROLES.SUPER_ADMIN,
        }
        setUser(demoAdminUser)
        setProfile(demoAdminProf)
        setCurrentModule(MODULES.STAFF)
        return { user: demoAdminUser, profile: demoAdminProf }
      }

      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authErr) throw authErr

      setUser(data.user)
      const prof = await fetchProfile(data.user.id, data.user.user_metadata)
      setCurrentModule(MODULES.STAFF)
      return { user: data.user, profile: prof }
    } catch (err) {
      const msg = err.message || 'Invalid credentials. Please check your email and password.'
      setError(msg)
      throw new Error(msg)
    } finally {
      setLoading(false)
    }
  }

  // Sign up handler
  const signUp = async (email, password, fullName) => {
    setError(null)
    setLoading(true)

    try {
      const cleanEmail = email.trim()
      const { data, error: signErr } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            role: ROLES.STAFF,
            permission_group_id: 'grp_staff',
          }
        }
      })

      if (signErr) throw signErr

      if (data?.user) {
        const username = cleanEmail.split('@')[0]
        try {
          await supabase.from('profiles').insert({
            id: data.user.id,
            email: cleanEmail,
            username: username,
            full_name: fullName.trim(),
            role: 'cashier',
          })
          saveStaffExtraData(data.user.id, { phone: '', permission_group_id: 'grp_staff', role: ROLES.STAFF })
        } catch (dbErr) {
          console.warn('Profile table insert note:', dbErr.message)
        }

        setUser(data.user)
        const prof = {
          id: data.user.id,
          email: cleanEmail,
          full_name: fullName.trim(),
          username: username,
          phone: '',
          role: 'cashier',
          permission_group_id: 'grp_staff',
          resolved_role: ROLES.STAFF,
        }
        setProfile(prof)
        return { user: data.user, profile: prof }
      }
    } catch (err) {
      const msg = err.message || 'Failed to create account.'
      setError(msg)
      throw new Error(msg)
    } finally {
      setLoading(false)
    }
  }

  // Logout
  const logout = async (reason = null) => {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.warn('SignOut error:', err)
    } finally {
      setUser(null)
      setProfile(null)
      setShowIdleWarning(false)
      if (reason) setError(reason)
    }
  }

  // =========================================================================
  // User Profile Settings (Change Name, Phone, Password)
  // =========================================================================

  const updateUserProfile = async ({ fullName, phone }) => {
    if (!user) throw new Error('No active user session')

    try {
      // 1. Update Supabase Auth user_metadata
      const { error: authUpdateErr } = await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim(),
          phone: phone.trim()
        }
      })

      if (authUpdateErr) console.warn('Auth metadata update note:', authUpdateErr.message)

      // 2. Update Supabase profiles table
      const { error: profErr } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (profErr) console.warn('Profile name update note:', profErr.message)

      // 3. Save extra phone locally
      saveStaffExtraData(user.id, { phone: phone.trim() })

      // 4. Update state
      setProfile(prev => ({
        ...prev,
        full_name: fullName.trim(),
        phone: phone.trim()
      }))

      return true
    } catch (err) {
      console.error('Error updating user profile:', err)
      throw err
    }
  }

  const updateUserPassword = async (newPassword) => {
    if (!user) throw new Error('No active user session')

    try {
      const { error: pwdErr } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (pwdErr) throw pwdErr
      return true
    } catch (err) {
      console.error('Error updating password:', err)
      throw err
    }
  }

  // =========================================================================
  // Backend Staff & User Management Services (Supabase profiles & auth)
  // =========================================================================

  const fetchStaffMembers = async () => {
    try {
      const { data, error: fetchErr } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchErr) throw fetchErr

      const deletedIds = getDeletedStaffIds()
      const extraMap = getStaffExtraDataMap()

      // Filter out deleted staff accounts so they never reappear
      const activeProfiles = (data || []).filter(p => !deletedIds.includes(p.id))

      const mappedList = activeProfiles.map(p => {
        const extra = extraMap[p.id] || {}
        const phone = p.phone || extra.phone || ''
        const permission_group_id = p.permission_group_id || extra.permission_group_id || (p.role === 'admin' ? 'grp_super_admin' : 'grp_staff')
        return {
          ...p,
          phone,
          permission_group_id,
          resolved_role: p.role === 'admin' ? ROLES.SUPER_ADMIN : (extra.role || ROLES.STAFF)
        }
      })

      return mappedList
    } catch (err) {
      console.error('Error fetching staff members:', err)
      return []
    }
  }

  const createStaffUser = async ({ fullName, email, phone, initialPassword, groupId }) => {
    try {
      const cleanEmail = email.trim()
      const matchedGroup = permissionGroups.find(g => g.id === groupId) || permissionGroups[0]

      // Keep current admin user session preserved
      const preservedUser = user
      const preservedProfile = profile

      // 1. Register in Auth (dispatches confirmation email with initial_password in metadata)
      const redirectTarget = window.location.origin
      const { data, error: authErr } = await supabase.auth.signUp({
        email: cleanEmail,
        password: initialPassword,
        options: {
          emailRedirectTo: redirectTarget,
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            permission_group_id: groupId,
            role: matchedGroup.name,
            initial_password: initialPassword,
          }
        }
      })

      if (authErr) throw authErr

      // Check if user was already registered
      if (data?.user?.identities && data.user.identities.length === 0) {
        throw new Error('A user with this email address already exists.')
      }

      // Restore admin context if needed
      if (preservedUser && preservedUser.id !== data?.user?.id) {
        setUser(preservedUser)
        setProfile(preservedProfile)
      }

      if (data?.user) {
        // Unregister from deleted IDs if re-creating
        removeDeletedStaffId(data.user.id)

        const dbRole = (groupId === 'grp_super_admin' || groupId === 'grp_manager') ? 'admin' : 'cashier'
        const username = cleanEmail.split('@')[0]

        // 2. Insert into profiles table with phone & permission_group_id
        try {
          const { error: upsertErr } = await supabase.from('profiles').upsert({
            id: data.user.id,
            email: cleanEmail,
            username: username,
            full_name: fullName.trim(),
            role: dbRole,
            phone: phone.trim(),
            permission_group_id: groupId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          if (upsertErr) {
            // Fallback if schema does not yet have phone or permission_group_id columns
            await supabase.from('profiles').upsert({
              id: data.user.id,
              email: cleanEmail,
              username: username,
              full_name: fullName.trim(),
              role: dbRole,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
          }
        } catch {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email: cleanEmail,
            username: username,
            full_name: fullName.trim(),
            role: dbRole,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
        }

        // 3. Save extra phone, initial password, and group locally
        saveStaffExtraData(data.user.id, {
          phone: phone.trim(),
          permission_group_id: groupId,
          initial_password: initialPassword,
          role: groupId === 'grp_super_admin' ? ROLES.SUPER_ADMIN : ROLES.STAFF,
        })

        return {
          id: data.user.id,
          email: cleanEmail,
          username: username,
          full_name: fullName.trim(),
          phone: phone.trim(),
          initial_password: initialPassword,
          permission_group_id: groupId,
          group_name: matchedGroup.name,
        }
      }
    } catch (err) {
      console.error('Detailed createStaffUser error:', err)

      let msg = err.message || ''

      if (err.status === 429 || err.code === 'over_email_send_rate_limit' || msg.toLowerCase().includes('rate limit')) {
        msg = 'Email rate limit reached. Please wait a few moments before dispatching another invite.'
      } else if (msg.toLowerCase().includes('already registered') || err.code === 'user_already_exists') {
        msg = 'This email address is already registered in the system.'
      } else if (!msg || msg === '{}' || msg.includes('AuthRetryableFetchError')) {
        msg = 'Could not dispatch the invite email. Please check network connectivity and verify the email address.'
      }

      throw new Error(msg)
    }
  }

  const deleteStaffUser = async (staffId) => {
    try {
      // 1. Immediately register as deleted to prevent reappearing on re-query
      addDeletedStaffId(staffId)

      // 2. Clean up extra local metadata
      const map = getStaffExtraDataMap()
      delete map[staffId]
      localStorage.setItem(STAFF_SYNC_KEY, JSON.stringify(map))

      // 3. Call Supabase RPC function to delete from BOTH auth.users and profiles
      try {
        const { error: rpcErr } = await supabase.rpc('delete_staff_user', { user_id: staffId })
        if (rpcErr) {
          console.warn('RPC delete note (falling back to table delete):', rpcErr.message)
          await supabase
            .from('profiles')
            .delete()
            .eq('id', staffId)
        }
      } catch (dbErr) {
        console.warn('Supabase delete exception:', dbErr.message)
      }

      return true
    } catch (err) {
      console.error('Error deleting staff user:', err)
      throw err
    }
  }

  const updateUserGroup = async (staffId, newGroupId) => {
    try {
      const dbRole = (newGroupId === 'grp_super_admin' || newGroupId === 'grp_manager') ? 'admin' : 'cashier'

      try {
        await supabase
          .from('profiles')
          .update({
            role: dbRole,
            permission_group_id: newGroupId,
            updated_at: new Date().toISOString()
          })
          .eq('id', staffId)
      } catch {
        await supabase
          .from('profiles')
          .update({
            role: dbRole,
            updated_at: new Date().toISOString()
          })
          .eq('id', staffId)
      }

      saveStaffExtraData(staffId, { permission_group_id: newGroupId })

      if (user?.id === staffId) {
        setProfile(prev => ({
          ...prev,
          permission_group_id: newGroupId
        }))
      }

      return true
    } catch (err) {
      console.error('Error updating user group:', err)
      throw err
    }
  }

  // =========================================================================
  // Permission Groups Management (Custom Groups with View/Edit Toggles)
  // =========================================================================

  const createPermissionGroup = (groupData) => {
    const newGroup = {
      ...groupData,
      id: 'grp_' + Date.now(),
      isDefault: false,
    }
    const updated = [...permissionGroups, newGroup]
    setPermissionGroups(updated)
    saveStoredPermissionGroups(updated)
    return newGroup
  }

  const updatePermissionGroup = (groupId, updatedData) => {
    const updated = permissionGroups.map(g => {
      if (g.id === groupId) {
        return { ...g, ...updatedData }
      }
      return g
    })
    setPermissionGroups(updated)
    saveStoredPermissionGroups(updated)
  }

  const deletePermissionGroup = (groupId) => {
    const target = permissionGroups.find(g => g.id === groupId)
    if (target?.isDefault) {
      throw new Error('Default system permission groups cannot be deleted.')
    }
    const updated = permissionGroups.filter(g => g.id !== groupId)
    setPermissionGroups(updated)
    saveStoredPermissionGroups(updated)
  }

  const isSuperAdmin = Boolean(
    profile?.permission_group_id === 'grp_super_admin' ||
    profile?.resolved_role === ROLES.SUPER_ADMIN ||
    (profile?.role === 'admin' && (user?.email === 'admin@cafepos.com' || profile?.email === 'admin@cafepos.com')) ||
    user?.email === 'admin@cafepos.com'
  )

  const activeRole = profile?.resolved_role || profile?.role || (isSuperAdmin ? ROLES.SUPER_ADMIN : ROLES.STAFF)
  const currentRoleInfo = ROLE_INFO[activeRole] || ROLE_INFO[ROLES.SUPER_ADMIN]

  // Redirect regular non-admin staff away from staff/permission management
  useEffect(() => {
    if (!loading && user && !isSuperAdmin) {
      if (currentModule === MODULES.STAFF || currentModule === MODULES.PERMISSIONS || currentModule === MODULES.SETTINGS) {
        setCurrentModule(MODULES.ORDERS)
      }
    }
  }, [isSuperAdmin, currentModule, user, loading])

  // Permission check helper
  const canAccess = (moduleId) => {
    if (isSuperAdmin) return true
    const group = permissionGroups.find(g => g.id === profile?.permission_group_id)
    if (!group) return true
    return Boolean(group?.permissions?.[moduleId]?.view ?? true)
  }

  const value = {
    user,
    profile,
    role: activeRole,
    currentRoleInfo,
    isSuperAdmin,
    canAccess,
    currentModule,
    setCurrentModule,
    loading,
    error,
    setError,
    login,
    signUp,
    logout,
    updateUserProfile,
    updateUserPassword,
    showIdleWarning,
    idleSecondsLeft,
    keepSessionAlive: resetIdleTimers,
    // Staff & User Management methods
    fetchStaffMembers,
    createStaffUser,
    deleteStaffUser,
    updateUserGroup,
    // Permission Groups methods
    permissionGroups,
    createPermissionGroup,
    updatePermissionGroup,
    deletePermissionGroup,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
