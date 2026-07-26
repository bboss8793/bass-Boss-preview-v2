import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const C = {
  bg: '#0a0900', card: '#111008', border: '#2a2000',
  gold: '#c8a030', goldLight: '#f0c84a', text: '#f0e8c8',
  muted: '#a08040', green: '#00cc66', red: '#ef4444',
}

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState('verifying') // verifying | ready | error | done
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Phase 1: exchange the recovery token from the URL hash for a session.
  // Supabase puts the token in the hash fragment as
  //   #type=recovery&access_token=...&refresh_token=...&expires_in=...
  // Calling getSession() after the redirect resolves the hash into a real
  // auth session. We then wait for the PASSWORD_RECOVERY event (handled in
  // OrgContext) to confirm the exchange succeeded before showing the form.
  useEffect(() => {
    let cancelled = false

    async function exchangeToken() {
      const hash = window.location.hash
      if (!hash || !hash.includes('access_token')) {
        setError('This link is invalid or has expired. Please request a new password-setup link.')
        setPhase('error')
        return
      }

      // detectPasswordRecovery will fire onAuthStateChange with event
      // PASSWORD_RECOVERY once the hash is resolved. We listen for it here
      // so the page knows the exchange worked and can show the form.
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (cancelled) return
        if (event === 'PASSWORD_RECOVERY') {
          setPhase('ready')
        } else if (event === 'SIGNED_IN') {
          // Some Supabase versions fire SIGNED_IN before PASSWORD_RECOVERY;
          // either way we can show the form.
          setPhase('ready')
        }
      })

      // Force the hash to be parsed into a session
      const { error: sessionErr } = await supabase.auth.getSession()
      if (cancelled) return

      if (sessionErr) {
        setError('This password-setup link is invalid or has expired. Please request a new one.')
        setPhase('error')
        subscription.unsubscribe()
        return
      }

      // Give the onAuthStateChange callback a moment to fire. If nothing
      // arrives within 3s, check whether we have a session anyway.
      setTimeout(async () => {
        if (cancelled) return
        if (phase === 'verifying') {
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            setPhase('ready')
          } else {
            setError('This password-setup link is invalid or has expired. Please request a new one.')
            setPhase('error')
          }
        }
        subscription.unsubscribe()
      }, 3000)
    }

    exchangeToken()

    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setSaving(true)
    const { error: updateErr } = await supabase.auth.updateUser({ password })
    setSaving(false)

    if (updateErr) {
      setError(updateErr.message)
      return
    }

    // Password set successfully — sign out so the recovery session is cleared,
    // then send them to the login page with a success flag.
    await supabase.auth.signOut()
    setPhase('done')
  }

  // ── Done state ──────────────────────────────────────────────────────────
  if (phase === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center px-5" style={{ backgroundColor: C.bg }}>
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-3 justify-center mb-6">
            <img src="/Logo-crest.png" alt="" style={{ height: '40px' }} />
            <img src="/logo.png" alt="Bass Boss" style={{ height: '32px' }} />
          </div>
          <div className="rounded-xl p-5 text-center" style={{ backgroundColor: C.card, border: `1px solid ${C.green}` }}>
            <p className="text-2xl mb-3" style={{ color: C.green }}>Password set!</p>
            <p className="text-sm mb-5" style={{ color: C.text }}>
              Your password has been saved. You can now sign in to your director dashboard.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 rounded font-bold text-sm uppercase tracking-widest"
              style={{ backgroundColor: C.gold, color: C.bg }}
            >
              Go to Sign In
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center px-5" style={{ backgroundColor: C.bg }}>
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-3 justify-center mb-6">
            <img src="/Logo-crest.png" alt="" style={{ height: '40px' }} />
            <img src="/logo.png" alt="Bass Boss" style={{ height: '32px' }} />
          </div>
          <div className="rounded-xl p-5 text-center" style={{ backgroundColor: C.card, border: `1px solid ${C.red}40` }}>
            <p className="text-lg font-bold mb-3" style={{ color: C.red }}>Link Expired</p>
            <p className="text-sm mb-5" style={{ color: C.text }}>{error}</p>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 rounded font-bold text-sm uppercase tracking-widest"
              style={{ backgroundColor: C.gold, color: C.bg }}
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Verifying state ──────────────────────────────────────────────────────
  if (phase === 'verifying') {
    return (
      <div className="min-h-screen flex items-center justify-center px-5" style={{ backgroundColor: C.bg }}>
        <div className="w-full max-w-sm text-center">
          <div className="flex items-center gap-3 justify-center mb-6">
            <img src="/Logo-crest.png" alt="" style={{ height: '40px' }} />
            <img src="/logo.png" alt="Bass Boss" style={{ height: '32px' }} />
          </div>
          <p className="text-sm" style={{ color: C.muted }}>Verifying your link…</p>
        </div>
      </div>
    )
  }

  // ── Ready state: password form ───────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center px-5" style={{ backgroundColor: C.bg }}>
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 justify-center mb-6">
          <img src="/Logo-crest.png" alt="" style={{ height: '40px' }} />
          <img src="/logo.png" alt="Bass Boss" style={{ height: '32px' }} />
        </div>
        <div className="rounded-xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
          <p className="bb-title font-bold text-base uppercase tracking-widest mb-2" style={{ color: C.goldLight }}>
            Set Your Password
          </p>
          <p className="text-xs mb-4" style={{ color: C.muted }}>
            Choose a password for your director account. You'll use this with your email to sign in.
          </p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError('') }}
              placeholder="New password (8+ characters)"
              autoComplete="new-password"
              autoFocus
              className="w-full rounded px-3 py-2.5 text-sm outline-none"
              style={{ backgroundColor: C.bg, color: C.text, border: `1px solid ${C.border}`, caretColor: C.gold }}
            />
            <input
              type="password"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setError('') }}
              placeholder="Confirm password"
              autoComplete="new-password"
              className="w-full rounded px-3 py-2.5 text-sm outline-none"
              style={{ backgroundColor: C.bg, color: C.text, border: `1px solid ${C.border}`, caretColor: C.gold }}
            />
            {error && (
              <p className="text-xs text-center font-bold py-2 rounded" style={{ color: C.red, backgroundColor: '#1a0000', border: `1px solid ${C.red}40` }}>
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded font-bold text-sm uppercase tracking-widest disabled:opacity-60"
              style={{ backgroundColor: C.gold, color: C.bg }}
            >
              {saving ? 'Saving…' : 'Set Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
