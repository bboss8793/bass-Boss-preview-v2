import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useOrg } from '../../context/OrgContext'

const C = {
  bg: '#0a0900', card: '#111008', border: '#2a2000',
  gold: '#c8a030', goldLight: '#f0c84a', text: '#f0e8c8',
  muted: '#a08040', green: '#00cc66', red: '#ef4444',
}

const PLANS = [
  { name: 'Starter',  anglers: 'Up to 20', tournaments: '6/year',    adultAnnual: '$249/yr', adultMonthly: '$25/mo', hsAnnual: '$299/yr', hsMonthly: '$30/mo' },
  { name: 'Standard', anglers: 'Up to 35', tournaments: 'Unlimited', adultAnnual: '$349/yr', adultMonthly: '$35/mo', hsAnnual: '$399/yr', hsMonthly: '$40/mo' },
  { name: 'Pro',      anglers: 'Unlimited', tournaments: 'Unlimited', adultAnnual: '$449/yr', adultMonthly: '$45/mo', hsAnnual: '$499/yr', hsMonthly: '$50/mo' },
]

const FEATURES = [
  'Live tournament leaderboards',
  'GPS emergency safety system',
  'Photo submission & verify codes',
  'Real-time parent live feed',
  'Weather & solunar conditions',
  'Coach/Director certification course',
  'Direct founder support during beta',
]

function PricingModal({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 py-8 overflow-y-auto"
      style={{ backgroundColor: 'rgba(0,0,0,0.88)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md rounded-2xl"
        style={{ backgroundColor: C.bg, border: `2px solid ${C.gold}`, boxShadow: `0 0 40px ${C.gold}22` }}
      >
        {/* Close */}
        <div className="flex justify-end px-5 pt-4 pb-0">
          <button
            onClick={onClose}
            className="text-sm font-bold transition-opacity hover:opacity-70 w-7 h-7 flex items-center justify-center rounded"
            style={{ color: C.muted, border: `1px solid ${C.border}` }}
          >
            ✕
          </button>
        </div>

        {/* Beta banner */}
        <div className="text-center px-6 pt-2 pb-5" style={{ borderBottom: `1px solid ${C.border}` }}>
          <p className="text-3xl font-bold tracking-widest mb-1" style={{ color: C.gold }}>
            FREE DURING BETA
          </p>
          <p className="text-sm" style={{ color: C.muted }}>
            Limited spots available — request access to join
          </p>
        </div>

        {/* Pricing table */}
        <div className="px-5 pt-5 pb-4">
          <p className="text-xs font-bold uppercase tracking-widest text-center mb-3" style={{ color: C.muted }}>
            After beta, plans start at $249/year
          </p>

          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
            {/* Column headers */}
            <div className="grid grid-cols-4" style={{ backgroundColor: C.card }}>
              <div className="px-2 py-2.5" />
              {PLANS.map(p => (
                <div
                  key={p.name}
                  className="px-1 py-2.5 text-center"
                  style={{ borderLeft: `1px solid ${C.border}` }}
                >
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: C.goldLight }}>
                    {p.name}
                  </p>
                </div>
              ))}
            </div>

            {/* Anglers */}
            <TableRow label="Anglers" values={PLANS.map(p => (
              <span style={{ color: C.text }}>{p.anglers}</span>
            ))} />

            {/* Tournaments */}
            <TableRow label="Events" values={PLANS.map(p => (
              <span style={{ color: C.text }}>{p.tournaments}</span>
            ))} />

            {/* Adult Club */}
            <TableRow
              label="Adult Club"
              highlight
              values={PLANS.map(p => (
                <>
                  <p className="text-sm font-bold" style={{ color: C.gold }}>{p.adultAnnual}</p>
                  <p className="text-xs mt-0.5" style={{ color: C.muted }}>or {p.adultMonthly}</p>
                </>
              ))}
            />

            {/* High School */}
            <TableRow
              label="High School"
              highlight
              values={PLANS.map(p => (
                <>
                  <p className="text-sm font-bold" style={{ color: C.gold }}>{p.hsAnnual}</p>
                  <p className="text-xs mt-0.5" style={{ color: C.muted }}>or {p.hsMonthly}</p>
                </>
              ))}
            />
          </div>

          <p className="text-xs text-center mt-2.5 italic" style={{ color: C.muted }}>
            Save up to 20% with an annual plan
          </p>
        </div>

        {/* Features */}
        <div className="px-5 pb-4" style={{ borderTop: `1px solid ${C.border}` }}>
          <p className="text-xs font-bold uppercase tracking-widest mt-4 mb-3" style={{ color: C.muted }}>
            Every plan includes:
          </p>
          <ul className="space-y-2">
            {FEATURES.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="shrink-0 mt-0.5 font-bold" style={{ color: C.gold }}>•</span>
                <span style={{ color: C.text }}>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <div className="px-5 pb-6 pt-2">
          <Link
            to="/"
            className="block w-full py-3.5 rounded font-bold text-sm uppercase tracking-widest text-center transition-opacity hover:opacity-90"
            style={{ backgroundColor: C.gold, color: C.bg }}
          >
            Request Access
          </Link>
          <p className="text-xs text-center mt-3" style={{ color: C.muted }}>
            Already have a code? Close this and enter it below.
          </p>
        </div>
      </div>
    </div>
  )
}

function TableRow({ label, values, highlight = false }) {
  return (
    <div
      className="grid grid-cols-4"
      style={{
        borderTop: `1px solid ${C.border}`,
        backgroundColor: highlight ? `${C.gold}08` : undefined,
      }}
    >
      <div className="px-2 py-2.5">
        <p className="text-xs font-bold leading-tight" style={{ color: C.muted }}>{label}</p>
      </div>
      {values.map((val, i) => (
        <div
          key={i}
          className="px-1 py-2.5 text-center"
          style={{ borderLeft: `1px solid ${C.border}` }}
        >
          {val}
        </div>
      ))}
    </div>
  )
}

export default function JoinFlow({ orgType }) {
  const { setMemberSession } = useOrg()

  const [code, setCode] = useState('')
  const [step, setStep] = useState('code') // 'code' | 'name' | 'roster' | 'signin'
  const [foundOrg, setFoundOrg] = useState(null)
  const [roster, setRoster] = useState([])
  const [memberName, setMemberName] = useState('')
  const [selectedName, setSelectedName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)

  const codeLabel = orgType === 'team' ? 'Team Code' : 'Club Code'
  const roleLabel = orgType === 'team' ? 'Coach' : 'Director'

  async function submitCode(e) {
    e.preventDefault()
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return setError(`Enter your ${codeLabel}.`)
    setLoading(true)
    setError('')
    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('code', trimmed)
      .eq('type', orgType)
      .maybeSingle()

    if (!org) {
      setError(`Invalid ${codeLabel}. Check with your ${roleLabel}.`)
      setLoading(false)
      return
    }

    setFoundOrg(org)

    if (org.roster_mode === 'locked') {
      const { data: members } = await supabase
        .from('roster_members')
        .select('*')
        .eq('org_id', org.id)
        .order('name')
      setRoster(members || [])
      setStep('roster')
    } else {
      setStep('name')
    }
    setLoading(false)
  }

  function confirmName(e) {
    e.preventDefault()
    const name = memberName.trim()
    if (!name) return setError('Enter your name.')
    setMemberSession({
      orgId: foundOrg.id,
      orgName: foundOrg.name,
      orgType: foundOrg.type,
      memberName: name,
    })
  }

  function confirmRoster(e) {
    e.preventDefault()
    if (!selectedName) return setError('Select your name.')
    setMemberSession({
      orgId: foundOrg.id,
      orgName: foundOrg.name,
      orgType: foundOrg.type,
      memberName: selectedName,
    })
  }

  async function submitSignIn(e) {
    e.preventDefault()
    if (!email.trim() || !password) return setError('Email and password are required.')
    setLoading(true)
    setError('')
    const { error: authErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)
    if (authErr) {
      setError(authErr.message)
      return
    }
    // OrgContext picks up the auth state change automatically — OrgGate will
    // transition to the director dashboard once the org row is loaded.
  }

  const stepTitle = {
    code: `Enter ${codeLabel}`,
    name: 'Enter Your Name',
    roster: 'Select Your Name',
    signin: `${roleLabel} Sign In`,
  }[step]

  return (
    <>
      {showModal && <PricingModal onClose={() => setShowModal(false)} />}

      <div className="min-h-[60vh] flex items-center justify-center px-5 py-10">
        <div
          className="w-full max-w-sm rounded-2xl overflow-hidden"
          style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}
        >
          {/* Header */}
          <div className="px-5 py-5" style={{ borderBottom: `1px solid ${C.border}` }}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-3">
                <img src="/Logo-crest.png" alt="" style={{ height: '36px' }} />
                <img src="/logo.png" alt="Bass Boss" style={{ height: '28px' }} />
              </div>
              {step === 'code' && (
                <button
                  type="button"
                  onClick={() => setShowModal(true)}
                  className="text-xs font-semibold transition-opacity hover:opacity-70 px-2 py-1 rounded"
                  style={{ color: C.gold, border: `1px solid ${C.border}` }}
                >
                  Learn More
                </button>
              )}
            </div>
            {step === 'code' && (
              <p className="text-xs mt-2 mb-0" style={{ color: C.muted }}>
                Free during beta —{' '}
                <button
                  type="button"
                  onClick={() => setShowModal(true)}
                  className="transition-opacity hover:opacity-70"
                  style={{ color: C.gold, textDecoration: 'underline', textUnderlineOffset: '2px' }}
                >
                  see plans
                </button>
              </p>
            )}
            <p className="font-bold text-sm uppercase tracking-widest mt-2" style={{ color: C.goldLight }}>
              {stepTitle}
            </p>
            {foundOrg && step !== 'signin' && (
              <p className="text-xs mt-0.5" style={{ color: C.muted }}>{foundOrg.name}</p>
            )}
          </div>

          <div className="px-5 py-5">
            {/* ── Member: enter code ─────────────────────────────────── */}
            {step === 'code' && (
              <div className="space-y-4">
                <form onSubmit={submitCode} className="space-y-3">
                  <input
                    value={code}
                    onChange={(e) => { setCode(e.target.value.toUpperCase()); setError('') }}
                    placeholder={`Enter your ${codeLabel}`}
                    maxLength={8}
                    className="w-full rounded px-3 py-3 text-base font-bold text-center uppercase outline-none"
                    style={{ backgroundColor: C.bg, color: C.goldLight, border: `1px solid ${C.border}`, caretColor: C.gold }}
                    onFocus={(e) => (e.target.style.borderColor = C.gold)}
                    onBlur={(e) => (e.target.style.borderColor = C.border)}
                  />
                  {error && <p className="text-xs text-center font-bold" style={{ color: C.red }}>{error}</p>}
                  <button
                    type="submit" disabled={loading}
                    className="w-full py-3 rounded font-bold text-sm uppercase tracking-widest disabled:opacity-60"
                    style={{ backgroundColor: C.gold, color: C.bg }}
                  >
                    {loading ? 'Checking…' : 'Join'}
                  </button>
                </form>

                {/* Director / Coach links */}
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => { setStep('signin'); setError('') }}
                    className="text-xs transition-opacity hover:opacity-70"
                    style={{ color: C.muted }}
                  >
                    Are you a {roleLabel}? <span style={{ color: C.gold }} className="font-semibold">Sign In</span>
                  </button>
                  <div className="my-3 mx-auto w-16" style={{ borderTop: `1px solid ${C.border}` }} />
                  <Link
                    to="/"
                    className="text-xs transition-opacity hover:opacity-70"
                    style={{ color: C.muted }}
                  >
                    Don't have an account? <span className="font-semibold">Request Access</span>
                  </Link>
                </div>
              </div>
            )}

            {/* ── Member: open roster — type name ───────────────────── */}
            {step === 'name' && (
              <form onSubmit={confirmName} className="space-y-3">
                <input
                  value={memberName}
                  onChange={(e) => { setMemberName(e.target.value); setError('') }}
                  placeholder="Your full name"
                  className="w-full rounded px-3 py-2.5 text-sm outline-none"
                  style={{ backgroundColor: C.bg, color: C.text, border: `1px solid ${C.border}`, caretColor: C.gold }}
                  onFocus={(e) => (e.target.style.borderColor = C.gold)}
                  onBlur={(e) => (e.target.style.borderColor = C.border)}
                />
                {error && <p className="text-xs text-center font-bold" style={{ color: C.red }}>{error}</p>}
                <button
                  type="submit" disabled={!memberName.trim()}
                  className="w-full py-3 rounded font-bold text-sm uppercase tracking-widest disabled:opacity-60"
                  style={{ backgroundColor: C.gold, color: C.bg }}
                >
                  Continue
                </button>
                <button type="button" onClick={() => { setStep('code'); setFoundOrg(null); setError('') }}
                  className="w-full py-2 text-xs font-bold" style={{ color: C.muted }}>
                  Back
                </button>
              </form>
            )}

            {/* ── Member: locked roster — pick name ─────────────────── */}
            {step === 'roster' && (
              <form onSubmit={confirmRoster} className="space-y-3">
                {roster.length === 0 ? (
                  <p className="text-xs text-center py-4" style={{ color: C.muted }}>
                    Roster not loaded yet. Check with your {roleLabel}.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {roster.map((m) => (
                      <button
                        key={m.id} type="button"
                        onClick={() => { setSelectedName(m.name); setError('') }}
                        className="w-full text-left px-3 py-2.5 rounded text-sm font-bold transition-colors"
                        style={{
                          backgroundColor: selectedName === m.name ? C.gold : C.bg,
                          color: selectedName === m.name ? C.bg : C.text,
                          border: `1px solid ${selectedName === m.name ? C.gold : C.border}`,
                        }}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                )}
                {error && <p className="text-xs text-center font-bold" style={{ color: C.red }}>{error}</p>}
                <button
                  type="submit" disabled={!selectedName}
                  className="w-full py-3 rounded font-bold text-sm uppercase tracking-widest disabled:opacity-60"
                  style={{ backgroundColor: C.gold, color: C.bg }}
                >
                  That's me
                </button>
                <button type="button" onClick={() => { setStep('code'); setFoundOrg(null); setSelectedName(''); setError('') }}
                  className="w-full py-2 text-xs font-bold" style={{ color: C.muted }}>
                  Back
                </button>
              </form>
            )}

            {/* ── Director / Coach sign in ───────────────────────────── */}
            {step === 'signin' && (
              <div className="space-y-4">
                <form onSubmit={submitSignIn} className="space-y-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError('') }}
                    placeholder="Email"
                    autoComplete="email"
                    className="w-full rounded px-3 py-2.5 text-sm outline-none"
                    style={{ backgroundColor: C.bg, color: C.text, border: `1px solid ${C.border}`, caretColor: C.gold }}
                    onFocus={(e) => (e.target.style.borderColor = C.gold)}
                    onBlur={(e) => (e.target.style.borderColor = C.border)}
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError('') }}
                    placeholder="Password"
                    autoComplete="current-password"
                    className="w-full rounded px-3 py-2.5 text-sm outline-none"
                    style={{ backgroundColor: C.bg, color: C.text, border: `1px solid ${C.border}`, caretColor: C.gold }}
                    onFocus={(e) => (e.target.style.borderColor = C.gold)}
                    onBlur={(e) => (e.target.style.borderColor = C.border)}
                  />
                  {error && <p className="text-xs text-center font-bold" style={{ color: C.red }}>{error}</p>}
                  <button
                    type="submit" disabled={loading}
                    className="w-full py-3 rounded font-bold text-sm uppercase tracking-widest disabled:opacity-60"
                    style={{ backgroundColor: C.gold, color: C.bg }}
                  >
                    {loading ? 'Signing In…' : 'Sign In'}
                  </button>
                </form>

                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() => { setStep('code'); setEmail(''); setPassword(''); setError('') }}
                    className="text-xs transition-opacity hover:opacity-70"
                    style={{ color: C.muted }}
                  >
                    Back to {codeLabel} entry
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
