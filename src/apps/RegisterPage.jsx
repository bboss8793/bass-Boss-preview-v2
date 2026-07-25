import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { generateCode } from '../utils/generateCode'

const C = {
  bg: '#0a0900', card: '#111008', border: '#2a2000',
  gold: '#c8a030', goldLight: '#f0c84a', text: '#f0e8c8',
  muted: '#a08040', green: '#00cc66', red: '#ef4444',
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: C.muted }}>
        {label}{required && <span style={{ color: C.gold }}> *</span>}
      </label>
      {children}
    </div>
  )
}

function Input({ type = 'text', value, onChange, placeholder, autoComplete }) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      autoComplete={autoComplete}
      className="w-full rounded px-3 py-2.5 text-sm outline-none"
      style={{ backgroundColor: C.bg, color: C.text, border: `1px solid ${focused ? C.gold : C.border}`, caretColor: C.gold }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  )
}

// ─── Post-registration: org dashboard ─────────────────────────────────────────
function OrgDashboard({ org: initialOrg }) {
  const [org, setOrg] = useState(initialOrg)
  const [copied, setCopied] = useState(false)
  const [rosterMode, setRosterMode] = useState(initialOrg.roster_mode || 'open')
  const [roster, setRoster] = useState([])
  const [newName, setNewName] = useState('')
  const [addingName, setAddingName] = useState(false)
  const [savingMode, setSavingMode] = useState(false)

  useEffect(() => {
    supabase.from('roster').select('*').eq('team_id', org.id).order('name').then(({ data }) => setRoster(data || []))
  }, [org.id])

  async function toggleRosterMode(mode) {
    setSavingMode(true)
    const { data } = await supabase.from('teams').update({ roster_mode: mode }).eq('id', org.id).select().maybeSingle()
    if (data) { setOrg(data); setRosterMode(mode) }
    setSavingMode(false)
  }

  async function addRosterMember(e) {
    e.preventDefault()
    if (!newName.trim()) return
    setAddingName(true)
    const { data } = await supabase.from('roster').insert([{ team_id: org.id, name: newName.trim() }]).select().maybeSingle()
    if (data) setRoster((r) => [...r, data].sort((a, b) => a.name.localeCompare(b.name)))
    setNewName('')
    setAddingName(false)
  }

  async function removeRosterMember(id) {
    await supabase.from('roster').delete().eq('id', id)
    setRoster((r) => r.filter((m) => m.id !== id))
  }

  function copyCode() {
    navigator.clipboard.writeText(org.code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  const label = (org.org_type || org.type) === 'High School Team' ? 'Team Code' : 'Club Code'

  return (
    <div className="space-y-5">
      {/* Code display */}
      <div
        className="rounded-xl p-5 text-center"
        style={{ backgroundColor: C.card, border: `2px solid ${C.gold}`, boxShadow: `0 0 24px ${C.gold}22` }}
      >
        <p className="text-xs uppercase tracking-widest font-bold mb-2" style={{ color: C.muted }}>{label}</p>
        <p className="text-5xl font-bold tracking-[0.25em] my-3" style={{ color: C.goldLight, fontVariantNumeric: 'tabular-nums' }}>
          {org.org_code || org.code}
        </p>
        <p className="text-xs mb-4" style={{ color: C.muted }}>Share this with your anglers so they can join.</p>
        <button
          onClick={copyCode}
          className="px-6 py-2.5 rounded font-bold text-sm uppercase tracking-widest"
          style={{ backgroundColor: copied ? C.green : C.gold, color: C.bg, transition: 'background 0.2s' }}
        >
          {copied ? 'Copied!' : 'Copy Code'}
        </button>
      </div>

      {/* Roster mode */}
      <div className="rounded-xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
        <p className="text-xs uppercase tracking-widest font-bold mb-3" style={{ color: C.muted }}>Roster Mode</p>
        <div className="flex gap-3 mb-3">
          {['open', 'locked'].map((mode) => (
            <button
              key={mode}
              disabled={savingMode}
              onClick={() => toggleRosterMode(mode)}
              className="flex-1 py-2.5 rounded text-sm font-bold transition-colors disabled:opacity-50"
              style={{
                backgroundColor: rosterMode === mode ? C.gold : C.bg,
                color: rosterMode === mode ? C.bg : C.text,
                border: `1px solid ${rosterMode === mode ? C.gold : C.border}`,
              }}
            >
              {mode === 'open' ? 'Open' : 'Locked'}
            </button>
          ))}
        </div>
        <p className="text-xs leading-relaxed" style={{ color: C.muted }}>
          {rosterMode === 'open'
            ? 'Open — members type their name when joining. Good for walk-up events.'
            : 'Locked — members select from a pre-loaded list. Prevents name errors.'}
        </p>
      </div>

      {/* Roster list (locked mode) */}
      {rosterMode === 'locked' && (
        <div className="rounded-xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
          <p className="text-xs uppercase tracking-widest font-bold mb-3" style={{ color: C.muted }}>
            Pre-Loaded Roster ({roster.length})
          </p>
          <form onSubmit={addRosterMember} className="flex gap-2 mb-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Add angler name…"
              className="flex-1 rounded px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: C.bg, color: C.text, border: `1px solid ${C.border}` }}
            />
            <button
              type="submit"
              disabled={addingName || !newName.trim()}
              className="px-4 py-2 rounded font-bold text-sm disabled:opacity-50"
              style={{ backgroundColor: C.gold, color: C.bg }}
            >
              Add
            </button>
          </form>
          {roster.length === 0 ? (
            <p className="text-xs text-center py-3" style={{ color: C.muted }}>No roster yet. Add names above.</p>
          ) : (
            <ul className="space-y-1.5">
              {roster.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between px-3 py-2 rounded"
                  style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}
                >
                  <span className="text-sm" style={{ color: C.text }}>{m.name}</span>
                  <button
                    onClick={() => removeRosterMember(m.id)}
                    className="text-xs font-bold"
                    style={{ color: C.red }}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Registration form ─────────────────────────────────────────────────────────
export default function RegisterPage() {
  const [form, setForm] = useState({ fullName: '', email: '', password: '', orgName: '', orgType: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [createdOrg, setCreatedOrg] = useState(null)

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); setError('') }

  async function handleSubmit(e) {
    e.preventDefault()
    const { fullName, email, password, orgName, orgType } = form
    if (!fullName.trim()) return setError('Full name is required.')
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) return setError('A valid email is required.')
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    if (!orgType) return setError('Select organization type.')
    if (!orgName.trim()) return setError('Organization name is required.')

    setSaving(true)
    setError('')

    // Sign up
    const { data: authData, error: authErr } = await supabase.auth.signUp({ email: email.trim(), password })
    if (authErr) { setError(authErr.message); setSaving(false); return }

    const userId = authData.user?.id
    if (!userId) { setError('Registration failed — please try again.'); setSaving(false); return }

    // Generate a unique code
    let code = generateCode()
    let attempts = 0
    while (attempts < 10) {
      const { data: existing } = await supabase.from('teams').select('id').eq('org_code', code).maybeSingle()
      if (!existing) break
      code = generateCode()
      attempts++
    }

    const { data: orgData, error: orgErr } = await supabase.from('teams').insert([{
      name: orgName.trim(),
      org_type: orgType,
      org_code: code,
      director_name: form.fullName.trim(),
      director_email: form.email.trim(),
      status: 'active',
    }]).select().maybeSingle()

    if (orgErr) { setError(`Account created but org setup failed: ${orgErr.message}`); setSaving(false); return }

    setCreatedOrg(orgData)
    setSaving(false)
  }

  if (createdOrg) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: C.bg }}>
        <div className="max-w-lg mx-auto w-full px-5 py-8">
          <div className="flex items-center gap-3 mb-6">
            <img src="/Logo-crest.png" alt="" style={{ height: '40px' }} />
            <img src="/logo.png" alt="Bass Boss" style={{ height: '32px' }} />
          </div>
          <div className="mb-6">
            <p className="bb-title text-2xl font-bold mb-1" style={{ color: C.goldLight }}>
              Welcome, {form.fullName.split(' ')[0]}!
            </p>
            <p className="text-sm" style={{ color: C.muted }}>
              {createdOrg.name} is set up. Share your code with your anglers.
            </p>
          </div>
          <OrgDashboard org={createdOrg} />
          <p className="text-xs text-center mt-6" style={{ color: C.muted }}>
            Head to the <a href="/" style={{ color: C.gold }}>Club</a> or <a href="/" style={{ color: C.gold }}>Teams</a> tab to start a tournament.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: C.bg }}>
      <div className="max-w-lg mx-auto w-full px-5 py-8">
        <div className="flex items-center gap-3 mb-6">
          <img src="/Logo-crest.png" alt="" style={{ height: '40px' }} />
          <img src="/logo.png" alt="Bass Boss" style={{ height: '32px' }} />
        </div>

        <div className="mb-6">
          <p className="bb-title text-2xl font-bold mb-1" style={{ color: C.goldLight }}>
            Director / Coach Registration
          </p>
          <p className="text-sm" style={{ color: C.muted }}>
            Create your account to get your unique join code and manage your tournaments.
          </p>
        </div>

        <div className="rounded-xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Full Name" required>
              <Input value={form.fullName} onChange={(e) => set('fullName', e.target.value)} placeholder="Jane Smith" autoComplete="name" />
            </Field>
            <Field label="Email" required>
              <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="jane@example.com" autoComplete="email" />
            </Field>
            <Field label="Password" required>
              <Input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="8+ characters" autoComplete="new-password" />
            </Field>
            <Field label="Organization Type" required>
              <div className="flex gap-3">
                {['High School Team', 'Adult Club'].map((opt) => (
                  <button
                    key={opt} type="button" onClick={() => set('orgType', opt)}
                    className="flex-1 py-2.5 rounded text-sm font-bold transition-colors"
                    style={{ backgroundColor: form.orgType === opt ? C.gold : C.bg, color: form.orgType === opt ? C.bg : C.text, border: `1px solid ${form.orgType === opt ? C.gold : C.border}` }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </Field>
            <Field label={form.orgType === 'High School Team' ? 'Team Name' : 'Club Name'} required>
              <Input
                value={form.orgName}
                onChange={(e) => set('orgName', e.target.value)}
                placeholder={form.orgType === 'High School Team' ? 'Tomball Memorial Bass' : 'Lake Conroe Bass Club'}
              />
            </Field>

            {error && (
              <p className="text-xs text-center py-2 rounded font-bold" style={{ color: C.red, backgroundColor: '#1a0000', border: `1px solid ${C.red}40` }}>
                {error}
              </p>
            )}

            <button
              type="submit" disabled={saving}
              className="w-full py-3.5 rounded font-bold text-sm uppercase tracking-widest disabled:opacity-60"
              style={{ backgroundColor: C.gold, color: C.bg }}
            >
              {saving ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-xs text-center mt-4" style={{ color: C.muted }}>
          Already registered?{' '}
          <a href="/login" style={{ color: C.gold }}>Sign in</a>
        </p>
      </div>
    </div>
  )
}
