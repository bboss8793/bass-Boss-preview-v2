import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const C = {
  bg: '#0a0900',
  dark: '#111008',
  card: '#181508',
  border: '#2a2200',
  gold: '#c8a030',
  goldLight: '#f0c84a',
  text: '#f0e8c8',
  muted: '#8a7850',
  green: '#00cc66',
  red: '#c0392b',
}

const MEMBER_RANGES = ['1–10', '11–20', '21–35', '36+']

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Safety', href: '#safety' },
  { label: 'Pricing', href: '#pricing' },
  { label: "Who It's For", href: '#who' },
  { label: 'Install', href: '#install' },
  { label: 'FAQ', href: '#faq' },
]

const STATS = [
  { value: '$0', label: 'Beta Season Cost' },
  { value: '100%', label: 'On-Water Verified' },
  { value: '50+', label: 'Lakes — More Added on Request' },
  { value: '7', label: 'Tournament Features' },
]

const AUDIENCES = [
  {
    title: 'Adult Bass Clubs',
    desc: 'Paper tournament management, live leaderboards, length-to-weight conversion, Big Bass side pot, photo submission, and real-time conditions. The full suite for serious club directors.',
    tag: 'All 7 Features',
    for: 'club',
  },
  {
    title: 'High School Teams',
    desc: 'Built around the coach/captain/angler/parent model. Tournament lockout, verify codes, GPS safety system, parent live feed, weigh-in station, and season standings — all THSBA-ready.',
    tag: '5 Core Features',
    for: 'team',
  },
  {
    title: 'Boat Captains',
    desc: 'One device per boat. Log catches with photo and verify code. Cull mode fires automatically on the 6th fish. Emergency GPS and Need Help always visible at the bottom of the screen.',
    tag: 'Captain View',
    for: 'both',
  },
  {
    title: 'Parents & Spectators',
    desc: 'No app download. No account. Share a link before launch and parents watch catches appear in real time from the ramp. Always know what\'s happening on the water.',
    tag: 'Live Feed',
    for: 'team',
  },
]

const FEATURES = [
  {
    title: 'Tournament Format Setup',
    desc: 'Configure individual vs team scoring, Best 5 / Big Bass / All Legal Fish format, fish limit (3 or 5 fish), minimum legal length, and Big Bass side pot. All settings stored and enforced automatically across the tournament.',
    tag: 'Clubs & Teams',
    for: 'both',
  },
  {
    title: 'Tournament Timing & Countdown',
    desc: 'Live countdown timer synced to Supabase — not local device time. Automated banners at 2hr, 1hr, 30min, 15min, and 5min remaining. "Lines Out" message at zero.',
    tag: 'Clubs & Teams',
    for: 'both',
  },
  {
    title: 'Length-to-Weight Conversion',
    desc: 'Full official Texas chart: 14" through 28" in 0.5" increments. Angler enters length, app converts to weight. Hard minimum enforced per tournament settings.',
    tag: 'Clubs Only',
    for: 'club',
  },
  {
    title: 'Photo Submission Workflow',
    desc: 'Angler uploads photo after entering fish data. Pre-upload checklist enforced. Weigh master review queue — approve or reject with reason. Only approved catches count on leaderboard.',
    tag: 'Clubs & Teams',
    for: 'both',
  },
  {
    title: 'Proxy Catch Entry',
    desc: 'One angler logs catches for their boat partner from a single phone. Catches attributed correctly in Supabase regardless of who entered them. Leaderboard reflects correct angler throughout.',
    tag: 'Clubs & Teams',
    for: 'both',
  },
  {
    title: 'Weather & Conditions',
    desc: 'Wind, temperature, barometric pressure with fishing implication, solunar activity, and pool elevation from USGS — 20+ Texas lakes on correct reservoir stations. Updates every 15 minutes.',
    tag: 'Clubs & Teams',
    for: 'both',
  },
  {
    title: 'Big Bass Side Pot',
    desc: 'Tracks heaviest single fish per angler when Big Bass is enabled. Separate leaderboard section updates in real time. Tie handling included. Winner highlighted on final results screen.',
    tag: 'Clubs Only',
    for: 'club',
  },
  {
    title: 'CullMode — Automatic',
    desc: 'Supports 3-fish and 5-fish tournament formats. Automatically identifies the lightest fish to cull when the limit is exceeded. Red CULL flag updates every time a new catch comes in. Limit is set at tournament creation — CullMode adjusts dynamically. Audit log preserved.',
    tag: 'Clubs & Teams',
    for: 'both',
  },
  {
    title: 'Solunar Activity',
    desc: 'Sunrise/sunset times and peak feeding periods calculated for your active lake. Major and minor solunar periods displayed with intensity indicators. Available on all three app tabs.',
    tag: 'Clubs & Teams',
    for: 'both',
  },
  {
    title: 'Emergency GPS',
    desc: 'Captain taps the red button. Real device GPS coordinates fire instantly to the coach dashboard with a one-tap Maps link. A pulsing alert takes over the screen until acknowledged. Built for on-water safety.',
    tag: 'Teams Only',
    for: 'team',
  },
  {
    title: 'Parent Live Feed',
    desc: 'No app download. No account. Share a link before launch and parents watch catches appear in real time from the ramp. Always know what\'s happening on the water.',
    tag: 'Teams Only',
    for: 'team',
  },
]

const SAFETY_CARDS = [
  {
    level: 'Emergency',
    dotColor: '#c0392b',
    title: 'EMERGENCY GPS',
    desc: 'Captain taps the red button. Real device GPS coordinates fire instantly to the director/coach dashboard with a one-tap Maps link. A pulsing alert takes over the screen until acknowledged.',
    bullets: [
      'Real GPS coordinates — not simulated',
      'Writes to Supabase emergencies table instantly',
      'Coach receives real-time alert without refresh',
      'Coach marks resolved when handled',
    ],
  },
  {
    level: 'Non-Emergency',
    dotColor: '#c8a030',
    title: 'NEED HELP',
    desc: 'Engine trouble. Out of fuel. Dead battery. Captain taps the gold button, selects a reason, adds a note. GPS sends to the dashboard. Non-emergency — no panic, just communication.',
    bullets: [
      '8 reason options including engine, fuel, battery',
      'Optional note field for location details',
      'Director dispatches help and marks resolved',
      'Full log preserved in Supabase',
    ],
  },
]

const CLUB_FEATURES = [
  'Tournament Format Setup',
  'Tournament Timing & Countdown',
  'Length-to-Weight Conversion',
  'Photo Submission Workflow',
  'Proxy Catch Entry',
  'Weather & Conditions',
  'Big Bass Side Pot',
]

const TEAM_FEATURES = [
  'Tournament Format Setup',
  'Tournament Timing & Countdown',
  'Photo Submission Workflow',
  'Proxy Catch Entry',
  'Weather & Conditions',
  'GPS Emergency & Need Help System',
  'Parent Live Feed',
]

const PLANS = [
  {
    name: 'Starter',
    sub: 'Getting Started',
    price: '$249',
    period: '/year — Adult Club',
    alt: 'or $25/month, billed monthly',
    hsPrice: '$299',
    hsPeriod: '/year — High School',
    hsAlt: 'or $30/month, billed monthly',
    limits: ['Up to 20 anglers', '6 tournaments per year'],
    features: [
      'All core tournament features',
      'GPS safety system',
      'Live leaderboards',
      'Photo submission workflow',
      'Weather & conditions',
      'Director/Coach dashboard',
    ],
    highlight: false,
  },
  {
    name: 'Standard',
    sub: 'Growing Club',
    price: '$349',
    period: '/year — Adult Club',
    alt: 'or $35/month, billed monthly',
    hsPrice: '$399',
    hsPeriod: '/year — High School',
    hsAlt: 'or $40/month, billed monthly',
    limits: ['Up to 35 anglers', 'Unlimited tournaments'],
    features: [
      'Everything in Starter',
      'Unlimited tournament runs',
      'Big Bass side pot',
      'Length-to-weight conversion',
      'Proxy catch entry',
      'Priority support',
    ],
    highlight: true,
  },
  {
    name: 'Pro',
    sub: 'Full Program',
    price: '$449',
    period: '/year — Adult Club',
    alt: 'or $45/month, billed monthly',
    hsPrice: '$499',
    hsPeriod: '/year — High School',
    hsAlt: 'or $50/month, billed monthly',
    limits: ['Unlimited anglers', 'Unlimited tournaments'],
    features: [
      'Everything in Standard',
      'Unlimited anglers',
      'All 7 features active',
      'Season standings & history',
      'Direct founder support',
      'First access to new features',
    ],
    highlight: false,
  },
]

const INSTALL_IPHONE = [
  'Open getbassboss.com in Safari',
  'Tap the Share button at the bottom of the screen (the box with an arrow pointing up)',
  'Scroll down and tap "Add to Home Screen"',
  'Tap "Add" — Bass Boss appears on your home screen like a native app',
]

const INSTALL_ANDROID = [
  'Open getbassboss.com in Chrome',
  'Tap the three-dot menu in the top right corner',
  'Tap "Add to Home Screen" or "Install App"',
  'Tap "Add" — Bass Boss appears on your home screen like a native app',
]

const FAQS = [
  {
    q: 'What is the difference between a tournament app and Bass Boss?',
    a: 'A tournament app is built for one day. Bass Boss runs your entire program — roster setup, season tracking, player development, parent communication, and tournament management. That is a fundamentally different product built for a fundamentally different purpose.',
  },
  {
    q: 'Is Bass Boss for high school teams or adult bass clubs?',
    a: 'Both. Bass Boss runs two independent platforms under one roof. The Club platform gives adult bass clubs the full 7-feature suite including length-to-weight conversion and Big Bass side pot. The Teams platform is built around the coach/captain/angler/parent model with THSBA rules, GPS safety, and parent live feed. Directors and coaches see different dashboards based on how they register.',
  },
  {
    q: 'How do members or anglers get access to the app?',
    a: 'The director or coach shares their unique Club Code or Team Code with their members. Members open the app, enter the code, and either type their name (Open roster mode) or select it from a pre-loaded list (Locked roster mode). No password required. No individual account creation. The session persists so they do not have to re-enter the code every visit.',
  },
  {
    q: 'What if my tournament lake is not in the app?',
    a: 'Just let us know. We add lakes on request at no charge — typically within 24 hours. Bass Boss currently supports 50+ lakes across Texas, Washington, and surrounding states. If your club or team fishes a lake that is not listed, mention it in the Request Access form or email scott.gros@yahoo.com directly. We will have it added before your first tournament.',
  },
  {
    q: 'Does it require an App Store download?',
    a: 'No. Bass Boss is a Progressive Web App. Visit getbassboss.com, tap Launch the App, then add it to your home screen from your browser. It installs like a native app, appears on the home screen with the Bass Boss icon, and works offline. No App Store approval, no download friction. Parents never install anything — they simply tap the shared link.',
  },
  {
    q: 'Does Bass Boss support 3-fish limit tournaments?',
    a: 'Yes. When creating a tournament, the director or coach sets the fish limit to either 3 or 5 fish. CullMode adjusts automatically — with a 3-fish limit, the cull recommendation fires on the 4th fish and tracks the top 3 heaviest. The captain always sees a clear label showing whether they are fishing a 3-Fish or 5-Fish tournament so there is no confusion on the water.',
  },
  {
    q: 'What if there is no cell signal on the water?',
    a: 'Bass Boss is built offline-first. Catches log and save to the device immediately regardless of signal. When connectivity is restored at the ramp or on the water, everything syncs automatically to the coach dashboard and the parent feed. Captains never lose a catch due to poor signal.',
  },
  {
    q: 'How does the GPS safety system actually work?',
    a: 'Every captain screen has two always-visible safety buttons. The red Emergency GPS button captures real device GPS coordinates and fires them to the coach dashboard instantly with a one-tap Maps link and a live alert. The gold Need Help button handles non-emergency issues like engine trouble or dead battery — captain selects a reason, GPS sends to the coach, coach marks resolved when handled. This is a real GPS system, not a UI shortcut.',
  },
  {
    q: 'How much does Bass Boss cost?',
    a: 'Free during beta through end of 2026. After beta, Adult Club plans start at $249/year (Starter), $349/year (Standard), or $449/year (Pro). High School Team plans start at $299/year, $399/year, or $499/year. Monthly billing available at ~20% premium. All beta organizations receive Pro tier at no cost — no credit card required.',
  },
  {
    q: 'Can I sign up mid-season?',
    a: 'Yes. Directors and coaches can sign up at any point during the season and get started immediately. Subscriptions run 12 months from your signup date — not the school or club calendar. Full price applies regardless of when you sign up. A January signup covers January through December, spanning two tournament seasons in one subscription.',
  },
  {
    q: 'Is my data safe and private?',
    a: 'All data is stored in Supabase with Row Level Security enabled. Each organization can only access their own data — no club can see another club\'s tournaments, catches, or roster. Directors authenticate with email and password. Members use a Club Code plus name selection with no individual accounts required. Your data is never visible to any other organization on the platform.',
  },
  {
    q: 'What if I need help on tournament morning?',
    a: 'During the beta period every coach and director has direct access to the founder by phone and text. Tournament morning support is a priority. If something is not working you get a live person, not a help ticket. This is one of the core commitments of the beta program.',
  },
]

function RequestModal({ onClose }) {
  // 'role' | 'director' | 'anglerQ' | 'anglerYes' | 'anglerForm' | 'anglerDone'
  const [path, setPath] = useState('role')
  const [role, setRole] = useState('')
  const [anglerSetup, setAnglerSetup] = useState('')

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    org_type: '',
    org_name: '',
    member_count: '',
    location: '',
    referral: '',
    tournament_info: '',
  })
  const [anglerForm, setAnglerForm] = useState({
    angler_name: '',
    angler_email: '',
    angler_phone: '',
    club_or_team_name: '',
    director_name: '',
    director_contact: '',
  })
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [anglerDone, setAnglerDone] = useState(false)
  const [error, setError] = useState('')

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    setError('')
  }
  function setAngler(field, value) {
    setAnglerForm((f) => ({ ...f, [field]: value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return setError('Full name is required.')
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) return setError('A valid email is required.')
    if (!form.org_type) return setError('Please select your organization type.')
    if (!form.org_name.trim()) return setError('Organization name is required.')
    if (!form.member_count) return setError('Please select an estimated member count.')
    if (!form.location.trim()) return setError('City and state are required.')

    setSaving(true)
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      org_type: form.org_type,
      org_name: form.org_name.trim(),
      member_count: form.member_count,
      location: form.location.trim(),
      referral: form.referral.trim() || null,
      tournament_info: form.tournament_info.trim() || null,
    }
    console.log('[access_requests] INSERT target:', supabase.supabaseUrl, '| table: access_requests', '| payload:', payload)
    const { error: dbErr } = await supabase.from('access_requests').insert([payload])
    console.log('[access_requests] INSERT result:', dbErr ? { error: dbErr } : { ok: true })
    setSaving(false)
    if (dbErr) {
      setError('Something went wrong. Please try again.')
    } else {
      setDone(true)
    }
  }

  async function handleAnglerSubmit(e) {
    e.preventDefault()
    const f = anglerForm
    if (!f.angler_name.trim()) return setError('Your name is required.')
    if (!f.angler_email.trim() || !/\S+@\S+\.\S+/.test(f.angler_email)) return setError('A valid angler email is required.')
    if (!f.club_or_team_name.trim()) return setError('Club or team name is required.')
    if (!f.director_name.trim()) return setError('Director or coach name is required.')
    if (!f.director_contact.trim()) return setError('Director or coach contact info is required.')

    setSaving(true)
    const payload = {
      angler_name: f.angler_name.trim(),
      angler_email: f.angler_email.trim(),
      angler_phone: f.angler_phone.trim() || null,
      club_or_team_name: f.club_or_team_name.trim(),
      director_name: f.director_name.trim(),
      director_contact: f.director_contact.trim(),
    }
    console.log('[angler_leads] INSERT payload:', payload)
    const { error: dbErr } = await supabase.from('angler_leads').insert([payload])
    console.log('[angler_leads] INSERT result:', dbErr ? { error: dbErr } : { ok: true })
    setSaving(false)
    if (dbErr) {
      setError('Something went wrong. Please try again.')
    } else {
      setAnglerDone(true)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.88)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl overflow-y-auto max-h-[96dvh] sm:max-h-[90vh]"
        style={{ backgroundColor: C.card, border: `2px solid ${C.gold}` }}
      >
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-5 py-4"
          style={{ backgroundColor: C.card, borderBottom: `1px solid ${C.border}` }}
        >
          <div>
            <p className="bb-eyebrow text-base" style={{ color: C.gold }}>
              Request Beta Access
            </p>
            <p className="text-xs mt-0.5" style={{ color: C.muted }}>
              {path === 'role'
                ? 'Tell us how you plan to use Bass Boss.'
                : role === 'angler'
                ? 'Joining an existing club or team.'
                : 'No password needed — just tell us about your organization.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 flex-shrink-0 w-8 h-8 flex items-center justify-center rounded text-lg leading-none"
            style={{ color: C.muted, border: `1px solid ${C.border}` }}
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-5">
          {/* ── Director success ───────────────────────────────────── */}
          {done ? (
            <div className="text-center py-8 space-y-4">
              <p className="bb-title text-xl" style={{ color: C.gold, fontSize: '28px', letterSpacing: '2px' }}>You're on the list!</p>
              <p className="text-sm leading-relaxed" style={{ color: C.text }}>
                Thanks! We'll reach out within 48 hours to get you set up.
              </p>
              <button
                onClick={onClose}
                className="mt-2 px-6 py-2.5 rounded font-bold text-sm uppercase tracking-widest transition-colors"
                style={{ backgroundColor: C.gold, color: C.bg }}
              >
                Done
              </button>
            </div>
          ) : path === 'role' ? (
            /* ── STEP 1: Role selector ─────────────────────────────── */
            <div className="space-y-4">
              <p className="text-sm font-bold text-center" style={{ color: C.text }}>
                Are you a Director/Coach setting up a new club or team, or an Angler looking to join one?
              </p>
              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() => { setRole('director'); setPath('director'); setError('') }}
                  className="w-full py-4 px-4 rounded text-left transition-colors"
                  style={{ backgroundColor: C.bg, color: C.text, border: `1px solid ${C.border}` }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.gold)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}
                >
                  <span className="block text-sm font-bold" style={{ color: C.goldLight }}>Director / Coach</span>
                  <span className="block text-xs mt-0.5" style={{ color: C.muted }}>Setting up a new club or team</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setRole('angler'); setPath('anglerQ'); setError('') }}
                  className="w-full py-4 px-4 rounded text-left transition-colors"
                  style={{ backgroundColor: C.bg, color: C.text, border: `1px solid ${C.border}` }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.gold)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}
                >
                  <span className="block text-sm font-bold" style={{ color: C.goldLight }}>Angler</span>
                  <span className="block text-xs mt-0.5" style={{ color: C.muted }}>Looking to join an existing club or team</span>
                </button>
              </div>
              {error && <p className="text-xs text-center font-bold" style={{ color: C.red }}>{error}</p>}
            </div>
          ) : path === 'anglerQ' ? (
            /* ── STEP 2B: Angler follow-up question ────────────────── */
            <div className="space-y-4">
              <p className="text-sm font-bold text-center" style={{ color: C.text }}>
                Has your director or coach already set up your club/team in Bass Boss?
              </p>
              <div className="grid grid-cols-1 gap-3">
                {['Yes', 'No', 'Not sure'].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setAnglerSetup(opt)
                      setError('')
                      if (opt === 'Yes') {
                        setPath('anglerYes')
                      } else {
                        setPath('anglerForm')
                      }
                    }}
                    className="w-full py-3.5 rounded text-sm font-bold transition-colors"
                    style={{
                      backgroundColor: anglerSetup === opt ? C.gold : C.bg,
                      color: anglerSetup === opt ? C.bg : C.text,
                      border: `1px solid ${anglerSetup === opt ? C.gold : C.border}`,
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => { setPath('role'); setAnglerSetup(''); setError('') }}
                className="w-full py-2 text-xs font-bold"
                style={{ color: C.muted }}
              >
                Back
              </button>
            </div>
          ) : path === 'anglerYes' ? (
            /* ── Angler "Yes" — inline message, no form ─────────────── */
            <div className="text-center py-6 space-y-5">
              <div className="mx-auto w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: '#0a2a14', border: `1px solid ${C.green}` }}>
                <span style={{ color: C.green, fontSize: '28px', lineHeight: 1 }}>✓</span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: C.text }}>
                You're already covered! Ask your director or coach for your club's org code and enter it in the app to join — no approval wait needed.
              </p>
              <Link
                to="/join"
                className="inline-block px-6 py-3 rounded font-bold text-sm uppercase tracking-widest transition-opacity hover:opacity-90"
                style={{ backgroundColor: C.gold, color: C.bg }}
              >
                Enter Org Code
              </Link>
              <div>
                <button
                  type="button"
                  onClick={() => { setPath('role'); setAnglerSetup(''); setError('') }}
                  className="text-xs font-bold"
                  style={{ color: C.muted }}
                >
                  Back to start
                </button>
              </div>
            </div>
          ) : path === 'anglerForm' && !anglerDone ? (
            /* ── Angler "No"/"Not sure" — lead capture form ────────── */
            <form onSubmit={handleAnglerSubmit} className="space-y-4">
              <Field label="Your Name" required>
                <Input
                  value={anglerForm.angler_name}
                  onChange={(e) => setAngler('angler_name', e.target.value)}
                  placeholder="Jane Angler"
                />
              </Field>
              <Field label="Your Email" required>
                <Input
                  type="email"
                  value={anglerForm.angler_email}
                  onChange={(e) => setAngler('angler_email', e.target.value)}
                  placeholder="jane@example.com"
                />
              </Field>
              <Field label="Your Phone">
                <Input
                  type="tel"
                  value={anglerForm.angler_phone}
                  onChange={(e) => setAngler('angler_phone', e.target.value)}
                  placeholder="(555) 000-0000"
                />
              </Field>
              <Field label="Club or Team Name" required>
                <Input
                  value={anglerForm.club_or_team_name}
                  onChange={(e) => setAngler('club_or_team_name', e.target.value)}
                  placeholder="Lake Conroe Bass Club"
                />
              </Field>
              <Field label="Director or Coach Name" required>
                <Input
                  value={anglerForm.director_name}
                  onChange={(e) => setAngler('director_name', e.target.value)}
                  placeholder="Coach Smith"
                />
              </Field>
              <Field label="Director/Coach Contact (email or phone)" required>
                <Input
                  value={anglerForm.director_contact}
                  onChange={(e) => setAngler('director_contact', e.target.value)}
                  placeholder="coach@email.com or (555) 000-0000"
                />
              </Field>
              {error && (
                <p
                  className="text-xs text-center font-bold py-2 rounded"
                  style={{ color: C.red, backgroundColor: '#1a0000', border: `1px solid ${C.red}40` }}
                >
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3.5 rounded font-bold text-sm uppercase tracking-widest transition-opacity disabled:opacity-60"
                style={{ backgroundColor: C.gold, color: C.bg }}
              >
                {saving ? 'Submitting…' : 'Submit'}
              </button>
              <button
                type="button"
                onClick={() => { setPath('anglerQ'); setAnglerSetup(''); setError('') }}
                className="w-full py-2 text-xs font-bold"
                style={{ color: C.muted }}
              >
                Back
              </button>
            </form>
          ) : path === 'anglerForm' && anglerDone ? (
            /* ── Angler success ────────────────────────────────────── */
            <div className="text-center py-8 space-y-4">
              <p className="bb-title text-xl" style={{ color: C.gold, fontSize: '28px', letterSpacing: '2px' }}>You're on the list!</p>
              <p className="text-sm leading-relaxed" style={{ color: C.text }}>
                Thanks! We've let your director know you're ready to join. Once they set up your club or team in Bass Boss, they'll give you an org code — just enter it in the app to join, no approval wait needed.
              </p>
              <button
                onClick={onClose}
                className="mt-2 px-6 py-2.5 rounded font-bold text-sm uppercase tracking-widest transition-colors"
                style={{ backgroundColor: C.gold, color: C.bg }}
              >
                Done
              </button>
            </div>
          ) : path === 'director' ? (
            /* ── STEP 2A: Director/Coach path — existing form ──────── */
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Full Name" required>
                <Input
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Jane Smith"
                />
              </Field>

              <Field label="Email" required>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="jane@example.com"
                />
              </Field>

              <Field label="Phone Number">
                <Input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="(555) 000-0000"
                />
              </Field>

              <Field label="Organization Type" required>
                <div className="flex gap-3">
                  {['High School Team', 'Adult Bass Club'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => set('org_type', opt)}
                      className="flex-1 py-2.5 rounded text-sm font-bold transition-colors"
                      style={{
                        backgroundColor: form.org_type === opt ? C.gold : C.bg,
                        color: form.org_type === opt ? C.bg : C.text,
                        border: `1px solid ${form.org_type === opt ? C.gold : C.border}`,
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Organization Name" required>
                <Input
                  value={form.org_name}
                  onChange={(e) => set('org_name', e.target.value)}
                  placeholder={
                    form.org_type === 'High School Team'
                      ? 'Tomball Memorial High School'
                      : form.org_type === 'Adult Bass Club'
                      ? 'Lake Conroe Bass Club'
                      : 'Your school or club name'
                  }
                />
              </Field>

              <Field label="Estimated Members / Anglers" required>
                <div className="grid grid-cols-4 gap-2">
                  {MEMBER_RANGES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => set('member_count', r)}
                      className="py-2.5 rounded text-sm font-bold transition-colors"
                      style={{
                        backgroundColor: form.member_count === r ? C.gold : C.bg,
                        color: form.member_count === r ? C.bg : C.text,
                        border: `1px solid ${form.member_count === r ? C.gold : C.border}`,
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Location (City, State)" required>
                <Input
                  value={form.location}
                  onChange={(e) => set('location', e.target.value)}
                  placeholder="Tomball, TX"
                />
              </Field>

              <Field label="How did you hear about Bass Boss?">
                <Input
                  value={form.referral}
                  onChange={(e) => set('referral', e.target.value)}
                  placeholder="Social media, a friend, fishing forum…"
                />
              </Field>

              <Field label="Tell us about your tournaments">
                <textarea
                  value={form.tournament_info}
                  onChange={(e) => set('tournament_info', e.target.value)}
                  rows={3}
                  placeholder="Format, how often you run tournaments, lake(s) you fish…"
                  className="w-full rounded px-3 py-2.5 text-sm resize-none outline-none"
                  style={{
                    backgroundColor: C.bg,
                    color: C.text,
                    border: `1px solid ${C.border}`,
                    caretColor: C.gold,
                  }}
                  onFocus={(e) => (e.target.style.borderColor = C.gold)}
                  onBlur={(e) => (e.target.style.borderColor = C.border)}
                />
              </Field>

              {error && (
                <p
                  className="text-xs text-center font-bold py-2 rounded"
                  style={{ color: C.red, backgroundColor: '#1a0000', border: `1px solid ${C.red}40` }}
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3.5 rounded font-bold text-sm uppercase tracking-widest transition-opacity disabled:opacity-60"
                style={{ backgroundColor: C.gold, color: C.bg }}
              >
                {saving ? 'Submitting…' : 'Request Access'}
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: C.muted }}>
        {label}
        {required && <span style={{ color: C.gold }}> *</span>}
      </label>
      {children}
    </div>
  )
}

function Input({ type = 'text', value, onChange, placeholder }) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full rounded px-3 py-2.5 text-sm outline-none"
      style={{
        backgroundColor: C.bg,
        color: C.text,
        border: `1px solid ${focused ? C.gold : C.border}`,
        caretColor: C.gold,
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  )
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="bb-eyebrow text-sm" style={{ color: C.text }}>{q}</span>
        <span
          className="flex-shrink-0 text-xl transition-transform"
          style={{ color: C.gold, transform: open ? 'rotate(45deg)' : 'none' }}
        >
          +
        </span>
      </button>
      {open && (
        <div className="px-5 pb-4">
          <p className="text-sm leading-relaxed" style={{ color: C.text }}>{a}</p>
        </div>
      )}
    </div>
  )
}

export default function SalesPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [audience, setAudienceState] = useState('general')
  const [pricingMode, setPricingMode] = useState('adult')
  const [audienceEngaged, setAudienceEngaged] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const forParam = params.get('for')
    if (forParam === 'highschool') {
      setAudienceState('highschool')
      setPricingMode('highschool')
      setAudienceEngaged(true)
    } else if (forParam === 'adult') {
      setAudienceState('adult')
      setPricingMode('adult')
      setAudienceEngaged(true)
    }
  }, [])

  function setAudience(a) {
    setAudienceState(a)
    setAudienceEngaged(true)
    if (a === 'highschool') setPricingMode('highschool')
    else setPricingMode('adult')
    const url = new URL(window.location)
    if (a === 'general') url.searchParams.delete('for')
    else url.searchParams.set('for', a)
    window.history.replaceState({}, '', url)
  }

  const filteredFeatures = FEATURES.filter((f) => {
    if (audience === 'general') return true
    if (audience === 'highschool') return f.for !== 'club'
    if (audience === 'adult') return f.for !== 'team'
    return true
  })

  const filteredAudiences = AUDIENCES.filter((a) => {
    if (audience === 'general') return true
    if (audience === 'highschool') return a.for !== 'club'
    if (audience === 'adult') return a.for !== 'team'
    return true
  })

  function scrollTo(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen" style={{ color: C.text }}>

      {/* ── Nav Bar ─────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-40 px-4 py-3"
        style={{ backgroundColor: C.bg, borderBottom: `1px solid ${C.border}` }}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-shrink-0 pr-2">
            <img src="/Logo-crest.png" alt="" style={{ height: '48px', width: 'auto' }} />
            <span className="bb-title hidden sm:block" style={{ color: C.gold, fontSize: '34px', letterSpacing: '2px' }}>
              Bass Boss
            </span>
          </div>
          <div className="hidden md:flex items-center gap-5">
            {NAV_LINKS.map((l) => (
              <button
                key={l.label}
                onClick={() => scrollTo(l.href.slice(1))}
                className="bb-eyebrow text-xs transition-colors"
                style={{ color: C.text }}
                onMouseEnter={(e) => (e.currentTarget.style.color = C.gold)}
                onMouseLeave={(e) => (e.currentTarget.style.color = C.text)}
              >
                {l.label}
              </button>
            ))}
          </div>
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            className="bb-eyebrow text-xs rounded px-2 py-1.5 outline-none cursor-pointer"
            style={{
              backgroundColor: C.bg,
              color: C.text,
              border: `1px solid ${C.border}`,
            }}
          >
            <option value="general">General</option>
            <option value="highschool">High School</option>
            <option value="adult">Adult Club</option>
          </select>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setModalOpen(true)}
              className="bb-eyebrow px-5 py-2.5 rounded text-sm font-bold uppercase tracking-widest transition-transform active:scale-95 hover:brightness-110"
              style={{ backgroundColor: C.gold, color: C.bg }}
            >
              Request Access
            </button>
          </div>
        </div>
      </nav>

      {/* ── Install Banner ─────────────────────────────────── */}
      <div
        className="px-6 py-2.5 flex items-center justify-center gap-4 flex-wrap text-center"
        style={{ backgroundColor: C.gold }}
      >
        <span className="text-sm font-bold" style={{ color: C.bg }}>
          Ready to try it? Add Bass Boss to your home screen in 30 seconds.
        </span>
        <button
          onClick={() => scrollTo('install')}
          className="text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded"
          style={{ backgroundColor: C.bg, color: C.gold, whiteSpace: 'nowrap' }}
        >
          How to Install →
        </button>
        <Link
          to="/app"
          className="text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded"
          style={{ color: C.bg, border: `1px solid ${C.bg}`, whiteSpace: 'nowrap' }}
        >
          Launch the App →
        </Link>
      </div>

      {/* ── Hero ────────────────────────────────────────── */}
      <section
        className="text-center px-5 pt-20 pb-16 relative overflow-hidden"
        style={{ minHeight: '92vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(200,160,48,.08) 0%, transparent 70%)' }}
        />
        <div className="relative w-full">
        <p
          className="bb-eyebrow inline-block text-xs px-4 py-1.5 rounded-full mb-8"
          style={{ color: C.gold, border: `1px solid ${C.border}` }}
        >
          Beta Now Open — Free During Beta
        </p>
        <h1
          className="bb-title mb-2"
          style={{
            color: C.text,
            fontSize: 'clamp(64px, 10vw, 120px)',
            letterSpacing: '4px',
            lineHeight: '.95',
          }}
        >
          <span style={{ color: C.text, fontFamily: 'inherit' }}>RUN YOUR</span><br /><span style={{ color: C.gold, fontFamily: 'inherit' }}>TOURNAMENT</span><br /><span style={{ color: C.text, fontFamily: 'inherit' }}>LIKE A </span><span style={{ color: C.gold, fontFamily: 'inherit' }}>BOSS.</span>
        </h1>
        <p className="text-sm leading-relaxed max-w-md mx-auto mb-10 mt-5" style={{ color: C.muted, fontSize: 'clamp(16px, 2.5vw, 22px)' }}>
          Tournament management for high school bass fishing teams and adult bass clubs.
          Live leaderboards, GPS safety, photo verification, and real-time conditions —
          all from your phone.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
          <button
            onClick={() => setModalOpen(true)}
            className="px-8 py-3.5 rounded font-bold text-sm uppercase tracking-widest transition-transform active:scale-95"
            style={{ backgroundColor: C.gold, color: C.bg }}
          >
            Request Beta Access
          </button>
          <button
            onClick={() => scrollTo('features')}
            className="px-8 py-3.5 rounded font-bold text-sm uppercase tracking-widest transition-colors"
            style={{ color: C.text, border: `1px solid ${C.border}` }}
          >
            See What's Inside
          </button>
        </div>
        <p className="text-xs" style={{ color: C.muted }}>
          No app store required — runs in your browser. Add to home screen for the full experience.
        </p>
        </div>
      </section>

      {/* ── Stats Bar ───────────────────────────────────── */}
      <section
        className="px-5 py-8"
        style={{ backgroundColor: C.dark, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}
      >
        <div className="max-w-2xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <p className="bb-title mb-1" style={{ color: C.gold, fontSize: '42px', letterSpacing: '2px', lineHeight: '1' }}>{s.value}</p>
              <p className="bb-eyebrow text-xs" style={{ color: C.muted }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Audience Selector ─────────────────────────────── */}
      <section className="max-w-2xl mx-auto px-5 py-12">
        <div
          className={`rounded-2xl p-6 sm:p-8 ${!audienceEngaged ? 'audience-pulse' : ''}`}
          style={{
            backgroundColor: C.card,
            border: `1px solid ${C.border}`,
          }}
        >
        <p className="bb-eyebrow text-xs text-center mb-4" style={{ color: C.gold }}>
          Who's using Bass Boss?
        </p>
        <h2 className="bb-title text-center mb-5" style={{ color: C.text, fontSize: 'clamp(40px, 6vw, 64px)', letterSpacing: '2px', lineHeight: '1' }}>
          PICK YOUR PLATFORM.
        </h2>
        <p className="text-sm leading-relaxed text-center max-w-md mx-auto mb-8" style={{ color: C.muted }}>
          Filter the features, safety, and pricing to match your program.
        </p>
        <div className="flex gap-3 justify-center mb-4">
          <button
            onClick={() => setAudience('highschool')}
            className="flex-1 max-w-xs py-3 rounded font-bold text-sm uppercase tracking-widest transition-all"
            style={{
              backgroundColor: audience === 'highschool' ? C.gold : 'transparent',
              color: audience === 'highschool' ? C.bg : C.text,
              border: `1px solid ${audience === 'highschool' ? C.gold : C.border}`,
            }}
          >
            High School Team
          </button>
          <button
            onClick={() => setAudience('adult')}
            className="flex-1 max-w-xs py-3 rounded font-bold text-sm uppercase tracking-widest transition-all"
            style={{
              backgroundColor: audience === 'adult' ? C.gold : 'transparent',
              color: audience === 'adult' ? C.bg : C.text,
              border: `1px solid ${audience === 'adult' ? C.gold : C.border}`,
            }}
          >
            Adult Club
          </button>
        </div>
        <div className="text-center">
          <button
            onClick={() => setAudience('general')}
            className="text-xs underline transition-opacity hover:opacity-70"
            style={{
              color: audience === 'general' ? C.gold : C.muted,
              fontWeight: audience === 'general' ? 700 : 400,
            }}
          >
            Just browsing? See everything ↓
          </button>
        </div>
        </div>
      </section>

      {/* ── Built For Your Tournament ───────────────────── */}
      <section id="who" className="max-w-2xl mx-auto px-5 py-12">
        <p className="bb-eyebrow text-xs text-center mb-4" style={{ color: C.gold }}>
          Two Platforms. One App.
        </p>
        <h2 className="bb-title text-center mb-5" style={{ color: C.text, fontSize: 'clamp(40px, 6vw, 64px)', letterSpacing: '2px', lineHeight: '1' }}>
          BUILT FOR YOUR TOURNAMENT.
        </h2>
        <p className="text-sm leading-relaxed text-center max-w-md mx-auto mb-8" style={{ color: C.muted }}>
          Bass Boss runs two independent platforms under one roof — a full-featured club
          platform for adult bass clubs, and a high school team platform built around THSBA rules.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredAudiences.map((a) => (
            <div
              key={a.title}
              className="rounded-xl p-5"
              style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}
            >
              <p className="bb-title text-sm mb-2" style={{ color: C.gold, fontSize: '28px', letterSpacing: '2px' }}>{a.title}</p>
              <p className="text-xs leading-relaxed mb-3" style={{ color: C.text }}>{a.desc}</p>
              <span
                className="inline-block text-xs font-bold uppercase tracking-wider px-3 py-1 rounded"
                style={{ color: C.gold, border: `1px solid ${C.gold}40`, backgroundColor: `${C.gold}10` }}
              >
                {a.tag}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Full Feature Suite ──────────────────────────── */}
      <section id="features" className="px-5 py-12" style={{ backgroundColor: C.dark, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <div className="max-w-2xl mx-auto">
          <p className="bb-eyebrow text-xs text-center mb-4" style={{ color: C.gold }}>
            Everything You Need
          </p>
          <h2 className="bb-title text-center mb-5" style={{ color: C.text, fontSize: 'clamp(40px, 6vw, 64px)', letterSpacing: '2px', lineHeight: '1' }}>
            THE FULL FEATURE SUITE.
          </h2>
          <p className="text-sm leading-relaxed text-center max-w-md mx-auto mb-8" style={{ color: C.muted }}>
            Seven tournament features built from real feedback. Every one of them solves a
            problem that paper and group texts can't.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredFeatures.map((f) => (
              <div
                key={f.title}
                className="rounded-xl p-5"
                style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}
              >
                <p className="bb-title text-sm mb-2" style={{ color: C.text, fontSize: '20px', letterSpacing: '1px' }}>{f.title}</p>
                <p className="text-xs leading-relaxed mb-3" style={{ color: C.muted }}>{f.desc}</p>
                <span
                  className="inline-block text-xs font-bold uppercase tracking-wider px-3 py-1 rounded"
                  style={{
                    color: C.gold,
                    border: `1px solid ${C.gold}40`,
                    backgroundColor: `${C.gold}10`,
                  }}
                >
                  {f.tag}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GPS Safety ──────────────────────────────────── */}
      {audience !== 'adult' && (
      <section id="safety" className="max-w-2xl mx-auto px-5 py-12">
        <p className="bb-eyebrow text-xs text-center mb-4" style={{ color: C.gold }}>
          On-Water Safety
        </p>
        <h2 className="bb-title text-center mb-5" style={{ color: C.text, fontSize: 'clamp(40px, 6vw, 64px)', letterSpacing: '2px', lineHeight: '1' }}>
          THE ONLY APP WITH A GPS SAFETY SYSTEM.
        </h2>
        <p className="text-sm leading-relaxed text-center max-w-md mx-auto mb-8" style={{ color: C.muted }}>
          You're responsible for people on open water. When something goes wrong, you need to
          know where they are instantly. No other tournament app has this.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {SAFETY_CARDS.map((s) => (
            <div
              key={s.title}
              className="rounded-xl p-5"
              style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}
            >
              <p className="bb-eyebrow text-xs mb-2 flex items-center gap-2" style={{ color: s.dotColor }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: s.dotColor, flexShrink: 0 }} />
                {s.level}
              </p>
              <p className="bb-title text-base mb-4" style={{ color: C.gold, fontSize: '36px', letterSpacing: '2px' }}>{s.title}</p>
              <p className="text-xs leading-relaxed mb-4" style={{ color: C.text }}>{s.desc}</p>
              <ul className="space-y-2">
                {s.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-xs" style={{ color: C.text }}>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <blockquote
          className="rounded-xl p-6 text-center"
          style={{ backgroundColor: C.card, border: `1px solid ${C.gold}40` }}
        >
          <p className="text-sm leading-relaxed italic mb-3" style={{ color: C.text }}>
            "A coach who can tell their athletic director 'every boat has a one-tap GPS
            emergency alert that sends real coordinates to me instantly' is having a
            completely different conversation than one who can't."
          </p>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: C.gold }}>
            Bass Boss · Built for the Bite
          </p>
        </blockquote>
      </section>
      )}

      {/* ── Clubs vs Teams ───────────────────────────────── */}
      <section
        className="px-5 py-12"
        style={{ backgroundColor: C.dark, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}
      >
        <div className="max-w-2xl mx-auto">
          <p className="bb-eyebrow text-xs text-center mb-4" style={{ color: C.gold }}>
            Platform Comparison
          </p>
          <h2 className="bb-title text-center mb-5" style={{ color: C.text, fontSize: 'clamp(40px, 6vw, 64px)', letterSpacing: '2px', lineHeight: '1' }}>
            CLUBS vs TEAMS.
          </h2>
          <p className="text-sm leading-relaxed text-center max-w-md mx-auto mb-8" style={{ color: C.muted }}>
            Two platforms, same app. Clubs get the full 7-feature suite. Teams get 5 features
            tailored for high school competition.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              className="rounded-xl p-5"
              style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}
            >
              <p className="bb-title text-sm mb-2" style={{ color: C.gold, fontSize: '32px', letterSpacing: '2px' }}>ADULT CLUBS</p>
              <p className="text-xs leading-relaxed mb-4" style={{ color: C.muted }}>
                Full suite. Paper tournament tools, Big Bass side pot, length-to-weight
                conversion, and everything else serious club directors need.
              </p>
              <ul className="space-y-2">
                {CLUB_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs" style={{ color: C.text }}>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div
              className="rounded-xl p-5"
              style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}
            >
              <p className="bb-title text-sm mb-2" style={{ color: C.gold, fontSize: '32px', letterSpacing: '2px' }}>HIGH SCHOOL TEAMS</p>
              <p className="text-xs leading-relaxed mb-4" style={{ color: C.muted }}>
                Built around THSBA rules. Coach/captain/angler/parent model with GPS safety,
                verify codes, parent live feed, and season standings.
              </p>
              <ul className="space-y-2">
                {TEAM_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs" style={{ color: C.text }}>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────── */}
      <section id="pricing" className="max-w-2xl mx-auto px-5 py-12">
        <p className="bb-eyebrow text-xs text-center mb-4" style={{ color: C.gold }}>
          Simple Pricing
        </p>
        <h2 className="bb-title text-center mb-5" style={{ color: C.text, fontSize: 'clamp(40px, 6vw, 64px)', letterSpacing: '2px', lineHeight: '1' }}>
          START FREE. UPGRADE WHEN READY.
        </h2>
        <p className="text-sm leading-relaxed text-center max-w-md mx-auto mb-6" style={{ color: C.muted }}>
          Beta organizations get Pro tier free through end of 2026. After beta, plans start at
          $249/year. Save 20% with annual billing.
        </p>
        <div className="flex justify-center gap-3 mb-8">
          <button
            onClick={() => setPricingMode('adult')}
            className="px-6 py-2 rounded font-bold text-xs uppercase tracking-widest transition-all"
            style={{
              backgroundColor: pricingMode === 'adult' ? C.gold : 'transparent',
              color: pricingMode === 'adult' ? C.bg : C.text,
              border: `1px solid ${pricingMode === 'adult' ? C.gold : C.border}`,
            }}
          >
            Adult Club
          </button>
          <button
            onClick={() => setPricingMode('highschool')}
            className="px-6 py-2 rounded font-bold text-xs uppercase tracking-widest transition-all"
            style={{
              backgroundColor: pricingMode === 'highschool' ? C.gold : 'transparent',
              color: pricingMode === 'highschool' ? C.bg : C.text,
              border: `1px solid ${pricingMode === 'highschool' ? C.gold : C.border}`,
            }}
          >
            High School Team
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className="rounded-xl overflow-hidden flex flex-col"
              style={{
                backgroundColor: C.card,
                border: `${p.highlight ? '2px' : '1px'} solid ${p.highlight ? C.gold : C.border}`,
                boxShadow: p.highlight ? `0 0 24px ${C.gold}18` : 'none',
              }}
            >
              {p.highlight && (
                <div
                  className="text-center py-1.5 text-xs font-bold uppercase tracking-widest"
                  style={{ backgroundColor: `${C.gold}22`, color: C.gold }}
                >
                  Most Popular
                </div>
              )}
              <div className="p-5 flex flex-col flex-1">
                <p className="bb-title text-base mb-0.5" style={{ color: C.text, fontSize: '32px', letterSpacing: '2px' }}>{p.name}</p>
                <p className="text-xs mb-3" style={{ color: C.muted }}>{p.sub}</p>
                <p className="text-2xl font-bold mb-0.5" style={{ color: C.goldLight }}>
                  {pricingMode === 'adult' ? p.price : p.hsPrice}<span className="text-sm font-normal" style={{ color: C.muted }}>{pricingMode === 'adult' ? p.period : p.hsPeriod}</span>
                </p>
                <p className="text-xs mb-4" style={{ color: C.muted }}>{pricingMode === 'adult' ? p.alt : p.hsAlt}</p>
                <div className="space-y-1.5 mb-4">
                  {p.limits.map((l) => (
                    <p key={l} className="text-xs font-bold" style={{ color: C.text }}>{l}</p>
                  ))}
                </div>
                <ul className="space-y-2 mb-5 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs" style={{ color: C.text }}>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => setModalOpen(true)}
                  className="w-full py-3 rounded font-bold text-sm uppercase tracking-widest transition-colors"
                  style={{
                    backgroundColor: p.highlight ? C.gold : 'transparent',
                    color: p.highlight ? C.bg : C.goldLight,
                    border: p.highlight ? 'none' : `1px solid ${C.gold}`,
                  }}
                >
                  Request Access
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-sm mt-6" style={{ color: C.muted }}>
          Free during beta. All beta organizations receive Pro tier at no cost through end of
          2026. No credit card required.
        </p>
      </section>

      {/* ── Install ─────────────────────────────────────── */}
      <section
        id="install"
        className="px-5 py-12"
        style={{ backgroundColor: C.dark, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}
      >
        <div className="max-w-2xl mx-auto">
          <p className="bb-eyebrow text-xs text-center mb-4" style={{ color: C.gold }}>
            No App Store Required
          </p>
          <h2 className="bb-title text-center mb-5" style={{ color: C.text, fontSize: 'clamp(40px, 6vw, 64px)', letterSpacing: '2px', lineHeight: '1' }}>
            ADD IT TO YOUR HOME SCREEN IN 30 SECONDS.
          </h2>
          <p className="text-sm leading-relaxed text-center max-w-md mx-auto mb-8" style={{ color: C.muted }}>
            Bass Boss is a Progressive Web App — it installs directly from your browser. No App
            Store. No download. Works on iPhone and Android.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl p-5" style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}>
              <p className="bb-title text-sm mb-4" style={{ color: C.gold, fontSize: '22px', letterSpacing: '2px' }}>iPhone / Safari</p>
              <ol className="space-y-3">
                {INSTALL_IPHONE.map((step, i) => (
                  <li key={i} className="flex gap-3 text-xs leading-relaxed" style={{ color: C.text }}>
                    <span
                      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: `${C.gold}18`, color: C.gold, border: `1px solid ${C.gold}40` }}
                    >
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
            <div className="rounded-xl p-5" style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}>
              <p className="bb-title text-sm mb-4" style={{ color: C.gold, fontSize: '22px', letterSpacing: '2px' }}>Android / Chrome</p>
              <ol className="space-y-3">
                {INSTALL_ANDROID.map((step, i) => (
                  <li key={i} className="flex gap-3 text-xs leading-relaxed" style={{ color: C.text }}>
                    <span
                      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: `${C.gold}18`, color: C.gold, border: `1px solid ${C.gold}40` }}
                    >
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <p className="text-xs text-center mt-6" style={{ color: C.muted }}>
            Once installed, Bass Boss works offline and loads instantly — just like a native app.
            Parents never need to install anything — they just tap the shared link.
          </p>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────── */}
      <section id="faq" className="max-w-2xl mx-auto px-5 py-12">
        <p className="bb-eyebrow text-xs text-center mb-4" style={{ color: C.gold }}>
          Got Questions
        </p>
        <h2 className="bb-title text-center mb-5" style={{ color: C.text, fontSize: 'clamp(40px, 6vw, 64px)', letterSpacing: '2px', lineHeight: '1' }}>
          FREQUENTLY ASKED.
        </h2>
        <p className="text-sm leading-relaxed text-center max-w-md mx-auto mb-8" style={{ color: C.muted }}>
          Everything coaches, directors, and anglers ask before signing up.
        </p>
        <div className="space-y-3">
          {FAQS.map((f) => (
            <FaqItem key={f.q} q={f.q} a={f.a} />
          ))}
        </div>
      </section>

      {/* ── Final CTA + Form ────────────────────────────── */}
      <section
        id="access"
        className="px-5 py-16 relative overflow-hidden"
        style={{ backgroundColor: C.bg, borderTop: `1px solid ${C.border}` }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 80% at 50% 50%, rgba(200,160,48,.06) 0%, transparent 70%)' }} />
        <div className="max-w-lg mx-auto text-center relative">
          <h2 className="bb-title mb-4" style={{ color: C.text, fontSize: 'clamp(48px, 8vw, 96px)', letterSpacing: '3px', lineHeight: '1' }}>
            BE FIRST ON THE WATER.
          </h2>
          <p className="text-sm leading-relaxed mb-6" style={{ color: C.muted }}>
            Beta spots are limited. Request access and we'll reach out within 48 hours to get
            your club or team set up — free for the full season.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="px-8 py-3.5 rounded font-bold text-sm uppercase tracking-widest transition-transform active:scale-95 mb-2"
            style={{ backgroundColor: C.gold, color: C.bg, boxShadow: `0 0 28px ${C.gold}50` }}
          >
            Request Access
          </button>
          <p className="text-xs" style={{ color: C.muted }}>
            No credit card. No commitment. Free through end of 2026.
          </p>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="px-5 py-8" style={{ backgroundColor: C.dark, borderTop: `1px solid ${C.border}` }}>
        <div className="max-w-2xl mx-auto text-center">
          <div className="flex justify-center items-center gap-2 mb-4">
            <img src="/Logo-crest.png" alt="" style={{ height: '32px', width: 'auto' }} />
            <span className="bb-title" style={{ color: C.gold, fontSize: '24px', letterSpacing: '3px' }}>
              BASS BOSS
            </span>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mb-4">
            {NAV_LINKS.slice(0, 3).map((l) => (
              <button
                key={l.label}
                onClick={() => scrollTo(l.href.slice(1))}
                className="bb-eyebrow text-xs transition-colors hover:opacity-80"
                style={{ color: C.muted }}
              >
                {l.label}
              </button>
            ))}
            <button
              onClick={() => setModalOpen(true)}
              className="bb-eyebrow text-xs transition-colors hover:opacity-80"
              style={{ color: C.muted }}
            >
              Request Access
            </button>
          </div>
          <p className="text-xs" style={{ color: `${C.muted}80` }}>
            by Camp & Cove · Built for the Bite · getbassboss.com
          </p>
        </div>
      </footer>

      {modalOpen && <RequestModal onClose={() => setModalOpen(false)} />}
    </div>
  )
}
