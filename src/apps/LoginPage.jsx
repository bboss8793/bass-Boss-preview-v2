import { useState } from 'react'
import { supabase } from '../lib/supabase'

const C = {
  bg: '#0a0900', card: '#111008', border: '#2a2000',
  gold: '#c8a030', goldLight: '#f0c84a', text: '#f0e8c8',
  muted: '#a08040', red: '#ef4444',
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim() || !password) return setError('Email and password are required.')
    setSaving(true)
    setError('')
    const { error: authErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setSaving(false)
    if (authErr) setError(authErr.message)
    // On success, OrgContext picks up the session automatically
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5" style={{ backgroundColor: C.bg }}>
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 justify-center mb-6">
          <img src="/Logo-crest.png" alt="" style={{ height: '40px' }} />
          <img src="/logo.png" alt="Bass Boss" style={{ height: '32px' }} />
        </div>
        <div className="rounded-xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
          <p className="bb-title font-bold text-base uppercase tracking-widest mb-4" style={{ color: C.goldLight }}>
            Director / Coach Sign In
          </p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError('') }}
              placeholder="Email" autoComplete="email"
              className="w-full rounded px-3 py-2.5 text-sm outline-none"
              style={{ backgroundColor: C.bg, color: C.text, border: `1px solid ${C.border}`, caretColor: C.gold }}
            />
            <input
              type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError('') }}
              placeholder="Password" autoComplete="current-password"
              className="w-full rounded px-3 py-2.5 text-sm outline-none"
              style={{ backgroundColor: C.bg, color: C.text, border: `1px solid ${C.border}`, caretColor: C.gold }}
            />
            {error && (
              <p className="text-xs text-center font-bold py-2 rounded" style={{ color: C.red, backgroundColor: '#1a0000', border: `1px solid ${C.red}40` }}>
                {error}
              </p>
            )}
            <button
              type="submit" disabled={saving}
              className="w-full py-3 rounded font-bold text-sm uppercase tracking-widest disabled:opacity-60"
              style={{ backgroundColor: C.gold, color: C.bg }}
            >
              {saving ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>
        <p className="text-xs text-center mt-4" style={{ color: C.muted }}>
          New director?{' '}
          <a href="/register" style={{ color: C.gold }}>Create an account</a>
        </p>
      </div>
    </div>
  )
}
