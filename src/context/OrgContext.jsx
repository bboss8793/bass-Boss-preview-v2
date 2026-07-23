import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const OrgContext = createContext(null)

const SESSION_KEY = 'bb_member_session'

function loadStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

function clearStoredSession() {
  localStorage.removeItem(SESSION_KEY)
}

export function OrgProvider({ children }) {
  const [authUser, setAuthUser] = useState(null)
  const [org, setOrg] = useState(null)
  const [memberSession, setMemberSessionState] = useState(loadStoredSession)

  // True until the initial Supabase auth check resolves
  const [loadingAuth, setLoadingAuth] = useState(true)
  // True while a director org lookup is in flight (runs after auth resolves)
  const [loadingOrg, setLoadingOrg] = useState(false)
  // True while validating a stored member session against the DB
  const [validatingSession, setValidatingSession] = useState(() => !!loadStoredSession())

  // ── Auth bootstrap ────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null
      // Preemptively mark org loading so there is never a render where
      // loadingAuth=false AND loadingOrg=false while rawOrg is still null.
      // Without this, isDirector=false for one frame → OrgGate flashes
      // JoinFlow before the org fetch resolves → dashboard snaps in,
      // which looks like the gate was skipped entirely.
      if (user) setLoadingOrg(true)
      setAuthUser(user)
      setLoadingAuth(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      const user = session?.user ?? null
      // Same guard for runtime sign-in (director signing in from JoinFlow).
      if (user) setLoadingOrg(true)
      setAuthUser(user)
    })
    return () => subscription.unsubscribe()
  }, [])

  // ── Director org fetch (runs whenever auth user changes) ──────────────────
  useEffect(() => {
    if (!authUser) {
      setOrg(null)
      setLoadingOrg(false)
      return
    }
    setLoadingOrg(true)
    supabase
      .from('organizations')
      .select('*')
      .eq('director_id', authUser.id)
      .maybeSingle()
      .then(({ data }) => {
        setOrg(data || null)
        setLoadingOrg(false)
      })
  }, [authUser])

  // ── Validate stored member session against DB on mount ────────────────────
  // Prevents a stale localStorage session from bypassing the gate silently.
  useEffect(() => {
    const stored = loadStoredSession()
    if (!stored?.orgId) {
      setValidatingSession(false)
      return
    }
    supabase
      .from('organizations')
      .select('id, type')
      .eq('id', stored.orgId)
      .eq('type', stored.orgType)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          // Org no longer exists or type mismatch — discard the stale session
          clearStoredSession()
          setMemberSessionState(null)
        }
        setValidatingSession(false)
      })
  }, []) // runs once on mount

  function setMemberSession(session) {
    saveSession(session)
    setMemberSessionState(session)
  }

  function signOut() {
    clearStoredSession()
    setMemberSessionState(null)
    supabase.auth.signOut()
  }

  const isDirector = !!authUser && !!org

  // The "active org" surfaces whichever identity is in play right now.
  const activeOrg = isDirector
    ? org
    : memberSession
      ? { id: memberSession.orgId, name: memberSession.orgName, type: memberSession.orgType }
      : null

  // Any gate should wait until ALL async checks have resolved.
  const loading = loadingAuth || loadingOrg || validatingSession

  return (
    <OrgContext.Provider value={{
      authUser,
      org: activeOrg,
      isDirector,
      memberSession,
      setMemberSession,
      clearMemberSession: () => { clearStoredSession(); setMemberSessionState(null) },
      signOut,
      loading,
    }}>
      {children}
    </OrgContext.Provider>
  )
}

export function useOrg() {
  return useContext(OrgContext)
}
