/**
 * Auth Context — Phase 1 (finalized)
 *
 * Provides: session, user, role, profile (from users table),
 * loading, isAuthenticated, hasRole, signIn, signUp, signOut,
 * and the role-based dashboard path helper.
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '@services/supabaseClient'

// ── Role → dashboard path mapping ─────────────────────────────────────────────

export const ROLE_DASHBOARD = {
  management_admin: '/admin/dashboard',
  hr_recruiter:     '/hr/dashboard',
  senior_manager:   '/manager/dashboard',
  employee:         '/employee/dashboard',
}

export function getDashboardPath(role) {
  return ROLE_DASHBOARD[role] ?? '/employee/dashboard'
}

// ── Context ────────────────────────────────────────────────────────────────────

const AuthContext = createContext(null)

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [session, setSession]   = useState(null)
  const [user, setUser]         = useState(null)
  const [role, setRole]         = useState(null)
  const [profile, setProfile]   = useState(null)   // row from public.users table
  const [loading, setLoading]   = useState(true)
  const fetchingRef = useRef(false)

  // ── Fetch role + profile from public.users ─────────────────────────────────
  const fetchProfile = useCallback(async (authUser) => {
    if (!authUser) { setProfile(null); setRole(null); return }
    if (fetchingRef.current) return
    fetchingRef.current = true
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .single()

      // JWT app_metadata is set by Supabase admins and is always authoritative.
      // Fall back to the DB role, then to 'employee' as the safest default.
      const appMeta  = authUser.app_metadata  ?? {}
      const userMeta = authUser.user_metadata  ?? {}
      const jwtRole  = appMeta.role ?? userMeta.role ?? null

      if (error) {
        // DB row missing — use JWT metadata
        setRole(jwtRole ?? 'employee')
        setProfile(null)
      } else {
        // Prefer JWT app_metadata role if it is explicitly set (non-null)
        // so that roles updated via the Supabase dashboard take immediate effect.
        setRole(jwtRole ?? data.role ?? 'employee')
        setProfile(data)
      }
    } catch {
      setRole('employee')
      setProfile(null)
    } finally {
      fetchingRef.current = false
    }
  }, [])

  // ── Session sync ───────────────────────────────────────────────────────────
  const syncSession = useCallback(async (s) => {
    setSession(s)
    setUser(s?.user ?? null)
    await fetchProfile(s?.user ?? null)
  }, [fetchProfile])

  // ── On mount: restore existing session ────────────────────────────────────
  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (!mounted) return
      await syncSession(s)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        if (!mounted) return
        // On SIGNED_IN and TOKEN_REFRESHED re-sync
        if (event === 'SIGNED_OUT') {
          setSession(null); setUser(null); setRole(null); setProfile(null)
        } else {
          await syncSession(s)
        }
      }
    )

    return () => { mounted = false; subscription.unsubscribe() }
  }, [syncSession])

  // ── signIn ─────────────────────────────────────────────────────────────────

  /**
   * Sign in with email + password.
   * On success, fetches the user's role from public.users.
   * Returns { data, error, role } — the role is needed for the redirect.
   */
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { data: null, error, role: null }

    // Resolve role: prefer JWT app_metadata (set by Supabase admins),
    // then the public.users DB row, then fall back to 'employee'.
    const appMeta  = data.user.app_metadata  ?? {}
    const userMeta = data.user.user_metadata ?? {}
    const jwtRole  = appMeta.role ?? userMeta.role ?? null

    let resolvedRole = jwtRole ?? 'employee'
    try {
      const { data: userRow } = await supabase
        .from('users')
        .select('role')
        .eq('auth_user_id', data.user.id)
        .single()
      // JWT wins if set, otherwise use DB row
      resolvedRole = jwtRole ?? userRow?.role ?? 'employee'
    } catch { /* use jwtRole or employee fallback */ }

    setRole(resolvedRole)
    return { data, error: null, role: resolvedRole }
  }

  // ── signUp ─────────────────────────────────────────────────────────────────

  /**
   * Create a new Supabase auth user then insert a row in public.users.
   * Returns { error } — null on success.
   */
  const signUp = async ({ email, password, fullName, role: selectedRole }) => {
    // 1. Create the auth user
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: selectedRole,
        },
      },
    })
    if (authError) return { error: authError }

    // 2. Insert into public.users (the auth trigger may already do this,
    //    but we do it explicitly with role to be safe)
    if (data?.user) {
      const { error: dbError } = await supabase.from('users').upsert({
        auth_user_id: data.user.id,
        email,
        full_name: fullName,
        role: selectedRole,
      }, { onConflict: 'auth_user_id' })

      if (dbError) console.warn('users row upsert failed:', dbError.message)
    }

    return { error: null }
  }

  // ── signOut ────────────────────────────────────────────────────────────────

  const signOut = async () => {
    await supabase.auth.signOut()
    setSession(null); setUser(null); setRole(null); setProfile(null)
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  const isAuthenticated = Boolean(session)
  const hasRole = (...allowedRoles) => allowedRoles.includes(role)
  const dashboardPath = getDashboardPath(role)

  // Display name priority: profile > user_metadata > email prefix
  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'User'

  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

  // ── Context value ──────────────────────────────────────────────────────────

  const value = {
    session,
    user,
    role,
    profile,
    loading,
    isAuthenticated,
    hasRole,
    dashboardPath,
    displayName,
    initials,
    signIn,
    signUp,
    signOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
