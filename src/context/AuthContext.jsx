import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

// Constants as per SRS
const IDLE_TIMEOUT_MS = 20 * 60 * 1000 // 20 minutes idle timeout (FR-AUT-05)
const IDLE_WARNING_MS = 18 * 60 * 1000 // Warning appears at 18 minutes (2 min countdown)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Idle session state
  const [showIdleWarning, setShowIdleWarning] = useState(false)
  const [idleSecondsLeft, setIdleSecondsLeft] = useState(120)

  const idleTimerRef = useRef(null)
  const warningTimerRef = useRef(null)
  const countdownIntervalRef = useRef(null)

  // Fetch user profile from Supabase
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      setProfile(data)
      return data
    } catch (err) {
      console.error('Error fetching user profile:', err)
      return null
    }
  }

  // Activity detector & Idle Timeout (FR-AUT-05)
  const resetIdleTimers = () => {
    if (!user) return

    setShowIdleWarning(false)
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)

    // Set 18-minute warning timer
    warningTimerRef.current = setTimeout(() => {
      setShowIdleWarning(true)
      setIdleSecondsLeft(120)

      // Start 2-minute countdown
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

    // Set 20-minute auto logout timer
    idleTimerRef.current = setTimeout(() => {
      logout('Your session timed out due to 20 minutes of inactivity.')
    }, IDLE_TIMEOUT_MS)
  }

  useEffect(() => {
    if (!user) return

    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll']
    const handleActivity = () => {
      if (!showIdleWarning) {
        resetIdleTimers()
      }
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

  // Initial Auth Check
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUser(session.user)
          await fetchProfile(session.user.id)
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
        await fetchProfile(session.user.id)
      } else {
        setUser(null)
        setProfile(null)
      }
      setLoading(false)
    })

    return () => subscription?.unsubscribe()
  }, [])

  // Login handler with lockout enforcement (FR-AUT-01, FR-AUT-02)
  const login = async (identifier, password) => {
    setError(null)
    setLoading(true)

    try {
      let email = identifier.trim()

      // If user provided a username instead of email, look up email
      if (!email.includes('@')) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', email)
          .single()

        if (prof) {
          // Predefined emails for username aliases
          if (email === 'admin') email = 'admin@cafepos.com'
          else if (email === 'cashier') email = 'cashier@cafepos.com'
        }
      }

      // 1. Check if account is currently locked out
      const { data: profileCheck } = await supabase
        .from('profiles')
        .select('failed_login_attempts, locked_until')
        .or(`username.eq.${identifier},email.eq.${email}`)
        .maybeSingle()

      if (profileCheck?.locked_until) {
        const lockExpiration = new Date(profileCheck.locked_until)
        const now = new Date()
        if (now < lockExpiration) {
          const minutesRemaining = Math.ceil((lockExpiration - now) / (1000 * 60))
          throw new Error(`Account is locked due to 5 failed attempts. Please retry in ${minutesRemaining} minute(s).`)
        }
      }

      // 2. Perform Supabase Auth
      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (authErr) {
        // Record failed attempt
        const { data: rpcResult } = await supabase.rpc('record_failed_login', {
          user_identifier: identifier
        })

        if (rpcResult?.is_locked) {
          throw new Error('Account locked for 15 minutes after 5 consecutive failed login attempts.')
        } else if (rpcResult?.attempts_remaining !== undefined) {
          throw new Error(`Invalid credentials. ${rpcResult.attempts_remaining} attempt(s) remaining before account lockout.`)
        }

        throw new Error(authErr.message || 'Invalid login credentials')
      }

      // 3. Record successful login and reset lockout
      await supabase.rpc('record_successful_login', {
        user_identifier: identifier
      })

      setUser(data.user)
      const userProfile = await fetchProfile(data.user.id)
      return { user: data.user, profile: userProfile }
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Logout
  const logout = async (reason = null) => {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      setUser(null)
      setProfile(null)
      setShowIdleWarning(false)
      if (reason) setError(reason)
    }
  }

  // Quick 1-click Demo Logins for smooth evaluation
  const loginDemoAdmin = async () => {
    return login('admin@cafepos.com', 'AdminPassword123!')
  }

  const loginDemoCashier = async () => {
    return login('cashier@cafepos.com', 'CashierPassword123!')
  }

  // RBAC Permission Evaluator (FR-AUT-03, FR-AUT-04)
  const canAccess = (moduleName) => {
    if (!profile) return false
    if (profile.role === 'admin') return true

    // Cashier role only gets Order, Table, and Billing modules
    if (profile.role === 'cashier') {
      const allowedModules = ['pos', 'order', 'orders', 'table', 'tables', 'billing', 'receipt']
      return allowedModules.includes(moduleName.toLowerCase())
    }

    return false
  }

  const value = {
    user,
    profile,
    role: profile?.role || null,
    loading,
    error,
    setError,
    login,
    logout,
    loginDemoAdmin,
    loginDemoCashier,
    canAccess,
    showIdleWarning,
    idleSecondsLeft,
    keepSessionAlive: resetIdleTimers
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
