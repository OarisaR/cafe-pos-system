import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../shared/lib/supabase'
import {
  ROLES,
  ROLE_INFO,
  MODULES,
  normalizeRole,
  ROLE_MODULE_ACCESS,
  resolveLandingPath,
  getModulesForMatrix,
} from '../constants/rbac'
import {
  DEFAULT_PERMISSION_GROUPS,
  getStoredPermissionGroups,
  saveStoredPermissionGroups,
  getRoleForGroup,
  buildAccessMatrixFromGroup,
  RBAC_MODULE_TO_PERMISSION,
  mapGroupRowToGroup,
  mapGroupToRow,
} from '../constants/permissions'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

// Constants as per SRS
const IDLE_TIMEOUT_MS = 20 * 60 * 1000 // 20 minutes idle timeout (FR-AUT-05)
const IDLE_WARNING_MS = 18 * 60 * 1000 // Warning appears at 18 minutes (2 min countdown)

// Local storage keys for staff sync (Supabase এ কলাম না থাকলে fallback হিসেবে)
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
    const list = getDeletedStaffIds().filter((id) => id !== staffId)
    localStorage.setItem(DELETED_STAFF_KEY, JSON.stringify(list))
  } catch (err) {
    console.warn('Failed to unregister deleted staff ID:', err)
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)

  // `initializing` = প্রথমবার session পড়া হচ্ছে। এই সময় কোনো redirect করা যাবে না,
  // নাহলে refresh দিলেই logged-in user login পেজে ছিটকে যাবে।
  const [initializing, setInitializing] = useState(true)
  const [loading, setLoading] = useState(false) // form submit spinner
  const [error, setError] = useState(null)

  // Dynamic Permission Groups State
  const [permissionGroups, setPermissionGroups] = useState(() => getStoredPermissionGroups())
  // Supabase থেকে group গুলো আসার *আগেই* redirect করলে custom group এ বসা
  // user কে তার base role এর পেজে পাঠিয়ে দেওয়া হবে — যেটায় তার অনুমতি নেই।
  const [groupsLoaded, setGroupsLoaded] = useState(false)

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

  // =========================================================================
  // Profile loading — role এর একমাত্র নির্ভরযোগ্য উৎস হলো public.profiles.role
  // =========================================================================
  const fetchProfile = useCallback(async (authUser) => {
    if (!authUser) return null

    const metadata = authUser.user_metadata || {}
    const extraMap = getStaffExtraDataMap()
    const extra = extraMap[authUser.id] || {}

    let row = null
    try {
      const { data, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle()

      if (profErr) throw profErr
      row = data
    } catch (err) {
      console.warn('Profile fetch note:', err.message)
    }

    // Role priority: profiles table → auth metadata → নিরাপদ default (cashier)
    const resolvedRole = normalizeRole(row?.role || metadata.role)

    const merged = {
      id: authUser.id,
      email: row?.email || authUser.email,
      username: row?.username || (authUser.email || '').split('@')[0],
      full_name: row?.full_name || metadata.full_name || 'Staff Member',
      phone: row?.phone || metadata.phone || extra.phone || '',
      role: resolvedRole,
      permission_group_id:
        row?.permission_group_id || metadata.permission_group_id || extra.permission_group_id || null,
      is_confirmed: Boolean(row?.is_confirmed ?? authUser.email_confirmed_at),
      created_at: row?.created_at || authUser.created_at || null,
      updated_at: row?.updated_at || null,
      last_login_at: row?.last_login_at || null,
      // পুরনো কোডের সাথে compatibility
      resolved_role: resolvedRole,
    }

    setProfile(merged)
    return merged
  }, [])

  // =========================================================================
  // Session bootstrap — কোনো demo/auto-login নেই।
  // session না থাকলে user null থাকবে, আর router login পেজে পাঠাবে।
  // =========================================================================
  useEffect(() => {
    let active = true

    const initAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!active) return

        if (session?.user) {
          setUser(session.user)
          await fetchProfile(session.user)
        } else {
          setUser(null)
          setProfile(null)
        }
      } catch (err) {
        console.error('Initial session check error:', err)
        setUser(null)
        setProfile(null)
      } finally {
        if (active) setInitializing(false)
      }
    }

    initAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        setUser(null)
        setProfile(null)
        return
      }
      setUser(session.user)
      await fetchProfile(session.user)
    })

    return () => {
      active = false
      subscription?.unsubscribe()
    }
  }, [fetchProfile])

  // =========================================================================
  // Idle Timeout (FR-AUT-05)
  // =========================================================================
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

    events.forEach((ev) => window.addEventListener(ev, handleActivity))
    resetIdleTimers()

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleActivity))
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    }
  }, [user, showIdleWarning])

  // =========================================================================
  // Login — 100% Supabase. কোনো hardcoded bypass নেই।
  // =========================================================================
  const login = async (identifier, password) => {
    setError(null)
    setLoading(true)

    try {
      let email = identifier.trim()
      // username দিলে @cafepos.com বসিয়ে দেওয়া হয়
      if (!email.includes('@')) email = `${email.toLowerCase()}@cafepos.com`

      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authErr) throw authErr

      setUser(data.user)
      const prof = await fetchProfile(data.user)

      // last_login_at + is_confirmed stamp (schema না থাকলে চুপচাপ skip হবে)
      try {
        await supabase
          .from('profiles')
          .update({
            last_login_at: new Date().toISOString(),
            is_confirmed: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', data.user.id)
      } catch (stampErr) {
        console.warn('last_login_at stamp note:', stampErr?.message)
      }

      return { user: data.user, profile: prof }
    } catch (err) {
      let msg = err.message || 'Invalid credentials. Please check your email and password.'
      if (msg.toLowerCase().includes('invalid login credentials')) {
        msg = 'Wrong email or password. Please try again.'
      } else if (msg.toLowerCase().includes('email not confirmed')) {
        msg = 'This account is not confirmed yet. Please open the confirmation email first.'
      }
      setError(msg)
      throw new Error(msg)
    } finally {
      setLoading(false)
    }
  }

  // Sign up handler (self sign-up → সবসময় সর্বনিম্ন role: cashier)
  const signUp = async (email, password, fullName) => {
    setError(null)
    setLoading(true)

    try {
      const cleanEmail = email.trim()
      const { data, error: signErr } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: fullName.trim(),
            role: ROLES.CASHIER,
            permission_group_id: 'grp_cashier',
          },
        },
      })

      if (signErr) throw signErr

      if (data?.user) {
        const username = cleanEmail.split('@')[0]
        try {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email: cleanEmail,
            username,
            full_name: fullName.trim(),
            role: ROLES.CASHIER,
            permission_group_id: 'grp_cashier',
            updated_at: new Date().toISOString(),
          })
        } catch (dbErr) {
          console.warn('Profile table insert note:', dbErr.message)
        }
        return { user: data.user }
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
      setError(reason || null)
    }
  }

  // =========================================================================
  // User Profile Settings (Change Name, Phone, Password)
  // =========================================================================

  const updateUserProfile = async ({ fullName, phone }) => {
    if (!user) throw new Error('No active user session')

    try {
      const { error: authUpdateErr } = await supabase.auth.updateUser({
        data: { full_name: fullName.trim(), phone: phone.trim() },
      })
      if (authUpdateErr) console.warn('Auth metadata update note:', authUpdateErr.message)

      const { error: profErr } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (profErr) console.warn('Profile name update note:', profErr.message)

      saveStaffExtraData(user.id, { phone: phone.trim() })

      setProfile((prev) => ({
        ...prev,
        full_name: fullName.trim(),
        phone: phone.trim(),
      }))

      return true
    } catch (err) {
      console.error('Error updating user profile:', err)
      throw err
    }
  }

  const updateUserPassword = async (newPassword) => {
    if (!user) throw new Error('No active user session')

    const { error: pwdErr } = await supabase.auth.updateUser({ password: newPassword })
    if (pwdErr) throw pwdErr
    return true
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

      return (data || [])
        .filter((p) => !deletedIds.includes(p.id))
        .map((p) => {
          const extra = extraMap[p.id] || {}
          const role = normalizeRole(p.role)

          return {
            ...p,
            role,
            resolved_role: role,
            phone: p.phone || extra.phone || '',
            permission_group_id: p.permission_group_id ?? extra.permission_group_id ?? null,
            is_confirmed: Boolean(p.is_confirmed || p.last_login_at || extra.is_confirmed),
          }
        })
    } catch (err) {
      console.error('Error fetching staff members:', err)
      return []
    }
  }

  const createStaffUser = async ({ fullName, email, phone, initialPassword, groupId }) => {
    try {
      const cleanEmail = email.trim()
      const matchedGroup = permissionGroups.find((g) => g.id === groupId) || permissionGroups[0]
      // group থেকে সরাসরি canonical role — এটাই DB তে যাবে
      const dbRole = getRoleForGroup(groupId, permissionGroups)

      // বর্তমান owner এর session যেন signUp এর কারণে হারিয়ে না যায়
      const preservedSession = (await supabase.auth.getSession()).data.session

      const { data, error: authErr } = await supabase.auth.signUp({
        email: cleanEmail,
        password: initialPassword,
        options: {
          emailRedirectTo: window.location.origin + '/login',
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            permission_group_id: groupId,
            role: dbRole,
            initial_password: initialPassword,
          },
        },
      })

      if (authErr) throw authErr

      if (data?.user?.identities && data.user.identities.length === 0) {
        throw new Error('A user with this email address already exists.')
      }

      // signUp নতুন session বসিয়ে দিলে আগের owner session ফিরিয়ে আনা হয়
      if (preservedSession && data?.session && data.session.access_token !== preservedSession.access_token) {
        try {
          await supabase.auth.setSession({
            access_token: preservedSession.access_token,
            refresh_token: preservedSession.refresh_token,
          })
        } catch (restoreErr) {
          console.warn('Session restore note:', restoreErr?.message)
        }
      }

      if (data?.user) {
        removeDeletedStaffId(data.user.id)
        const username = cleanEmail.split('@')[0]

        try {
          await supabase.rpc('sync_user_phone', {
            user_id: data.user.id,
            new_phone: phone.trim(),
          })
        } catch (rpcErr) {
          console.warn('sync_user_phone RPC note:', rpcErr?.message)
        }

        const nowIso = new Date().toISOString()
        const { error: upsertErr } = await supabase.from('profiles').upsert({
          id: data.user.id,
          email: cleanEmail,
          username,
          full_name: fullName.trim(),
          role: dbRole,
          phone: phone.trim(),
          permission_group_id: groupId || null,
          is_confirmed: false,
          created_at: nowIso,
          updated_at: nowIso,
        })

        if (upsertErr) {
          console.warn('Profile upsert note (falling back to minimal columns):', upsertErr.message)
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email: cleanEmail,
            username,
            full_name: fullName.trim(),
            role: dbRole,
          })
        }

        saveStaffExtraData(data.user.id, {
          phone: phone.trim(),
          email: cleanEmail,
          permission_group_id: groupId || null,
          initial_password: initialPassword,
          is_confirmed: false,
          role: dbRole,
        })

        return {
          id: data.user.id,
          email: cleanEmail,
          username,
          full_name: fullName.trim(),
          phone: phone.trim(),
          initial_password: initialPassword,
          permission_group_id: groupId,
          role: dbRole,
          group_name: matchedGroup?.name,
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
    if (staffId === user?.id) {
      throw new Error('You cannot delete the account you are currently signed in with.')
    }

    try {
      addDeletedStaffId(staffId)

      const map = getStaffExtraDataMap()
      delete map[staffId]
      localStorage.setItem(STAFF_SYNC_KEY, JSON.stringify(map))

      try {
        const { error: rpcErr } = await supabase.rpc('delete_staff_user', { user_id: staffId })
        if (rpcErr) {
          console.warn('RPC delete note (falling back to table delete):', rpcErr.message)
          await supabase.from('profiles').delete().eq('id', staffId)
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

  /**
   * Permission group ই role এর একমাত্র নিয়ন্ত্রক।
   * কাউকে নতুন group এ সরালে তার profiles.role কলামও সাথে সাথে বদলে যায়।
   * সেভ হওয়া role টা return করে, যাতে UI সঠিক তথ্য দেখাতে পারে।
   */
  const updateUserGroup = async (staffId, newGroupId) => {
    const dbRole = getRoleForGroup(newGroupId, permissionGroups)

    // .select() দিয়ে লেখার পর আসল row ফেরত নেওয়া হয় — তাহলে RLS বা
    // constraint এর কারণে চুপচাপ ব্যর্থ হলে সেটা ধরা পড়ে।
    const { data, error: updErr } = await supabase
      .from('profiles')
      .update({
        role: dbRole,
        permission_group_id: newGroupId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', staffId)
      .select('id, role, permission_group_id')

    if (updErr) {
      console.error('Group update failed:', updErr)
      throw new Error(`Could not save the new group: ${updErr.message}`)
    }

    if (!data || data.length === 0) {
      throw new Error(
        'The database rejected this change (no row updated). Run supabase_setup.sql, then try again.'
      )
    }

    const savedRole = data[0].role

    // role আর group দুই জায়গায় থাকে। profiles উপরে লেখা হয়ে গেছে, কিন্তু
    // auth.users.raw_user_meta_data শুধু signUp এর সময় একবার লেখা হয়।
    // ওটা বদলাতে auth schema তে লেখার অধিকার লাগে, যা ব্রাউজার থেকে সম্ভব নয় —
    // তাই SECURITY DEFINER ফাংশন ডাকতে হয়।
    //
    // set_user_group() → role + permission_group_id দুটোই metadata তে লেখে।
    // ওটা না থাকলে (supabase_fix_group_sync.sql চালানো হয়নি) পুরনো
    // set_user_role() এ ফিরে যাওয়া হয়, যেটা শুধু role মেলায়।
    let { error: rpcErr } = await supabase.rpc('set_user_group', {
      user_id: staffId,
      new_group_id: newGroupId,
      new_role: savedRole,
    })

    if (rpcErr) {
      console.warn('set_user_group unavailable, falling back to set_user_role:', rpcErr.message)
      ;({ error: rpcErr } = await supabase.rpc('set_user_role', {
        user_id: staffId,
        new_role: savedRole,
      }))
      // role মিলেছে, কিন্তু metadata এর group এখনো পুরনো
      if (!rpcErr) {
        rpcErr = { message: 'set_user_group() missing — only role was synced to auth metadata' }
      }
    }

    saveStaffExtraData(staffId, { permission_group_id: newGroupId, role: savedRole })

    // নিজের group বদলালে sidebar সাথে সাথেই নতুন role অনুযায়ী বদলাবে
    if (user?.id === staffId) {
      setProfile((prev) => ({
        ...prev,
        permission_group_id: newGroupId,
        role: normalizeRole(savedRole),
        resolved_role: normalizeRole(savedRole),
      }))
    }

    if (rpcErr) {
      console.warn('Auth metadata sync incomplete:', rpcErr.message)
      return { role: savedRole, authMetadataSynced: false, syncError: rpcErr.message }
    }

    return { role: savedRole, authMetadataSynced: true }
  }

  const updateStaffPhone = async (staffId, newPhone) => {
    const cleanPhone = (newPhone || '').trim()
    try {
      try {
        await supabase.rpc('sync_user_phone', { user_id: staffId, new_phone: cleanPhone })
      } catch (rpcErr) {
        console.warn('sync_user_phone RPC note:', rpcErr?.message)
      }

      await supabase
        .from('profiles')
        .update({ phone: cleanPhone, updated_at: new Date().toISOString() })
        .eq('id', staffId)

      saveStaffExtraData(staffId, { phone: cleanPhone })

      if (user?.id === staffId) {
        setProfile((prev) => ({ ...prev, phone: cleanPhone }))
      }

      return true
    } catch (err) {
      console.error('Error updating staff phone:', err)
      throw err
    }
  }

  // =========================================================================
  // Permission Groups Management
  // =========================================================================

  /**
   * Custom group গুলো Supabase এ থাকে, localStorage শুধু offline cache.
   * এটা জরুরি — group টা যদি শুধু owner এর ব্রাউজারে থাকত, তাহলে staff
   * নিজের ল্যাপটপে লগইন করলে তার group এর সংজ্ঞাই খুঁজে পাওয়া যেত না,
   * আর সে base role (staff) এর UI দেখত।
   */
  const loadPermissionGroups = useCallback(async () => {
    try {
      const { data, error: grpErr } = await supabase
        .from('permission_groups')
        .select('*')
        .order('created_at', { ascending: true })

      if (grpErr) throw grpErr

      const fromDb = (data || []).map(mapGroupRowToGroup)

      // ডিফল্ট চারটা সবসময় থাকবে; DB তে একই id থাকলে DB এর version জেতে
      const merged = [
        ...DEFAULT_PERMISSION_GROUPS.map(
          (d) => fromDb.find((g) => g.id === d.id) || d
        ),
        ...fromDb.filter(
          (g) => !DEFAULT_PERMISSION_GROUPS.some((d) => d.id === g.id)
        ),
      ]

      setPermissionGroups(merged)
      saveStoredPermissionGroups(merged)
      setGroupsLoaded(true)
      return merged
    } catch (err) {
      // টেবিলটা এখনো তৈরি হয়নি (supabase_permission_groups.sql চালানো হয়নি)
      // অথবা নেট নেই — তখন cache টাই ব্যবহার হবে।
      console.warn(
        'permission_groups table unavailable, using local cache:',
        err.message
      )
      // ব্যর্থ হলেও অপেক্ষা থামাতে হবে, নাহলে লোডারেই আটকে থাকবে
      setGroupsLoaded(true)
      return null
    }
  }, [])

  // লগইন হলে বা session ফিরলে group গুলো সার্ভার থেকে টেনে আনা হয়
  useEffect(() => {
    if (user) loadPermissionGroups()
  }, [user, loadPermissionGroups])

  const createPermissionGroup = async (groupData) => {
    const newGroup = {
      ...groupData,
      id: 'grp_' + Date.now(),
      // কাস্টম group কোন base role এর উপর বসবে; না দিলে নিরাপদ default = staff
      role: normalizeRole(groupData.role || ROLES.STAFF),
      isDefault: false,
    }

    const { error: insErr } = await supabase
      .from('permission_groups')
      .insert(mapGroupToRow(newGroup))

    if (insErr) {
      console.error('Permission group insert failed:', insErr)
      throw new Error(
        `Could not save this role to the database: ${insErr.message}. ` +
          'Run supabase/patches/supabase_permission_groups.sql, then try again.'
      )
    }

    const updated = [...permissionGroups, newGroup]
    setPermissionGroups(updated)
    saveStoredPermissionGroups(updated)
    return newGroup
  }

  const updatePermissionGroup = async (groupId, updatedData) => {
    const updated = permissionGroups.map((g) => (g.id === groupId ? { ...g, ...updatedData } : g))
    setPermissionGroups(updated)
    saveStoredPermissionGroups(updated)

    const target = updated.find((g) => g.id === groupId)
    if (target) {
      const { error: updErr } = await supabase
        .from('permission_groups')
        .upsert(mapGroupToRow(target))

      // ⚠️ আগে এটা শুধু console এ warning দিত — তাই owner "saved" দেখতেন
      // অথচ সার্ভারে কিছুই বদলাত না, আর অন্য ব্রাউজারে পুরনো অধিকারই থাকত।
      if (updErr) {
        console.error('Permission group update failed:', updErr)
        throw new Error(
          `Could not save this role to the database: ${updErr.message}. ` +
            'Run supabase/patches/supabase_permission_groups.sql, then try again.'
        )
      }
    }
  }

  const deletePermissionGroup = async (groupId) => {
    const target = permissionGroups.find((g) => g.id === groupId)
    if (target?.isDefault) {
      throw new Error('Default system permission groups cannot be deleted.')
    }

    const { error: delErr } = await supabase
      .from('permission_groups')
      .delete()
      .eq('id', groupId)

    if (delErr) {
      console.error('Permission group delete failed:', delErr)
      throw new Error(`Could not delete this role: ${delErr.message}`)
    }

    const updated = permissionGroups.filter((g) => g.id !== groupId)
    setPermissionGroups(updated)
    saveStoredPermissionGroups(updated)

    const extraMap = getStaffExtraDataMap()
    let mapChanged = false
    Object.keys(extraMap).forEach((staffId) => {
      if (extraMap[staffId]?.permission_group_id === groupId) {
        extraMap[staffId].permission_group_id = null
        mapChanged = true
      }
    })
    if (mapChanged) localStorage.setItem(STAFF_SYNC_KEY, JSON.stringify(extraMap))

    try {
      await supabase
        .from('profiles')
        .update({ permission_group_id: null, updated_at: new Date().toISOString() })
        .eq('permission_group_id', groupId)
    } catch {}
  }

  const markStaffConfirmed = async (email) => {
    if (!email) return
    const extraMap = getStaffExtraDataMap()
    let changed = false
    Object.keys(extraMap).forEach((id) => {
      if (extraMap[id]?.email === email) {
        extraMap[id].is_confirmed = true
        changed = true
      }
    })
    if (changed) localStorage.setItem(STAFF_SYNC_KEY, JSON.stringify(extraMap))

    try {
      await supabase
        .from('profiles')
        .update({ is_confirmed: true, updated_at: new Date().toISOString() })
        .eq('email', email)
    } catch {}
  }

  // =========================================================================
  // Derived role state & permission helpers
  // =========================================================================

  const activeRole = normalizeRole(profile?.role)
  const isOwner = activeRole === ROLES.OWNER

  // এই user কোন permission group এ বসানো আছে
  const assignedGroup =
    permissionGroups.find((g) => g.id === profile?.permission_group_id) || null

  // Owner নিজে হাতে বানানো group = custom group. এই ক্ষেত্রে owner যে
  // toggle গুলো সেভ করেছেন, সেটাই access এর একমাত্র উৎস — role matrix নয়।
  // নাহলে custom role এ বসানো user সবসময় তার base role (staff) এর UI দেখত।
  const isCustomGroup = Boolean(assignedGroup && !assignedGroup.isDefault)

  const effectiveAccess = isCustomGroup
    ? buildAccessMatrixFromGroup(assignedGroup)
    : ROLE_MODULE_ACCESS[activeRole] || {}

  // Custom group এ বসানো user এর badge এ group এর নিজের নাম ও রং দেখাবে,
  // "Floor & Kitchen Staff" নয়।
  const currentRoleInfo = isCustomGroup
    ? {
        id: assignedGroup.id,
        name: assignedGroup.name,
        title: assignedGroup.name,
        badgeText: assignedGroup.name,
        color: assignedGroup.color || '#626F48',
        bgColor: assignedGroup.bgColor || 'rgba(98, 111, 72, 0.15)',
        description: assignedGroup.description || 'Custom permission role.',
      }
    : ROLE_INFO[activeRole] || ROLE_INFO[ROLES.CASHIER]

  const visibleModules = user ? getModulesForMatrix(effectiveAccess) : []

  /**
   * এই user module টা "দেখতে" পারবে কিনা।
   * Custom group হলে group এর matrix ই চূড়ান্ত।
   * Default group হলে আগের মতো: role matrix, group শুধু সংকুচিত করতে পারে।
   */
  // rbac এর module id কে group এর toggle key তে অনুবাদ করে
  const groupKeyFor = (moduleId) => RBAC_MODULE_TO_PERMISSION[moduleId] || moduleId

  const canAccess = (moduleId) => {
    if (!user) return false
    if (isCustomGroup) return Boolean(effectiveAccess[moduleId]?.view)

    const roleRule = ROLE_MODULE_ACCESS[activeRole]?.[moduleId]
    if (!roleRule?.view) return false

    const groupRule = assignedGroup?.permissions?.[groupKeyFor(moduleId)]
    if (groupRule && groupRule.view === false) return false

    return true
  }

  /** এই user module এ লেখা/পরিবর্তন করতে পারবে কিনা। */
  const canEdit = (moduleId) => {
    if (!canAccess(moduleId)) return false
    if (isCustomGroup) return Boolean(effectiveAccess[moduleId]?.edit)

    const roleRule = ROLE_MODULE_ACCESS[activeRole]?.[moduleId]
    if (!roleRule?.edit) return false

    const groupRule = assignedGroup?.permissions?.[groupKeyFor(moduleId)]
    if (groupRule && groupRule.edit === false) return false

    return true
  }

  // ---------------------------------------------------------------------
  // কোথায় নামবে — role এর পছন্দ নয়, যা সে আসলে খুলতে পারে সেটাই।
  // এখানেই সেই বাগটা ঠেকানো হয় যেখানে custom group এ বসা user কে
  // /dashboard/tables এ পাঠিয়ে "Access Restricted" দেখানো হচ্ছিল।
  // ---------------------------------------------------------------------
  const getLandingPath = (preferred = null) =>
    resolveLandingPath(activeRole, canAccess, preferred)

  const landingPath = getLandingPath()

  const value = {
    user,
    profile,
    role: activeRole,
    currentRoleInfo,
    isOwner,
    // পুরনো নাম, যাতে বাকি component গুলো ভাঙে না
    isSuperAdmin: isOwner,
    canAccess,
    canEdit,
    visibleModules,
    landingPath,
    getLandingPath,
    groupsLoaded,
    initializing,
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
    updateStaffPhone,
    markStaffConfirmed,
    // Permission Groups methods
    permissionGroups,
    loadPermissionGroups,
    createPermissionGroup,
    updatePermissionGroup,
    deletePermissionGroup,
    // Module id constants, যাতে কোথাও string hardcode করতে না হয়
    MODULES,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
