import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOrg } from '../context/OrgContext'
import MascotHeader from '../components/shared/MascotHeader'
import ReceiptCard from '../components/shared/ReceiptCard'
import PhotoCapture from '../components/shared/PhotoCapture'
import CullMode from '../components/shared/CullMode'
import LakeSelect from '../components/shared/LakeSelect'
import { lakes } from '../data/lakes'
import { supabase } from '../lib/supabase'
import { activityRating, formatHour } from '../utils/solunar'
import { fetchLakeLevelFor } from '../utils/lakeLevel'
import ShareParentLink from '../components/shared/ShareParentLink'
import { playAlertSound, ALERT_MILESTONES } from '../utils/alertSound'
import TournamentHistory from '../components/shared/TournamentHistory'
import { PhotoViewer, CatchThumbnail } from '../components/shared/PhotoViewer'

// ─── colour tokens ────────────────────────────────────────────────────────────
const C = {
  bg: '#0a0900',
  card: '#111008',
  border: '#2a2000',
  gold: '#c8a030',
  goldLight: '#f0c84a',
  text: '#f0e8c8',
  muted: '#a08040',
  green: '#00cc66',
  red: '#ef4444',
}

const TABS = ['Coach', 'Captain', 'Angler', 'History', 'Parent', 'Conditions', 'Course']

// ─── helpers ──────────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <p className="text-xs uppercase tracking-widest font-bold mb-2" style={{ color: C.muted }}>
      {children}
    </p>
  )
}

function GoldButton({ children, onClick, disabled, className = '', danger = false }) {
  const base = danger
    ? `border border-[${C.red}] text-[${C.red}] hover:bg-[${C.red}]/10`
    : `bg-[${C.gold}] hover:bg-[${C.goldLight}] text-[${C.bg}]`
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`font-bold px-4 py-2 rounded text-sm transition-colors disabled:opacity-40 ${className}`}
      style={
        danger
          ? { border: `1px solid ${C.red}`, color: C.red }
          : { backgroundColor: disabled ? C.muted : C.gold, color: C.bg }
      }
    >
      {children}
    </button>
  )
}

function Input({ value, onChange, placeholder, type = 'text', step, min, max, className = '' }) {
  return (
    <input
      type={type}
      step={step}
      min={min}
      max={max}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full rounded px-3 py-2 text-sm focus:outline-none transition-colors ${className}`}
      style={{
        backgroundColor: C.bg,
        border: `1px solid ${C.border}`,
        color: C.text,
      }}
      onFocus={(e) => (e.target.style.borderColor = C.gold)}
      onBlur={(e) => (e.target.style.borderColor = C.border)}
    />
  )
}

const SCORING_LABELS = { best5: 'Best 5', bigbass: 'Big Bass', alllegal: 'All Legal Fish' }
const TYPE_LABELS = { individual: 'Individual', team: 'Team' }

function computeStandings(catches, boats, tournament) {
  if (!tournament) return { standings: [] }
  const sf = tournament.scoring_format || 'best5'
  const isIndividual = tournament.format_type === 'individual'
  const active = catches.filter((c) => {
    if (c.culled || c.tournament_id !== tournament.id) return false
    return c.review_status !== 'rejected'
  })

  const groups = {}
  active.forEach((c) => {
    const key = isIndividual ? (c.angler_name || 'Unknown') : c.boat_id
    if (!groups[key]) groups[key] = []
    groups[key].push(c)
  })

  const standings = Object.entries(groups).map(([key, cs]) => {
    const sorted = [...cs].sort((a, b) => parseFloat(b.weight) - parseFloat(a.weight))
    const counted = sf === 'best5' ? sorted.slice(0, 5) : sf === 'bigbass' ? sorted.slice(0, 1) : sorted
    const total = counted.reduce((s, c) => s + (parseFloat(c.weight) || 0), 0)
    const boat = boats.find((b) => b.id === cs[0]?.boat_id)
    return {
      key,
      label: isIndividual ? key : (boat?.name || 'Boat'),
      sublabel: isIndividual ? (boat?.name || '') : `Capt: ${boat?.captain_name || ''}`,
      boat,
      total,
      count: counted.length,
    }
  }).sort((a, b) => b.total - a.total)

  return { standings }
}

// ─── TOURNAMENT COUNTDOWN ─────────────────────────────────────────────────────
const COUNTDOWN_MILESTONES = [
  { secs: 7200, label: '2 hours remaining', alert: false },
  { secs: 3600, label: '1 hour remaining', alert: false },
  ...ALERT_MILESTONES,
]

function formatCountdown(remaining) {
  const total = Math.max(0, remaining)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function useTournamentCountdown(endTime, finalCountdownSecs = 60) {
  const [remaining, setRemaining] = useState(null)
  const [banner, setBanner] = useState(null)
  const [alertBanner, setAlertBanner] = useState(null)
  const firedRef = useRef(new Set())
  const bannerTimerRef = useRef(null)

  useEffect(() => {
    if (!endTime) { setRemaining(null); return }
    const end = new Date(endTime)
    const init = Math.round((end - Date.now()) / 1000)
    firedRef.current = new Set(COUNTDOWN_MILESTONES.filter((m) => init < m.secs).map((m) => m.secs))

    function tick() {
      const r = Math.round((end - Date.now()) / 1000)
      setRemaining(r)
      for (const m of COUNTDOWN_MILESTONES) {
        if (!firedRef.current.has(m.secs) && r <= m.secs) {
          firedRef.current.add(m.secs)
          if (m.alert) {
            setAlertBanner(m.label)
            playAlertSound()
          } else {
            setBanner(m.label)
            clearTimeout(bannerTimerRef.current)
            bannerTimerRef.current = setTimeout(() => setBanner(null), 15000)
          }
        }
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => { clearInterval(id); clearTimeout(bannerTimerRef.current) }
  }, [endTime])

  return {
    remaining,
    banner,
    alertBanner,
    dismissBanner: () => { clearTimeout(bannerTimerRef.current); setBanner(null) },
    dismissAlertBanner: () => setAlertBanner(null),
    isFinalCountdown: remaining !== null && remaining > 0 && remaining <= finalCountdownSecs,
    isOver: remaining !== null && remaining <= 0,
  }
}

function TournamentCountdown({ tournament, tourneyStatus }) {
  const finalSecs = parseInt(tournament?.final_countdown_seconds) || 60
  const { remaining, banner, alertBanner, dismissBanner, dismissAlertBanner, isFinalCountdown, isOver } = useTournamentCountdown(
    tournament?.end_time || null,
    finalSecs,
  )

  if (!tournament?.end_time || tourneyStatus !== 'live') return null

  return (
    <div className="space-y-3">
      {alertBanner && (
        <div
          className="rounded-lg px-4 py-4 flex items-center justify-between animate-pulse"
          style={{ backgroundColor: '#1a1000', border: `2px solid ${C.gold}`, boxShadow: `0 0 30px ${C.gold}40` }}
        >
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full animate-pulse shrink-0" style={{ backgroundColor: C.gold }}></div>
            <div>
              <span className="font-bold text-base uppercase tracking-wide block" style={{ color: C.goldLight }}>{alertBanner}</span>
              <span className="text-xs" style={{ color: C.muted }}>Tournament ending soon — head to weigh-in</span>
            </div>
          </div>
          <button
            onClick={dismissAlertBanner}
            className="text-xs px-2 py-0.5 rounded ml-3"
            style={{ color: C.muted, border: `1px solid ${C.border}` }}
          >
            ✕
          </button>
        </div>
      )}

      {banner && (
        <div
          className="rounded-lg px-4 py-3 flex items-center justify-between"
          style={{ backgroundColor: '#001400', border: `2px solid ${C.green}`, boxShadow: `0 0 20px ${C.green}25` }}
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ backgroundColor: C.green }}></div>
            <span className="font-bold text-sm uppercase tracking-wide" style={{ color: C.green }}>{banner}</span>
          </div>
          <button
            onClick={dismissBanner}
            className="text-xs px-2 py-0.5 rounded ml-3"
            style={{ color: C.muted, border: `1px solid ${C.border}` }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main countdown display */}
      {isOver ? (
        <div
          className="rounded-lg p-6 text-center"
          style={{ backgroundColor: '#1a0000', border: `2px solid ${C.red}`, boxShadow: `0 0 40px ${C.red}40` }}
        >
          <p className="text-3xl font-bold uppercase tracking-widest" style={{ color: C.red }}>Lines Out</p>
          <p className="text-lg font-bold mt-1" style={{ color: C.text }}>Tournament Over</p>
        </div>
      ) : isFinalCountdown ? (
        <div
          className="rounded-lg p-6 text-center"
          style={{ backgroundColor: '#1a0000', border: `2px solid ${C.red}`, boxShadow: `0 0 50px ${C.red}50` }}
        >
          <p className="text-xs uppercase tracking-widest font-bold mb-3" style={{ color: C.red }}>Final Countdown</p>
          <p className="text-8xl font-bold font-mono leading-none" style={{ color: C.red }}>
            {Math.max(0, remaining)}
          </p>
          <p className="text-sm mt-3" style={{ color: C.muted }}>seconds remaining</p>
        </div>
      ) : remaining !== null ? (
        <div
          className="rounded-lg p-4 flex items-center justify-between"
          style={{ backgroundColor: C.card, border: `1px solid ${remaining > 1800 ? C.green + '60' : remaining > 300 ? C.gold + '60' : C.red + '60'}` }}
        >
          <div>
            <p className="text-xs uppercase tracking-widest font-bold mb-1" style={{ color: C.muted }}>Time Remaining</p>
            <p
              className="text-4xl font-bold font-mono"
              style={{ color: remaining > 1800 ? C.green : remaining > 300 ? C.goldLight : C.red }}
            >
              {formatCountdown(remaining)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs mb-0.5" style={{ color: C.muted }}>Ends</p>
            <p className="text-sm font-mono font-bold" style={{ color: C.text }}>
              {new Date(tournament.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}

// ─── COACH TAB ────────────────────────────────────────────────────────────────
function CoachTab({ orgId, tier = 'pro' }) {
  const TIER_LIMITS = {
    starter:  { anglers: 20,       tournaments: 6 },
    standard: { anglers: 35,       tournaments: Infinity },
    pro:      { anglers: Infinity, tournaments: Infinity },
  }
  const tierLimits = TIER_LIMITS[tier] || TIER_LIMITS.pro
  const { signOut } = useOrg()
  const navigate = useNavigate()
  const [tournaments, setTournaments] = useState([])
  const [boats, setBoats] = useState([])
  const [catches, setCatches] = useState([])
  const [teams, setTeams] = useState([])
  const [members, setMembers] = useState([])
  const [tourneyState, setTourneyState] = useState(null)
  const [activeTournament, setActiveTournament] = useState(null)
  const [loading, setLoading] = useState(true)
  const [emergencies, setEmergencies] = useState([])

  // forms
  const [newTourneyName, setNewTourneyName] = useState('')
  const [newTourneyLake, setNewTourneyLake] = useState(lakes[0].id)
  const [newTourneyDate, setNewTourneyDate] = useState('')
  const [newTourneyStartTime, setNewTourneyStartTime] = useState('')
  const [newTourneyEndTime, setNewTourneyEndTime] = useState('')
  const [newTourneyFinalCountdown, setNewTourneyFinalCountdown] = useState('60')
  const [newTourneyFormatType, setNewTourneyFormatType] = useState('team')
  const [newTourneyScoringFormat, setNewTourneyScoringFormat] = useState('best5')
  const [newTourneyFishLimit, setNewTourneyFishLimit] = useState(5)
  const [newTeamName, setNewTeamName] = useState('')
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberTeam, setNewMemberTeam] = useState('')
  const [newBoatName, setNewBoatName] = useState('')
  const [newBoatCaptain, setNewBoatCaptain] = useState('')
  const [newBoatA1, setNewBoatA1] = useState('')
  const [newBoatA2, setNewBoatA2] = useState('')
  const [newBoatTeam, setNewBoatTeam] = useState('')
  const [saving, setSaving] = useState(false)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [formErrors, setFormErrors] = useState({})
  const [rosterMode, setRosterMode] = useState('open')
  const [orgTeam, setOrgTeam] = useState(null)

  useEffect(() => {
    load()
    const channel = supabase
      .channel('emergencies-coach')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'emergencies' }, (payload) => {
        setEmergencies((prev) => [payload.new, ...prev])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'emergencies' }, (payload) => {
        setEmergencies((prev) => prev.map((e) => e.id === payload.new.id ? payload.new : e))
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function load() {
    setLoading(true)
    const [t, b, c, tm, mb, ts, em] = await Promise.all([
      supabase.from('tournaments').select('*').eq('org_id', orgId).order('date', { ascending: false }),
      supabase.from('boats').select('*').eq('org_id', orgId).order('name'),
      supabase.from('catches').select('*').eq('org_id', orgId).order('created_at', { ascending: false }),
      supabase.from('teams').select('*').eq('org_id', orgId).order('name'),
      supabase.from('team_members').select('*').eq('org_id', orgId).order('name'),
      supabase.from('tournament_state').select('*').eq('org_id', orgId).maybeSingle(),
      supabase.from('emergencies').select('*').eq('org_id', orgId).order('created_at', { ascending: false }),
    ])
    setTournaments(t.data || [])
    setBoats(b.data || [])
    setCatches(c.data || [])
    setTeams(tm.data || [])
    setMembers(mb.data || [])
    setEmergencies(em.data || [])
    if (ts.data?.tournament_id) {
      const active = (t.data || []).find((x) => x.id === ts.data.tournament_id)
      setActiveTournament(active || null)
      setTourneyState(ts.data)
    }
    const orgTeam = (tm.data || [])[0]
    if (orgTeam) { setOrgTeam(orgTeam); setRosterMode(orgTeam.roster_mode || 'open') }
    setLoading(false)
  }

  async function createTournament(e) {
    e.preventDefault()
    const errs = {}
    if (!newTourneyName.trim()) errs.newTourneyName = 'Tournament name is required'
    if (!newTourneyDate) errs.newTourneyDate = 'Tournament date is required'
    if (!newTourneyStartTime) errs.newTourneyStartTime = 'Start time is required'
    if (!newTourneyEndTime) errs.newTourneyEndTime = 'End time is required'
    if (newTourneyStartTime && newTourneyEndTime && new Date(newTourneyEndTime) <= new Date(newTourneyStartTime)) errs.newTourneyEndTime = 'End time must be after start time'
    setFormErrors(errs)
    if (Object.keys(errs).length > 0) return
    setSaving(true)
    const { data, error } = await supabase
      .from('tournaments')
      .insert([{
        name: newTourneyName.trim(),
        lake_name: lakes.find((l) => l.id === newTourneyLake)?.name || newTourneyLake,
        lake_id: newTourneyLake,
        date: newTourneyDate || null,
        start_time: newTourneyStartTime ? new Date(newTourneyStartTime).toISOString() : null,
        end_time: newTourneyEndTime ? new Date(newTourneyEndTime).toISOString() : null,
        final_countdown_seconds: parseInt(newTourneyFinalCountdown) || 60,
        format_type: newTourneyFormatType,
        scoring_format: newTourneyScoringFormat,
        fish_limit: newTourneyFishLimit,
        org_id: orgId,
      }])
      .select()
      .single()
    if (error) { alert(`Failed to create tournament: ${error.message}`) }
    else {
      setNewTourneyName(''); setNewTourneyLake(lakes[0].id); setNewTourneyDate('')
      setNewTourneyStartTime(''); setNewTourneyEndTime(''); setNewTourneyFinalCountdown('60')
      setNewTourneyFormatType('team'); setNewTourneyScoringFormat('best5')
      setNewTourneyFishLimit(5)
      load()
    }
    setSaving(false)
  }

  async function resolveEmergency(id) {
    const { error } = await supabase.from('emergencies').update({ status: 'resolved' }).eq('id', id)
    if (error) { alert(`Failed to resolve: ${error.message}`); return }
    setEmergencies((prev) => prev.map((e) => e.id === id ? { ...e, status: 'resolved' } : e))
  }

  async function setTournamentStatus(tournamentId, status) {
    if (tourneyState) {
      const { error } = await supabase.from('tournament_state').update({ tournament_id: tournamentId, status, updated_at: new Date().toISOString() }).eq('org_id', orgId)
      if (error) { alert(`Failed to update tournament status: ${error.message}`); return }
    } else {
      const { error } = await supabase.from('tournament_state').insert([{ org_id: orgId, tournament_id: tournamentId, status }])
      if (error) { alert(`Failed to set tournament status: ${error.message}`); return }
    }
    load()
  }

  async function updateRosterMode(mode) {
    setRosterMode(mode)
    if (!orgTeam) return
    await supabase.from('teams').update({ roster_mode: mode }).eq('id', orgTeam.id)
  }

  async function createTeam(e) {
    e.preventDefault()
    if (!newTeamName.trim()) { setFormErrors({ newTeamName: 'Team name is required' }); return }
    setFormErrors({})
    setSaving(true)
    const { error } = await supabase.from('teams').insert([{ name: newTeamName.trim(), org_id: orgId }])
    if (error) { alert(`Failed to create team: ${error.message}`) }
    else { setNewTeamName(''); load() }
    setSaving(false)
  }

  async function addMember(e) {
    e.preventDefault()
    const errs = {}
    if (!newMemberName.trim()) errs.newMemberName = 'Member name is required'
    if (!newMemberTeam) errs.newMemberTeam = 'Select a team'
    setFormErrors(errs)
    if (Object.keys(errs).length > 0) return
    setSaving(true)
    const { error } = await supabase.from('team_members').insert([{ name: newMemberName.trim(), team_id: newMemberTeam, org_id: orgId }])
    if (error) { alert(`Failed to add member: ${error.message}`) }
    else { setNewMemberName(''); load() }
    setSaving(false)
  }

  async function addBoat(e) {
    e.preventDefault()
    const errs = {}
    if (!newBoatName.trim()) errs.newBoatName = 'Boat name is required'
    if (!newBoatCaptain.trim()) errs.newBoatCaptain = 'Captain name is required'
    setFormErrors(errs)
    if (Object.keys(errs).length > 0) return
    setSaving(true)
    const { error } = await supabase.from('boats').insert([{
      name: newBoatName.trim(),
      captain_name: newBoatCaptain.trim(),
      angler1_name: newBoatA1.trim(),
      angler2_name: newBoatA2.trim(),
      team_id: newBoatTeam || null,
      org_id: orgId,
    }])
    if (error) { alert(`Failed to add boat: ${error.message}`) }
    else { setNewBoatName(''); setNewBoatCaptain(''); setNewBoatA1(''); setNewBoatA2(''); setNewBoatTeam(''); load() }
    setSaving(false)
  }

  // standings — format-aware
  const { standings } = computeStandings(catches, boats, activeTournament)

  // weigh-in: live catches
  const liveCatches = activeTournament
    ? catches.filter((c) => c.tournament_id === activeTournament.id && !c.culled).slice(0, 20)
    : []

  // Tier enforcement (no limits for pro, which covers all beta orgs)
  const thisYear = new Date().getFullYear()
  const yearTourneyCount = tournaments.filter((t) => {
    const d = new Date(t.date || t.created_at)
    return d.getFullYear() === thisYear
  }).length
  const anglerCount = members.length
  const overAnglers = tier !== 'pro' && anglerCount > tierLimits.anglers
  const overTournaments = tier !== 'pro' && tierLimits.tournaments !== Infinity && yearTourneyCount > tierLimits.tournaments
  const tierLabel = tier === 'starter' ? 'Starter' : tier === 'standard' ? 'Standard' : 'Pro'

  if (loading) return <p className="text-center py-12" style={{ color: C.muted }}>Loading…</p>

  const activeEmergencies = emergencies.filter((e) => e.status === 'active')

  return (
    <div className="space-y-5">
      {/* Over-limit banner — dismissible, resets on re-mount (i.e. each login) */}
      {(overAnglers || overTournaments) && !bannerDismissed && (
        <div
          className="rounded-lg px-4 py-3 flex items-start justify-between gap-3"
          style={{ backgroundColor: C.gold, color: C.bg }}
        >
          <p className="text-sm font-bold leading-snug">
            {overAnglers && overTournaments
              ? "You have exceeded your plan's angler and tournament limits. Please upgrade before your next renewal to avoid interruption."
              : overAnglers
              ? "You have exceeded your plan's angler limit. Please upgrade before your next renewal to avoid interruption."
              : "You have exceeded your plan's tournament limit. Please upgrade before your next renewal to avoid interruption."}
          </p>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            className="text-sm font-bold shrink-0 opacity-60 hover:opacity-100 transition-opacity"
          >
            ✕
          </button>
        </div>
      )}

      {/* Active Emergencies — shown prominently at top */}
      {activeEmergencies.length > 0 && (
        <div
          className="rounded-lg p-4 space-y-3"
          style={{ backgroundColor: '#1a0000', border: `2px solid ${C.red}`, boxShadow: `0 0 24px ${C.red}30` }}
        >
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full animate-pulse shrink-0" style={{ backgroundColor: C.red }}></div>
            <p className="font-bold text-sm uppercase tracking-widest" style={{ color: C.red }}>
              {activeEmergencies.length === 1 ? 'ACTIVE EMERGENCY' : `${activeEmergencies.length} ACTIVE EMERGENCIES`}
            </p>
          </div>
          {activeEmergencies.map((em) => (
            <div key={em.id} className="rounded p-3 space-y-2" style={{ backgroundColor: '#0f0000', border: `1px solid ${C.red}50` }}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="bb-title font-bold" style={{ color: C.text }}>{em.boat_name}</p>
                  <p className="text-xs mt-0.5" style={{ color: C.muted }}>Capt: {em.captain_name}</p>
                  <p className="text-xs mt-1 font-mono" style={{ color: C.muted }}>
                    {new Date(em.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </p>
                </div>
                <button
                  onClick={() => resolveEmergency(em.id)}
                  className="text-xs px-3 py-1.5 rounded font-bold shrink-0"
                  style={{ backgroundColor: C.green + '20', color: C.green, border: `1px solid ${C.green}60` }}
                >
                  Resolve
                </button>
              </div>
              <a
                href={`https://www.google.com/maps?q=${em.lat},${em.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs px-3 py-2 rounded font-mono text-center"
                style={{ backgroundColor: '#1a0808', border: `1px solid ${C.red}40`, color: C.red }}
              >
                {em.lat.toFixed(5)}, {em.lng.toFixed(5)} — Open in Maps
              </a>
            </div>
          ))}
        </div>
      )}

      {/* Live countdown */}
      <TournamentCountdown tournament={activeTournament} tourneyStatus={tourneyState?.status} />

      {/* Plan Usage — only shown for non-pro tiers */}
      {tier !== 'pro' && (
        <ReceiptCard>
          <SectionLabel>Plan Usage — {tierLabel}</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs mb-0.5" style={{ color: C.muted }}>Anglers (members)</p>
              <p
                className="text-sm font-bold font-mono"
                style={{ color: overAnglers ? C.gold : C.text }}
              >
                {anglerCount} / {tierLimits.anglers === Infinity ? '∞' : tierLimits.anglers}
                {overAnglers && (
                  <span className="text-xs font-normal ml-1.5" style={{ color: C.gold }}>
                    ({tierLabel} limit)
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs mb-0.5" style={{ color: C.muted }}>Tournaments ({thisYear})</p>
              <p
                className="text-sm font-bold font-mono"
                style={{ color: overTournaments ? C.gold : C.text }}
              >
                {yearTourneyCount} / {tierLimits.tournaments === Infinity ? '∞' : tierLimits.tournaments}
                {overTournaments && (
                  <span className="text-xs font-normal ml-1.5" style={{ color: C.gold }}>
                    ({tierLabel} limit)
                  </span>
                )}
              </p>
            </div>
          </div>
        </ReceiptCard>
      )}

      {/* Tournament Control */}
      <ReceiptCard>
        <SectionLabel>Tournament Control</SectionLabel>
        <form onSubmit={createTournament} className="space-y-2 mb-4">
          <Input value={newTourneyName} onChange={(e) => { setNewTourneyName(e.target.value); setFormErrors((p) => ({ ...p, newTourneyName: undefined })) }} placeholder="Tournament name" />
          {formErrors.newTourneyName && <p className="text-xs font-bold" style={{ color: C.red }}>{formErrors.newTourneyName}</p>}
          <LakeSelect value={newTourneyLake} onChange={setNewTourneyLake} />
          <div>
            <p className="text-xs mb-1" style={{ color: C.muted }}>Tournament Date</p>
            <Input type="date" value={newTourneyDate} onChange={(e) => { setNewTourneyDate(e.target.value); setFormErrors((p) => ({ ...p, newTourneyDate: undefined })) }} style={formErrors.newTourneyDate ? { borderColor: C.red } : {}} />
            {formErrors.newTourneyDate && <p className="text-xs font-bold" style={{ color: C.red }}>{formErrors.newTourneyDate}</p>}
          </div>
          {/* Start / End times */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs mb-1" style={{ color: C.muted }}>Start time</p>
              <Input type="datetime-local" value={newTourneyStartTime} onChange={(e) => { setNewTourneyStartTime(e.target.value); setFormErrors((p) => ({ ...p, newTourneyStartTime: undefined })) }} style={formErrors.newTourneyStartTime ? { borderColor: C.red } : {}} />
              {formErrors.newTourneyStartTime && <p className="text-xs font-bold" style={{ color: C.red }}>{formErrors.newTourneyStartTime}</p>}
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: C.muted }}>End time</p>
              <Input type="datetime-local" value={newTourneyEndTime} onChange={(e) => { setNewTourneyEndTime(e.target.value); setFormErrors((p) => ({ ...p, newTourneyEndTime: undefined })) }} style={formErrors.newTourneyEndTime ? { borderColor: C.red } : {}} />
              {formErrors.newTourneyEndTime && <p className="text-xs font-bold" style={{ color: C.red }}>{formErrors.newTourneyEndTime}</p>}
            </div>
          </div>
          {/* Final countdown threshold */}
          <div>
            <p className="text-xs mb-1.5" style={{ color: C.muted }}>Final countdown threshold</p>
            <select
              value={newTourneyFinalCountdown}
              onChange={(e) => setNewTourneyFinalCountdown(e.target.value)}
              className="w-full rounded px-3 py-2 text-sm focus:outline-none"
              style={{ backgroundColor: C.bg, border: `1px solid ${C.border}`, color: C.text }}
            >
              <option value="30">30 seconds</option>
              <option value="60">1 minute</option>
              <option value="120">2 minutes</option>
              <option value="180">3 minutes</option>
              <option value="300">5 minutes</option>
              <option value="600">10 minutes</option>
            </select>
          </div>
          {/* Format type */}
          <div>
            <p className="text-xs mb-1.5" style={{ color: C.muted }}>Format</p>
            <div className="flex gap-2">
              {['team', 'individual'].map((f) => (
                <button key={f} type="button" onClick={() => setNewTourneyFormatType(f)}
                  className="flex-1 py-1.5 rounded text-xs font-bold transition-colors"
                  style={{
                    backgroundColor: newTourneyFormatType === f ? C.gold : C.bg,
                    color: newTourneyFormatType === f ? C.bg : C.muted,
                    border: `1px solid ${newTourneyFormatType === f ? C.gold : C.border}`,
                  }}
                >
                  {TYPE_LABELS[f]}
                </button>
              ))}
            </div>
          </div>
          {/* Scoring format */}
          <div>
            <p className="text-xs mb-1.5" style={{ color: C.muted }}>Scoring</p>
            <div className="flex gap-2">
              {['best5', 'bigbass', 'alllegal'].map((f) => (
                <button key={f} type="button" onClick={() => setNewTourneyScoringFormat(f)}
                  className="flex-1 py-1.5 rounded text-xs font-bold transition-colors"
                  style={{
                    backgroundColor: newTourneyScoringFormat === f ? C.gold : C.bg,
                    color: newTourneyScoringFormat === f ? C.bg : C.muted,
                    border: `1px solid ${newTourneyScoringFormat === f ? C.gold : C.border}`,
                  }}
                >
                  {SCORING_LABELS[f]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs mb-1.5" style={{ color: C.muted }}>Fish Limit</p>
            <div className="flex gap-2">
              {[1, 3, 5].map((n) => (
                <button key={n} type="button" onClick={() => setNewTourneyFishLimit(n)}
                  className="flex-1 py-1.5 rounded text-xs font-bold transition-colors"
                  style={{ backgroundColor: newTourneyFishLimit === n ? C.gold : C.bg, color: newTourneyFishLimit === n ? C.bg : C.muted, border: `1px solid ${newTourneyFishLimit === n ? C.gold : C.border}` }}
                >{n}-Fish Limit</button>
              ))}
            </div>
          </div>
          <GoldButton disabled={saving} className="w-full">+ Create Tournament</GoldButton>
        </form>
        {tournaments.length > 0 && (
          <div className="space-y-2">
            {tournaments.slice(0, 5).map((t) => {
              const state = tourneyState?.tournament_id === t.id ? tourneyState.status : null
              return (
                <div key={t.id} className="rounded p-3 flex items-center justify-between" style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}>
                  <div>
                    <p className="bb-title font-bold text-sm" style={{ color: C.text }}>{t.name}</p>
                    <p className="text-xs" style={{ color: C.muted }}>{t.lake_name} · {t.date || 'No date'}</p>
                    <p className="text-xs mt-0.5" style={{ color: C.muted }}>
                      {TYPE_LABELS[t.format_type || 'team']} · {SCORING_LABELS[t.scoring_format || 'best5']}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {state === 'live' ? (
                      <button onClick={() => setTournamentStatus(t.id, 'ended')} className="text-xs px-3 py-1 rounded font-bold" style={{ backgroundColor: C.red, color: '#fff' }}>End</button>
                    ) : state === 'ended' ? (
                      <span className="text-xs px-2 py-1 rounded" style={{ color: C.muted, border: `1px solid ${C.border}` }}>Ended</span>
                    ) : (
                      <button onClick={() => setTournamentStatus(t.id, 'live')} className="text-xs px-3 py-1 rounded font-bold" style={{ backgroundColor: C.green, color: C.bg }}>Go Live</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </ReceiptCard>

      {/* Live Catch Feed */}
      {activeTournament && (
        <ReceiptCard>
          <div className="flex items-center justify-between mb-3">
            <SectionLabel>Live Catch Feed</SectionLabel>
            <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ backgroundColor: tourneyState?.status === 'live' ? C.green : C.muted, color: C.bg }}>
              {tourneyState?.status?.toUpperCase()}
            </span>
          </div>
          <p className="text-sm font-bold mb-3" style={{ color: C.goldLight }}>{activeTournament.name}</p>
          {liveCatches.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: C.muted }}>No catches logged yet.</p>
          ) : (
            <div className="space-y-1">
              {liveCatches.map((c) => {
                const boat = boats.find((b) => b.id === c.boat_id)
                return (
                  <div key={c.id} className="flex items-center justify-between py-1.5 px-2 rounded" style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}>
                    <div>
                      <span className="text-xs font-bold" style={{ color: C.text }}>{c.angler_name || 'Angler'}</span>
                      <span className="text-xs ml-2" style={{ color: C.muted }}>{boat?.name || 'Boat'}</span>
                    </div>
                    <span className="font-bold text-sm" style={{ color: C.goldLight }}>{parseFloat(c.weight).toFixed(2)} lbs</span>
                  </div>
                )
              })}
            </div>
          )}
        </ReceiptCard>
      )}

      {/* Boats Overview */}
      <ReceiptCard>
        <SectionLabel>Boats Overview</SectionLabel>
        <form onSubmit={addBoat} className="space-y-2 mb-4">
          <div className="grid grid-cols-2 gap-2">
            <Input value={newBoatName} onChange={(e) => { setNewBoatName(e.target.value); setFormErrors((p) => ({ ...p, newBoatName: undefined })) }} placeholder="Boat name" style={formErrors.newBoatName ? { borderColor: C.red } : {}} />
            <Input value={newBoatCaptain} onChange={(e) => { setNewBoatCaptain(e.target.value); setFormErrors((p) => ({ ...p, newBoatCaptain: undefined })) }} placeholder="Captain name" style={formErrors.newBoatCaptain ? { borderColor: C.red } : {}} />
            <Input value={newBoatA1} onChange={(e) => setNewBoatA1(e.target.value)} placeholder="Angler 1" />
            <Input value={newBoatA2} onChange={(e) => setNewBoatA2(e.target.value)} placeholder="Angler 2" />
          </div>
          {formErrors.newBoatName && <p className="text-xs font-bold" style={{ color: C.red }}>{formErrors.newBoatName}</p>}
          {formErrors.newBoatCaptain && <p className="text-xs font-bold" style={{ color: C.red }}>{formErrors.newBoatCaptain}</p>}
          <select
            value={newBoatTeam}
            onChange={(e) => setNewBoatTeam(e.target.value)}
            className="w-full rounded px-3 py-2 text-sm focus:outline-none"
            style={{ backgroundColor: C.bg, border: `1px solid ${C.border}`, color: newBoatTeam ? C.text : C.muted }}
          >
            <option value="">Assign to team (optional)</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <GoldButton disabled={saving} className="w-full">+ Add Boat</GoldButton>
        </form>
        {boats.length === 0 ? (
          <p className="text-sm text-center py-3" style={{ color: C.muted }}>No boats yet.</p>
        ) : (
          <div className="space-y-2">
            {boats.map((b) => (
              <div key={b.id} className="rounded p-3" style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}>
                <p className="bb-title font-bold text-sm" style={{ color: C.text }}>{b.name}</p>
                <p className="text-xs mt-0.5" style={{ color: C.muted }}>
                  Capt: {b.captain_name} · {b.angler1_name}{b.angler2_name ? ` · ${b.angler2_name}` : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </ReceiptCard>

      {/* Roster */}
      <ReceiptCard>
        <SectionLabel>Roster</SectionLabel>
        {orgTeam && (
          <div className="mb-4">
            <p className="text-xs mb-1.5" style={{ color: C.muted }}>Roster Mode</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => updateRosterMode('open')}
                className="flex-1 py-2 rounded text-xs font-bold transition-colors"
                style={{ backgroundColor: rosterMode === 'open' ? C.gold : C.bg, color: rosterMode === 'open' ? C.bg : C.muted, border: `1px solid ${rosterMode === 'open' ? C.gold : C.border}` }}
              >Open — Anglers self-add</button>
              <button type="button" onClick={() => updateRosterMode('locked')}
                className="flex-1 py-2 rounded text-xs font-bold transition-colors"
                style={{ backgroundColor: rosterMode === 'locked' ? C.gold : C.bg, color: rosterMode === 'locked' ? C.bg : C.muted, border: `1px solid ${rosterMode === 'locked' ? C.gold : C.border}` }}
              >Locked — Director adds</button>
            </div>
            <p className="text-xs mt-1.5" style={{ color: C.muted }}>
              {rosterMode === 'open' ? 'Anglers can join with your org code and add themselves to a team.' : 'You manually add all anglers. Anglers must be selected from the roster when joining.'}
            </p>
          </div>
        )}
        <form onSubmit={createTeam} className="flex gap-2 mb-3">
          <Input value={newTeamName} onChange={(e) => { setNewTeamName(e.target.value); setFormErrors((p) => ({ ...p, newTeamName: undefined })) }} placeholder="New team name" className="flex-1" style={formErrors.newTeamName ? { borderColor: C.red } : {}} />
          <GoldButton disabled={saving}>+ Team</GoldButton>
        </form>
        {formErrors.newTeamName && <p className="text-xs font-bold mb-2" style={{ color: C.red }}>{formErrors.newTeamName}</p>}
        {teams.length > 0 && (
          <form onSubmit={addMember} className="flex gap-2 mb-4">
            <Input value={newMemberName} onChange={(e) => { setNewMemberName(e.target.value); setFormErrors((p) => ({ ...p, newMemberName: undefined })) }} placeholder="Member name" className="flex-1" style={formErrors.newMemberName ? { borderColor: C.red } : {}} />
            <select
              value={newMemberTeam}
              onChange={(e) => { setNewMemberTeam(e.target.value); setFormErrors((p) => ({ ...p, newMemberTeam: undefined })) }}
              className="rounded px-2 py-2 text-sm focus:outline-none"
              style={{ backgroundColor: C.bg, border: `1px solid ${formErrors.newMemberTeam ? C.red : C.border}`, color: newMemberTeam ? C.text : C.muted }}
            >
              <option value="">Team</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <GoldButton disabled={saving}>Add</GoldButton>
          </form>
        )}
        {(formErrors.newMemberName || formErrors.newMemberTeam) && (
          <p className="text-xs font-bold mb-2" style={{ color: C.red }}>{formErrors.newMemberName || formErrors.newMemberTeam}</p>
        )}
        {teams.length === 0 ? (
          <p className="text-sm text-center py-3" style={{ color: C.muted }}>No teams yet.</p>
        ) : (
          <div className="space-y-3">
            {teams.map((t) => {
              const mems = members.filter((m) => m.team_id === t.id)
              return (
                <div key={t.id}>
                  <p className="text-xs font-bold mb-1" style={{ color: C.gold }}>{t.name}</p>
                  {mems.length === 0 ? (
                    <p className="text-xs" style={{ color: C.muted }}>No members yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {mems.map((m) => (
                        <span key={m.id} className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: C.bg, border: `1px solid ${C.border}`, color: C.text }}>{m.name}</span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </ReceiptCard>

      {/* Season Standings */}
      <ReceiptCard>
        <div className="flex items-center justify-between mb-2">
          <SectionLabel>
            {tourneyState?.status === 'ended' ? 'Final Results' : 'Live Standings'}
          </SectionLabel>
          {activeTournament && (
            <span className="text-xs px-2 py-0.5 rounded" style={{ color: C.muted, border: `1px solid ${C.border}` }}>
              {TYPE_LABELS[activeTournament.format_type || 'team']} · {SCORING_LABELS[activeTournament.scoring_format || 'best5']}
            </span>
          )}
        </div>
        {standings.length === 0 ? (
          <p className="text-sm text-center py-3" style={{ color: C.muted }}>No data for active tournament.</p>
        ) : (
          <div className="space-y-1">
            {standings.map((s, i) => (
              <div
                key={s.key}
                className="flex items-center gap-3 py-1.5 px-2 rounded"
                style={{
                  backgroundColor: tourneyState?.status === 'ended' && i === 0 ? `${C.gold}12` : C.bg,
                  border: `1px solid ${tourneyState?.status === 'ended' && i === 0 ? C.gold + '60' : C.border}`,
                }}
              >
                <span className="text-xs font-bold w-5 text-center" style={{ color: i === 0 ? C.goldLight : C.muted }}>
                  {tourneyState?.status === 'ended' && i === 0 ? '🏆' : `#${i + 1}`}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-bold" style={{ color: C.text }}>{s.label}</p>
                  {s.sublabel ? <p className="text-xs" style={{ color: C.muted }}>{s.sublabel} · {s.count} fish</p> : null}
                </div>
                <span className="font-bold" style={{ color: i === 0 ? C.goldLight : C.text }}>{s.total.toFixed(2)} lbs</span>
              </div>
            ))}
          </div>
        )}
      </ReceiptCard>

      {/* Weigh-in Station */}
      {activeTournament && tourneyState?.status === 'live' && (
        <ReceiptCard>
          <SectionLabel>Weigh-in Station</SectionLabel>
          <WeighInStation boats={boats} tournament={activeTournament} orgId={orgId} onSaved={load} />
        </ReceiptCard>
      )}

      <ShareParentLink tournamentId={activeTournament?.id} isLive={tourneyState?.status === 'live'} />

      <div className="pt-2 pb-4 text-center">
        <button
          onClick={() => { signOut(); navigate('/') }}
          className="text-xs transition-opacity hover:opacity-70"
          style={{ color: C.muted }}
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}

function WeighInStation({ boats, tournament, orgId, onSaved }) {
  const [boatId, setBoatId] = useState('')
  const [anglerName, setAnglerName] = useState('')
  const [weight, setWeight] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!boatId || !anglerName.trim()) return
    const w = parseFloat(weight)
    if (!w || w <= 0) return

    setSaving(true)
    const { error } = await supabase.from('catches').insert([{
      tournament_id: tournament.id,
      boat_id: boatId,
      angler_name: anglerName.trim(),
      weight: w,
      org_id: orgId,
    }])
    if (error) { alert(`Failed to log catch: ${error.message}`) }
    else { setAnglerName(''); setWeight(''); onSaved() }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <select
        value={boatId}
        onChange={(e) => setBoatId(e.target.value)}
        className="w-full rounded px-3 py-2 text-sm focus:outline-none"
        style={{ backgroundColor: C.bg, border: `1px solid ${C.border}`, color: boatId ? C.text : C.muted }}
      >
        <option value="">Select boat</option>
        {boats.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
      </select>
      <Input value={anglerName} onChange={(e) => setAnglerName(e.target.value)} placeholder="Angler name" />
      <Input type="number" step="0.01" min="0.1" max="25" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Weight (lbs)" />
      <GoldButton disabled={saving} className="w-full">Log Catch</GoldButton>
    </form>
  )
}

// ─── CAPTAIN TAB ──────────────────────────────────────────────────────────────
function CaptainTab({ orgId }) {
  const [boats, setBoats] = useState([])
  const [selectedBoat, setSelectedBoat] = useState(null)
  const [catches, setCatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [anglerMode, setAnglerMode] = useState(1) // 1 or 2
  const [weight, setWeight] = useState('')
  const [photo, setPhoto] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [saving, setSaving] = useState(false)
  // 'idle' | 'locating' | 'sending' | 'sent' | 'error'
  const [emergencyState, setEmergencyState] = useState('idle')
  const [emergencyError, setEmergencyError] = useState('')
  const [showHelp, setShowHelp] = useState(false)
  const [activeTournament, setActiveTournament] = useState(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [b, ts, t] = await Promise.all([
      supabase.from('boats').select('*').eq('org_id', orgId).order('name'),
      supabase.from('tournament_state').select('*').eq('org_id', orgId).maybeSingle(),
      supabase.from('tournaments').select('*').eq('org_id', orgId),
    ])
    const boatList = b.data || []
    setBoats(boatList)
    let tour = null
    if (ts.data?.tournament_id) {
      tour = (t.data || []).find((x) => x.id === ts.data.tournament_id) || null
      setActiveTournament(tour)
    }
    const firstBoat = boatList.length > 0 ? boatList[0] : null
    if (firstBoat && !selectedBoat) {
      setSelectedBoat(firstBoat)
      if (tour) await loadCatches(firstBoat.id, tour)
    }
    setLoading(false)
  }

  async function loadCatches(boatId, tournament = activeTournament) {
    if (!tournament) return
    const { data } = await supabase.from('catches')
      .select('*')
      .eq('boat_id', boatId)
      .eq('tournament_id', tournament.id)
      .order('created_at', { ascending: false })
    setCatches(data || [])
  }

  async function handleBoatSelect(boat) {
    setSelectedBoat(boat)
    loadCatches(boat.id)
  }

  useEffect(() => {
    if (selectedBoat?.id && activeTournament) loadCatches(selectedBoat.id)
  }, [selectedBoat?.id, activeTournament?.id])

  async function logCatch(e) {
    e.preventDefault()
    if (!selectedBoat || !activeTournament) return

    const w = parseFloat(weight)
    if (!w || w <= 0) return

    setSaving(true)
    const anglerName = anglerMode === 1 ? selectedBoat.angler1_name : selectedBoat.angler2_name
    let uploadedUrl = ''
    if (photoFile) {
      const ext = photoFile.name.split('.').pop() || 'jpg'
      const path = `catches/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { data: uploadData } = await supabase.storage.from('catch-photos').upload(path, photoFile, { upsert: false })
      if (uploadData?.path) {
        const { data: urlData } = supabase.storage.from('catch-photos').getPublicUrl(uploadData.path)
        uploadedUrl = urlData?.publicUrl || ''
      }
    }
    await supabase.from('catches').insert([{
      tournament_id: activeTournament.id,
      boat_id: selectedBoat.id,
      angler_name: anglerName || `Angler ${anglerMode}`,
      weight: w,
      photo_url: uploadedUrl,
      review_status: 'approved',
      org_id: orgId,
    }])
    setWeight(''); setPhoto(null); setPhotoFile(null)
    loadCatches(selectedBoat.id)
    setSaving(false)
  }

  async function cullCatch(id) {
    await supabase.from('catches').update({ culled: true }).eq('id', id)
    loadCatches(selectedBoat.id)
  }

  async function handleEmergencyGPS() {
    if (!navigator.geolocation) {
      setEmergencyState('error')
      setEmergencyError('Location services are not available on this device.')
      return
    }
    setEmergencyState('locating')
    let position
    try {
      position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 15000, maximumAge: 0, enableHighAccuracy: true })
      })
    } catch (err) {
      setEmergencyState('error')
      if (err.code === 1) {
        setEmergencyError('Location permission denied. Enable location services and try again.')
      } else if (err.code === 3) {
        setEmergencyError('Location timed out. Move to an open area and try again.')
      } else {
        setEmergencyError('Could not get location. Try again.')
      }
      return
    }
    setEmergencyState('sending')
    const { error } = await supabase.from('emergencies').insert([{
      boat_id: selectedBoat?.id || null,
      boat_name: selectedBoat?.name || 'Unknown Boat',
      captain_name: selectedBoat?.captain_name || 'Unknown Captain',
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      org_id: orgId,
    }])
    if (error) {
      setEmergencyState('error')
      setEmergencyError(`Failed to transmit: ${error.message}`)
    } else {
      setEmergencyState('sent')
    }
  }

  const activeCatches = catches.filter((c) => !c.culled)

  if (loading) return <p className="text-center py-12" style={{ color: C.muted }}>Loading…</p>

  return (
    <div className="space-y-5">
      {/* Emergency GPS Status Banner */}
      {emergencyState !== 'idle' && (
        <div
          className="rounded-lg p-4 text-center"
          style={{
            backgroundColor: emergencyState === 'sent' ? '#001a00' : emergencyState === 'error' ? '#1a0000' : '#0a0800',
            border: `2px solid ${emergencyState === 'sent' ? C.green : emergencyState === 'error' ? C.red : C.gold}`,
          }}
        >
          {(emergencyState === 'locating' || emergencyState === 'sending') && (
            <>
              <p className="bb-title font-bold text-lg mb-1" style={{ color: C.gold }}>
                {emergencyState === 'locating' ? 'GETTING LOCATION...' : 'TRANSMITTING...'}
              </p>
              <p className="text-sm" style={{ color: C.text }}>
                {emergencyState === 'locating' ? 'Acquiring GPS coordinates.' : 'Sending location to tournament director.'}
              </p>
            </>
          )}
          {emergencyState === 'sent' && (
            <>
              <p className="bb-title font-bold text-lg mb-1" style={{ color: C.green }}>EMERGENCY GPS SENT</p>
              <p className="text-sm mb-3" style={{ color: C.text }}>Your location has been transmitted to the tournament director.</p>
              <GoldButton onClick={() => setEmergencyState('idle')}>Dismiss</GoldButton>
            </>
          )}
          {emergencyState === 'error' && (
            <>
              <p className="bb-title font-bold text-lg mb-1" style={{ color: C.red }}>SEND FAILED</p>
              <p className="text-sm mb-3" style={{ color: C.text }}>{emergencyError}</p>
              <GoldButton onClick={() => setEmergencyState('idle')}>Dismiss</GoldButton>
            </>
          )}
        </div>
      )}
      {showHelp && (
        <div className="rounded-lg p-4 text-center" style={{ backgroundColor: '#0a0a00', border: `2px solid ${C.gold}` }}>
          <p className="bb-title font-bold text-lg mb-1" style={{ color: C.goldLight }}>HELP REQUEST SENT</p>
          <p className="text-sm mb-3" style={{ color: C.text }}>Tournament director has been notified.</p>
          <GoldButton onClick={() => setShowHelp(false)}>Dismiss</GoldButton>
        </div>
      )}

      {/* Boat Selector */}
      <ReceiptCard>
        <SectionLabel>Your Boat</SectionLabel>
        {boats.length === 0 ? (
          <p className="text-sm" style={{ color: C.muted }}>No boats registered. Ask your coach to add your boat.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {boats.map((b) => (
              <button
                key={b.id}
                onClick={() => handleBoatSelect(b)}
                className="px-3 py-2 rounded text-sm font-bold transition-colors"
                style={{
                  backgroundColor: selectedBoat?.id === b.id ? C.gold : C.bg,
                  color: selectedBoat?.id === b.id ? C.bg : C.text,
                  border: `1px solid ${selectedBoat?.id === b.id ? C.gold : C.border}`,
                }}
              >
                {b.name}
              </button>
            ))}
          </div>
        )}
      </ReceiptCard>

      {selectedBoat && (
        <>
          {/* Log Catch */}
          {activeTournament ? (
            <ReceiptCard>
              {/* Angler selector — inline at top of catch form */}
              {selectedBoat.angler2_name ? (
                <div className="mb-3 pb-3" style={{ borderBottom: `1px solid ${C.border}` }}>
                  <p className="text-xs uppercase tracking-widest font-bold mb-2" style={{ color: C.muted }}>Entering catch for</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAnglerMode(1)}
                      className="flex-1 py-2 rounded font-bold text-sm transition-colors"
                      style={{
                        backgroundColor: anglerMode === 1 ? C.gold : C.bg,
                        color: anglerMode === 1 ? C.bg : C.text,
                        border: `1px solid ${anglerMode === 1 ? C.gold : C.border}`,
                      }}
                    >
                      {selectedBoat.angler1_name || 'Angler 1'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnglerMode(2)}
                      className="flex-1 py-2.5 rounded text-sm transition-colors"
                      style={{
                        backgroundColor: anglerMode === 2 ? `${C.gold}22` : C.bg,
                        color: anglerMode === 2 ? C.goldLight : C.muted,
                        border: `1px solid ${anglerMode === 2 ? C.gold : C.border}`,
                        fontWeight: anglerMode === 2 ? 700 : 500,
                      }}
                    >
                      <span className="text-xs block" style={{ color: anglerMode === 2 ? C.gold : C.muted, opacity: 0.8 }}>Partner</span>
                      {selectedBoat.angler2_name}
                    </button>
                  </div>
                  {anglerMode === 2 && (
                    <p className="text-xs mt-2 text-center" style={{ color: C.gold }}>
                      Catch will be credited to {selectedBoat.angler2_name}
                    </p>
                  )}
                </div>
              ) : null}

              <div className="flex items-center justify-between mb-2">
                <SectionLabel>
                  {anglerMode === 2
                    ? `Logging for ${selectedBoat.angler2_name}`
                    : 'Log Catch'}
                </SectionLabel>
              </div>
              <form onSubmit={logCatch} className="space-y-3">
                <Input type="number" step="0.01" min="0.1" max="25" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Weight (lbs)" />
                <PhotoCapture onCapture={(file, url) => { setPhotoFile(file); setPhoto(url) }} label="Photo (optional)" />
                <GoldButton disabled={saving} className="w-full">
                  {anglerMode === 2 ? `Log Catch for ${selectedBoat.angler2_name}` : 'Log Catch'}
                </GoldButton>
              </form>
            </ReceiptCard>
          ) : (
            <ReceiptCard>
              <p className="text-sm text-center py-4" style={{ color: C.muted }}>No live tournament active.</p>
            </ReceiptCard>
          )}

          {/* Cull Mode — Best 5 format only */}
          {(!activeTournament || (activeTournament.scoring_format !== 'alllegal' && activeTournament.scoring_format !== 'bigbass')) && (
            <ReceiptCard>
              <CullMode catches={activeCatches} onCull={cullCatch} fishLimit={activeTournament?.fish_limit || 5} />
            </ReceiptCard>
          )}
          {activeTournament?.scoring_format === 'alllegal' && (
            <ReceiptCard>
              <p className="text-xs text-center py-2 font-bold uppercase tracking-widest" style={{ color: C.muted }}>
                All Legal Fish — no cull limit
              </p>
            </ReceiptCard>
          )}
        </>
      )}

      {/* Emergency / Help Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleEmergencyGPS}
          disabled={emergencyState === 'locating' || emergencyState === 'sending'}
          className="py-4 rounded-lg font-bold text-sm transition-all active:scale-95 disabled:opacity-60"
          style={{ backgroundColor: C.red, color: '#fff', boxShadow: `0 0 20px ${C.red}40` }}
        >
          {emergencyState === 'locating' ? 'LOCATING...' : emergencyState === 'sending' ? 'SENDING...' : 'EMERGENCY GPS'}
        </button>
        <button
          onClick={() => setShowHelp(true)}
          className="py-4 rounded-lg font-bold text-sm transition-all active:scale-95"
          style={{ border: `2px solid ${C.gold}`, color: C.goldLight, backgroundColor: 'transparent' }}
        >
          NEED HELP
        </button>
      </div>
    </div>
  )
}

// ─── ANGLER TAB ───────────────────────────────────────────────────────────────
function AnglerTab({ orgId }) {
  const [tourneyState, setTourneyState] = useState(null)
  const [activeTournament, setActiveTournament] = useState(null)
  const [catches, setCatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [anglerPhotoViewer, setAnglerPhotoViewer] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [ts, t, c] = await Promise.all([
      supabase.from('tournament_state').select('*').eq('org_id', orgId).maybeSingle(),
      supabase.from('tournaments').select('*').eq('org_id', orgId),
      supabase.from('catches').select('*').order('weight', { ascending: false }),
    ])
    if (ts.data?.tournament_id) {
      const tour = (t.data || []).find((x) => x.id === ts.data.tournament_id)
      setActiveTournament(tour || null)
      setTourneyState(ts.data)
      setCatches((c.data || []).filter((x) => x.tournament_id === ts.data.tournament_id && !x.culled))
    }
    setLoading(false)
  }

  if (loading) return <p className="text-center py-12" style={{ color: C.muted }}>Loading…</p>

  if (!activeTournament) {
    return (
      <ReceiptCard>
        <p className="text-sm text-center py-8" style={{ color: C.muted }}>No active tournament. Check back with your coach.</p>
      </ReceiptCard>
    )
  }

  if (tourneyState?.status === 'live') {
    return (
      <div className="space-y-5">
        <TournamentCountdown tournament={activeTournament} tourneyStatus="live" />
        <div className="rounded-xl p-8 text-center" style={{ backgroundColor: '#0a1400', border: `2px solid ${C.green}`, boxShadow: `0 0 30px ${C.green}20` }}>
          <div className="text-5xl mb-3 select-none">🎣</div>
          <h2 className="text-2xl font-bold uppercase tracking-wide mb-2" style={{ color: C.green }}>Tournament Live</h2>
          <p className="text-sm" style={{ color: C.muted }}>Focus on fishing. Your catches are being logged by your captain.</p>
        </div>
        <ReceiptCard>
          <p className="text-sm font-bold mb-1" style={{ color: C.goldLight }}>{activeTournament.name}</p>
          <p className="text-xs" style={{ color: C.muted }}>{activeTournament.lake_name}</p>
          <div className="mt-3 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: C.green }}></div>
            <span className="text-xs font-bold" style={{ color: C.green }}>LIVE — Angler mode locked</span>
          </div>
        </ReceiptCard>
      </div>
    )
  }

  // Tournament ended — review mode
  const totalWeight = catches.reduce((s, c) => s + parseFloat(c.weight), 0)

  return (
    <div className="space-y-5">
      <ReceiptCard>
        <div className="flex items-center justify-between mb-1">
          <p className="bb-title font-bold" style={{ color: C.text }}>{activeTournament.name}</p>
          <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ backgroundColor: C.muted, color: C.bg }}>ENDED</span>
        </div>
        <p className="text-xs mb-3" style={{ color: C.muted }}>{activeTournament.lake_name}</p>
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: C.muted }}>{catches.length} fish kept</span>
          <span className="text-xl font-bold" style={{ color: C.goldLight }}>{totalWeight.toFixed(2)} lbs</span>
        </div>
      </ReceiptCard>
      <ReceiptCard>
        <SectionLabel>Your Catch Review</SectionLabel>
        {catches.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: C.muted }}>No catches recorded.</p>
        ) : (
          <div className="space-y-2">
            {catches.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3 px-3 py-2 rounded" style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}>
                <span className="text-xs font-bold w-6 text-center" style={{ color: i === 0 ? C.goldLight : C.muted }}>#{i + 1}</span>
                <CatchThumbnail photoUrl={c.photo_url} onClick={() => setAnglerPhotoViewer(c.photo_url)} />
                <div className="flex-1">
                  <span className="font-bold text-sm" style={{ color: C.text }}>{parseFloat(c.weight).toFixed(2)} lbs</span>
                  {c.length_inches && <span className="text-xs ml-2" style={{ color: C.muted }}>{parseFloat(c.length_inches).toFixed(1)}"</span>}
                  <span className="text-xs ml-2" style={{ color: C.muted }}>{c.angler_name}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </ReceiptCard>
      <PhotoViewer photoUrl={anglerPhotoViewer} onClose={() => setAnglerPhotoViewer(null)} />
    </div>
  )
}

// ─── PARENT TAB ───────────────────────────────────────────────────────────────
function ParentTab({ orgId }) {
  const [catches, setCatches] = useState([])
  const [boats, setBoats] = useState([])
  const [tourneyState, setTourneyState] = useState(null)
  const [activeTournament, setActiveTournament] = useState(null)
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef(null)

  useEffect(() => {
    load()
    intervalRef.current = setInterval(load, 30000)
    return () => clearInterval(intervalRef.current)
  }, [])

  async function load() {
    const [ts, t, c, b] = await Promise.all([
      supabase.from('tournament_state').select('*').eq('org_id', orgId).maybeSingle(),
      supabase.from('tournaments').select('*').eq('org_id', orgId),
      supabase.from('catches').select('*').order('created_at', { ascending: false }),
      supabase.from('boats').select('*').eq('org_id', orgId).order('name'),
    ])
    setBoats(b.data || [])
    if (ts.data?.tournament_id) {
      const tour = (t.data || []).find((x) => x.id === ts.data.tournament_id)
      setActiveTournament(tour || null)
      setTourneyState(ts.data)
      setCatches((c.data || []).filter((x) => x.tournament_id === ts.data.tournament_id))
    }
    setLoading(false)
  }

  const { standings } = computeStandings(catches, boats, activeTournament)
  const recentCatches = catches.filter((c) => !c.culled).slice(0, 15)

  return (
    <div className="space-y-5">
      <ReceiptCard>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tourneyState?.status === 'live' ? C.green : C.muted, animation: tourneyState?.status === 'live' ? 'pulse 1.5s infinite' : 'none' }}></div>
          <SectionLabel>{tourneyState?.status === 'live' ? 'Live Tournament' : tourneyState?.status === 'ended' ? 'Tournament Ended' : 'No Active Tournament'}</SectionLabel>
        </div>
        {activeTournament ? (
          <>
            <p className="bb-title font-bold" style={{ color: C.goldLight }}>{activeTournament.name}</p>
            <p className="text-xs mt-0.5" style={{ color: C.muted }}>{activeTournament.lake_name} · {activeTournament.date}</p>
          </>
        ) : (
          <p className="text-sm" style={{ color: C.muted }}>Check back when a tournament is running.</p>
        )}
        <p className="text-xs mt-3" style={{ color: C.muted }}>Read-only · refreshes every 30s · no login required</p>
      </ReceiptCard>

      {standings.length > 0 && (
        <ReceiptCard>
          <div className="flex items-center justify-between mb-2">
            <SectionLabel>
              {tourneyState?.status === 'ended' ? 'Final Results' : 'Leaderboard'}
            </SectionLabel>
            {activeTournament && (
              <span className="text-xs" style={{ color: C.muted }}>
                {TYPE_LABELS[activeTournament.format_type || 'team']} · {SCORING_LABELS[activeTournament.scoring_format || 'best5']}
              </span>
            )}
          </div>
          <div className="space-y-2">
            {standings.map((s, i) => (
              <div
                key={s.key}
                className="flex items-center gap-3 px-3 py-2.5 rounded"
                style={{
                  backgroundColor: tourneyState?.status === 'ended' && i === 0 ? `${C.gold}12` : C.bg,
                  border: `1px solid ${i === 0 ? C.gold + '80' : C.border}`,
                }}
              >
                <span className="text-sm font-bold w-6 text-center" style={{ color: i === 0 ? C.goldLight : C.muted }}>
                  {tourneyState?.status === 'ended' && i === 0 ? '🏆' : `#${i + 1}`}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-bold" style={{ color: C.text }}>{s.label}</p>
                  {s.sublabel ? <p className="text-xs" style={{ color: C.muted }}>{s.sublabel} · {s.count} fish</p> : null}
                </div>
                <span className="font-bold" style={{ color: i === 0 ? C.goldLight : C.text }}>{s.total.toFixed(2)} lbs</span>
              </div>
            ))}
          </div>
        </ReceiptCard>
      )}

      {recentCatches.length > 0 && (
        <ReceiptCard>
          <SectionLabel>Recent Catches</SectionLabel>
          <div className="space-y-1">
            {recentCatches.map((c) => {
              const boat = boats.find((b) => b.id === c.boat_id)
              return (
                <div key={c.id} className="flex items-center justify-between px-2 py-1.5 rounded" style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}>
                  <div>
                    <span className="text-xs font-bold" style={{ color: C.text }}>{c.angler_name || 'Angler'}</span>
                    <span className="text-xs ml-2" style={{ color: C.muted }}>{boat?.name}</span>
                  </div>
                  <span className="font-bold text-sm" style={{ color: C.goldLight }}>{parseFloat(c.weight).toFixed(2)} lbs</span>
                </div>
              )
            })}
          </div>
        </ReceiptCard>
      )}

      {!loading && recentCatches.length === 0 && activeTournament && (
        <ReceiptCard>
          <p className="text-sm text-center py-4" style={{ color: C.muted }}>No catches logged yet — check back soon!</p>
        </ReceiptCard>
      )}
    </div>
  )
}

// ─── USGS GAUGE MAP ───────────────────────────────────────────────────────────
// Maps lake IDs from lakes.js to primary USGS gauge station IDs
const USGS_GAUGES = {
  'lake-fork':         '08017410',
  'sam-rayburn':       '08026000',
  'toledo-bend-tx':    '08020500',
  'lake-conroe':       '08068800',
  'lake-texoma':       '07299890',
  'lake-livingston':   '08068090',
  'lake-houston':      '08072700',
  'lake-lewisville':   '08055580',
  'lake-ray-hubbard':  '08061540',
  'lake-tawakoni':     '08017200',
  'richland-chambers': '08042689',
  'cedar-creek':       '08042500',
  'lake-whitney':      '08095000',
  'possum-kingdom':    '08085500',
  'lake-granbury':     '08096800',
  'lake-belton':       '08101000',
  'lake-travis':       '08158700',
  'lake-buchanan':     '08153500',
  'lake-waco':         '08095200',
  'amistad-reservoir': '08446500',
  'falcon-lake':       '08470200',
  'caddo-lake':        '07362100',
  'grand-lake':        '07190500',
  'lake-eufaula-ok':   '07315200',
  'kentucky-lake':     '03611500',
  'lake-guntersville': '03574250',
  'lake-okeechobee':   '02276625',
}

function windDirLabel(deg) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW']
  return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8]
}

function pressureTrend(readings) {
  if (!readings || readings.length < 2) return 'steady'
  const delta = readings[readings.length - 1] - readings[0]
  if (delta > 1) return 'rising'
  if (delta < -1) return 'falling'
  return 'steady'
}

function pressureImplication(trend) {
  if (trend === 'rising') return 'Pressure rising — fish moving deeper, slower bite'
  if (trend === 'falling') return 'Pressure falling — active feeding window, work shallow'
  return 'Stable pressure — consistent patterns expected'
}

function levelTrend(readings) {
  if (!readings || readings.length < 2) return 'stable'
  const delta = readings[readings.length - 1] - readings[0]
  if (delta > 0.05) return 'rising'
  if (delta < -0.05) return 'falling'
  return 'stable'
}

function TrendBadge({ trend }) {
  const map = {
    rising:  { label: 'Rising',  color: C.green },
    falling: { label: 'Falling', color: C.red },
    steady:  { label: 'Steady',  color: C.muted },
    stable:  { label: 'Stable',  color: C.muted },
  }
  const { label, color } = map[trend] || map.steady
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ color, backgroundColor: `${color}18`, border: `1px solid ${color}40` }}>
      {label}
    </span>
  )
}

// ─── CONDITIONS TAB ───────────────────────────────────────────────────────────
function ConditionsTab({ orgId }) {
  const [location, setLocation] = useState(null)           // { lat, lng, label }
  const [locError, setLocError] = useState('')
  const [weather, setWeather] = useState(null)             // Open-Meteo response
  const [lakeLevel, setLakeLevel] = useState(null)         // { value, unit, readings[], gaugeId }
  const [lakeLevelError, setLakeLevelError] = useState('')
  const [solunar, setSolunar] = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTournament, setActiveTournament] = useState(null)
  const refreshTimer = useRef(null)

  useEffect(() => {
    loadTournament()
  }, [])

  async function loadTournament() {
    const [ts, t] = await Promise.all([
      supabase.from('tournament_state').select('*').eq('org_id', orgId).maybeSingle(),
      supabase.from('tournaments').select('*').eq('org_id', orgId),
    ])
    let tour = null
    if (ts.data?.tournament_id && ts.data.status === 'live') {
      tour = (t.data || []).find((x) => x.id === ts.data.tournament_id) || null
    }
    setActiveTournament(tour)
    resolveLocation(tour)
  }

  function resolveLocation(tour) {
    if (tour?.lake_id) {
      const lake = lakes.find((l) => l.id === tour.lake_id)
      if (lake) {
        const loc = { lat: lake.lat, lng: lake.lng, label: lake.name, lakeId: tour.lake_id }
        setLocation(loc)
        fetchAll(loc, tour)
        return
      }
    }
    // Fall back to device GPS
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude, label: 'Your Location', lakeId: null }
          // Find nearest lake for gauge lookup
          let nearest = null, nearestDist = Infinity
          for (const l of lakes) {
            const d = Math.hypot(l.lat - loc.lat, l.lng - loc.lng)
            if (d < nearestDist) { nearestDist = d; nearest = l }
          }
          if (nearest && nearestDist < 3) loc.lakeId = nearest.id
          setLocation(loc)
          fetchAll(loc, null)
        },
        () => {
          // GPS denied — use default TX center
          const loc = { lat: 31.5, lng: -97.5, label: 'Texas Region', lakeId: null }
          setLocError('Location access denied — showing Texas region data')
          setLocation(loc)
          fetchAll(loc, null)
        },
        { timeout: 8000, maximumAge: 300000 }
      )
    } else {
      const loc = { lat: 31.5, lng: -97.5, label: 'Texas Region', lakeId: null }
      setLocation(loc)
      fetchAll(loc, null)
    }
  }

  async function fetchAll(loc, tour) {
    setLoading(true)
    await Promise.all([
      fetchWeather(loc, tour),
      fetchLakeLevel(loc),
    ])
    computeSolunar(loc)
    setLastRefresh(new Date())
    setLoading(false)
    setRefreshing(false)
  }

  async function fetchWeather(loc, tour) {
    try {
      // Determine hourly forecast window
      const endHour = tour?.end_time
        ? new Date(tour.end_time).getHours() + 1
        : 23
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lng}&current=temperature_2m,wind_speed_10m,wind_direction_10m,surface_pressure&hourly=temperature_2m,wind_speed_10m,wind_direction_10m,surface_pressure&wind_speed_unit=mph&temperature_unit=fahrenheit&forecast_days=1&timezone=auto`
      const res = await fetch(url)
      const data = await res.json()
      setWeather({ ...data, endHour })
    } catch {
      setWeather(null)
    }
  }

  async function fetchLakeLevel(loc) {
    setLakeLevelError('')
    if (!loc.lakeId) {
      setLakeLevel(null)
      setLakeLevelError('No specific lake selected — lake level unavailable')
      return
    }
    const lake = lakes.find((l) => l.id === loc.lakeId)
    const gauge = lake?.gauge || (USGS_GAUGES[loc.lakeId] ? { source: 'usgs', station: USGS_GAUGES[loc.lakeId], params: ['00065'] } : null)
    if (!gauge) {
      setLakeLevel(null)
      setLakeLevelError('No gauge data for this lake')
      return
    }
    try {
      const level = await fetchLakeLevelFor({ id: loc.lakeId, gauge })
      if (!level) { setLakeLevel(null); setLakeLevelError('No gauge data available'); return }
      setLakeLevel(level)
    } catch {
      setLakeLevel(null)
      setLakeLevelError('Failed to load gauge data')
    }
  }

  function computeSolunar(loc) {
    const now = new Date()
    const result = activityRating(now, loc.lat, loc.lng)
    setSolunar(result)
  }

  function scheduleRefresh(loc, tour) {
    if (refreshTimer.current) clearInterval(refreshTimer.current)
    refreshTimer.current = setInterval(() => fetchAll(loc, tour), 15 * 60 * 1000)
  }

  useEffect(() => {
    if (location) scheduleRefresh(location, activeTournament)
    return () => { if (refreshTimer.current) clearInterval(refreshTimer.current) }
  }, [location?.lat, location?.lng])

  function handleManualRefresh() {
    if (!location || refreshing) return
    setRefreshing(true)
    fetchAll(location, activeTournament)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl h-28 animate-pulse" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }} />
        ))}
        <p className="text-xs text-center" style={{ color: C.muted }}>Loading conditions…</p>
      </div>
    )
  }

  // Derived weather data
  const cur = weather?.current
  const hourly = weather?.hourly
  const now = new Date()
  const currentHour = now.getHours()
  const endHour = weather?.endHour ?? 23
  const hourlyIndices = hourly
    ? hourly.time
        .map((t, i) => ({ i, h: new Date(t).getHours() }))
        .filter(({ h }) => h >= currentHour && h <= endHour)
        .slice(0, 12)
    : []

  const pressureReadings = hourlyIndices.map(({ i }) => hourly.surface_pressure[i]).filter(Boolean)
  const pTrend = pressureTrend(pressureReadings)
  const llTrend = lakeLevel ? levelTrend(lakeLevel.readings) : 'stable'

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold" style={{ color: C.text }}>{location?.label}</p>
          {activeTournament && (
            <p className="text-xs" style={{ color: C.gold }}>Active: {activeTournament.name}</p>
          )}
          {locError && <p className="text-xs mt-0.5" style={{ color: C.muted }}>{locError}</p>}
        </div>
        <button
          onClick={handleManualRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-opacity disabled:opacity-50"
          style={{ border: `1px solid ${C.border}`, color: C.muted }}
        >
          <span className={refreshing ? 'animate-spin inline-block' : ''}>↻</span>
          {refreshing ? 'Refreshing' : lastRefresh ? `Updated ${now.getMinutes() - lastRefresh.getMinutes() <= 0 ? 'just now' : `${now.getMinutes() - lastRefresh.getMinutes()}m ago`}` : 'Refresh'}
        </button>
      </div>

      {/* Current Conditions — Wind & Temp */}
      {cur ? (
        <ReceiptCard>
          <SectionLabel>Current Conditions</SectionLabel>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center">
              <p className="text-3xl font-bold font-mono" style={{ color: C.goldLight }}>{Math.round(cur.wind_speed_10m)}</p>
              <p className="text-xs mt-0.5" style={{ color: C.muted }}>mph wind</p>
              <p className="text-sm font-bold mt-0.5" style={{ color: C.text }}>{windDirLabel(cur.wind_direction_10m)}</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold font-mono" style={{ color: C.goldLight }}>{Math.round(cur.temperature_2m)}°</p>
              <p className="text-xs mt-0.5" style={{ color: C.muted }}>°F air temp</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold font-mono" style={{ color: C.goldLight }}>{Math.round(cur.surface_pressure)}</p>
              <p className="text-xs mt-0.5" style={{ color: C.muted }}>hPa pressure</p>
              <TrendBadge trend={pTrend} />
            </div>
          </div>
          <p className="text-xs text-center py-1.5 rounded" style={{ color: C.gold, backgroundColor: `${C.gold}10`, border: `1px solid ${C.gold}20` }}>
            {pressureImplication(pTrend)}
          </p>
        </ReceiptCard>
      ) : (
        <ReceiptCard>
          <p className="text-xs text-center py-4" style={{ color: C.muted }}>Conditions unavailable on this network. Try on mobile data or a different connection.</p>
        </ReceiptCard>
      )}

      {/* Hourly Wind & Temp Forecast */}
      {hourly && hourlyIndices.length > 0 && (
        <ReceiptCard>
          <SectionLabel>
            Hourly Forecast{activeTournament?.end_time ? ' through tournament end' : ' — end of day'}
          </SectionLabel>
          <div className="overflow-x-auto -mx-1">
            <div className="flex gap-2 pb-1" style={{ minWidth: 'max-content' }}>
              {hourlyIndices.map(({ i, h }) => {
                const period = h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`
                const spd = Math.round(hourly.wind_speed_10m[i])
                const dir = windDirLabel(hourly.wind_direction_10m[i])
                const tmp = Math.round(hourly.temperature_2m[i])
                const isCurrent = h === currentHour
                return (
                  <div
                    key={i}
                    className="flex flex-col items-center rounded-lg px-2.5 py-2 gap-0.5"
                    style={{
                      backgroundColor: isCurrent ? `${C.gold}18` : C.bg,
                      border: `1px solid ${isCurrent ? C.gold : C.border}`,
                      minWidth: '52px',
                    }}
                  >
                    <p className="text-xs font-bold" style={{ color: isCurrent ? C.goldLight : C.muted }}>{period}</p>
                    <p className="text-sm font-bold font-mono" style={{ color: C.text }}>{tmp}°</p>
                    <p className="text-xs font-bold" style={{ color: C.gold }}>{spd}</p>
                    <p className="text-xs" style={{ color: C.muted }}>{dir}</p>
                  </div>
                )
              })}
            </div>
          </div>
          <p className="text-xs mt-1" style={{ color: C.muted }}>Wind in mph · Temperature in °F</p>
        </ReceiptCard>
      )}

      {/* Lake Level */}
      <ReceiptCard>
        <SectionLabel>Lake Level</SectionLabel>
        {lakeLevel ? (
          <>
            <div className="flex items-end gap-3 mb-2">
              <p className="text-3xl font-bold font-mono" style={{ color: C.goldLight }}>
                {lakeLevel.value.toFixed(2)}
              </p>
              <p className="text-sm pb-1" style={{ color: C.muted }}>{lakeLevel.unit}</p>
              <div className="pb-1 ml-auto"><TrendBadge trend={llTrend} /></div>
            </div>
            <div className="flex items-end gap-0.5 h-8 mt-2">
              {lakeLevel.readings.slice(-12).map((v, i, arr) => {
                const min = Math.min(...arr), max = Math.max(...arr)
                const range = max - min || 0.1
                const pct = ((v - min) / range) * 100
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-sm"
                    style={{
                      height: `${Math.max(10, pct)}%`,
                      backgroundColor: i === arr.length - 1 ? C.goldLight : C.gold,
                      opacity: 0.5 + (i / arr.length) * 0.5,
                    }}
                  />
                )
              })}
            </div>
            <p className="text-xs mt-1" style={{ color: C.muted }}>
              {lakeLevel.source === 'rise' ? `USBR RISE ${lakeLevel.gaugeId}` : `USGS gauge #${lakeLevel.gaugeId}`}
              {lakeLevel.converted ? ' · converted to NAVD88' : ''} · last 3 hours
            </p>
          </>
        ) : (
          <p className="text-xs py-3" style={{ color: C.muted }}>{lakeLevelError || 'No gauge data'}</p>
        )}
      </ReceiptCard>

      {/* Solunar */}
      {solunar && (
        <ReceiptCard>
          <SectionLabel>Solunar Feed Periods</SectionLabel>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} style={{ color: star <= solunar.rating ? C.goldLight : C.border, fontSize: '16px' }}>★</span>
              ))}
            </div>
            <span className="text-xs" style={{ color: C.muted }}>
              {solunar.rating >= 4 ? 'Excellent feeding activity' : solunar.rating >= 3 ? 'Good feeding activity' : solunar.rating >= 2 ? 'Moderate activity' : 'Slow period'}
            </span>
          </div>

          <div className="space-y-2">
            {solunar.periods.map((p, i) => {
              const nowH = now.getHours() + now.getMinutes() / 60
              const active = Math.abs(p.hour - nowH) < (p.duration / 2)
              return (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg px-3 py-2"
                  style={{
                    backgroundColor: active ? `${C.gold}15` : C.bg,
                    border: `1px solid ${active ? C.gold : C.border}`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{p.type === 'major' ? '◉' : '○'}</span>
                    <div>
                      <p className="text-sm font-bold" style={{ color: active ? C.goldLight : C.text }}>{p.label}</p>
                      <p className="text-xs" style={{ color: C.muted }}>{p.type === 'major' ? 'Major' : 'Minor'} · {p.duration}hr window</p>
                    </div>
                  </div>
                  {active && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ color: C.gold, backgroundColor: `${C.gold}20`, border: `1px solid ${C.gold}40` }}>
                      Active
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          <div className="flex justify-between mt-3 pt-3 text-xs" style={{ borderTop: `1px solid ${C.border}` }}>
            <span style={{ color: C.muted }}>Sunrise <span style={{ color: C.text }}>{solunar.sunriseLabel}</span></span>
            <span style={{ color: C.muted }}>Sunset <span style={{ color: C.text }}>{solunar.sunsetLabel}</span></span>
          </div>
        </ReceiptCard>
      )}

      <p className="text-xs text-center pb-2" style={{ color: C.muted }}>
        Data: Open-Meteo (weather) · USGS (lake level) · Auto-refresh every 15 min
      </p>
    </div>
  )
}

// ─── COURSE TAB ───────────────────────────────────────────────────────────────
const MODULES = [
  {
    id: 1,
    title: 'Tournament Setup & Boat Assignments',
    duration: '5 min',
    content: [
      'Coaches create tournaments from the Coach tab by entering a name, lake, and date, then pressing Go Live to activate.',
      'Boats are registered under Boats Overview — each boat needs a captain name and at least one angler before the tournament starts.',
      'Anglers are assigned to boats by entering Angler 1 and Angler 2 names when adding the boat record.',
      'A boat cannot log catches until it appears in the Captain tab selector — confirm boat registration before launch day.',
      'Only one tournament can be live at a time. Ending a tournament locks its results and starts a new record.',
    ],
  },
  {
    id: 2,
    title: 'Verify Codes & Student Access',
    duration: '5 min',
    content: [
      'Verify codes are short alphanumeric codes that authenticate a student or captain without requiring a login account.',
      'Each code is tied to a specific boat or angler role — coaches generate and distribute codes before the tournament.',
      'Students enter their code on the verify screen to unlock their app role for that tournament day.',
      'Codes expire after the tournament ends — a new code is required for each event.',
      'Student phone lockout is enforced during the tournament: the app restricts navigation to the Angler view only, preventing distraction.',
    ],
  },
  {
    id: 3,
    title: 'Cull Mode Rules & Operation',
    duration: '8 min',
    content: [
      'Cull Mode enforces the five-fish limit rule: only the five heaviest fish in a boat\'s livewell count toward the official weight.',
      'When a sixth fish is caught, Cull Mode automatically identifies the lightest fish in the current limit and flags it for release.',
      'The captain taps Remove on the flagged fish to confirm the cull — this marks it as culled in the database and removes it from the weight total.',
      'Culled fish are never deleted — they remain in the catch log with a culled flag for audit purposes.',
      'Coaches can review cull decisions from the Live Catch Feed; any dispute must be raised at weigh-in, not after the fact.',
    ],
  },
  {
    id: 4,
    title: 'GPS Emergency & Need Help Protocols',
    duration: '5 min',
    content: [
      'The Emergency GPS button in the Captain tab transmits the device\'s GPS coordinates to the tournament director immediately — use only for genuine safety emergencies.',
      'The Need Help button sends a non-emergency notification to the coach or tournament director, useful for mechanical issues, rule questions, or minor medical concerns.',
      'Captains should confirm their phone has location services enabled before launching — GPS emergency will not work without location permission.',
      'Tournament directors receive Emergency GPS alerts as a high-priority notification separate from regular catch activity.',
      'Coaches should brief all captains on the difference between Emergency GPS (life-threatening) and Need Help (assistance needed) before every event.',
    ],
  },
  {
    id: 5,
    title: 'Parent Live Feed & Season Standings',
    duration: '5 min',
    content: [
      'The Parent tab is fully read-only and requires no login — coaches share the app link with families before the tournament.',
      'The Parent feed refreshes automatically every 30 seconds during a live tournament, showing the leaderboard and recent catches.',
      'Season standings are calculated from all non-culled catches across completed tournaments and update in real time.',
      'State qualifying cutoffs are based on cumulative season weight — coaches should communicate the qualifying threshold to anglers at the start of the season.',
      'Parents cannot interact with any data — they see boat names, captain names, fish counts, and weights only.',
    ],
  },
  {
    id: 6,
    title: 'Weigh-in, Penalties & Coach Responsibilities',
    duration: '5 min',
    content: [
      'Coaches record official weigh-in results using the Weigh-in Station in the Coach tab — this is the system of record for final standings.',
      'Late arrival penalty: 1 lb deducted per minute late, up to 15 minutes. After 15 minutes, the entire limit is disqualified.',
      'Dead fish penalty: 4 oz deducted per dead fish presented at weigh-in.',
      'Coaches are responsible for verifying boat rosters, confirming all anglers are accounted for, and overseeing the weigh-in process.',
      'After all boats have weighed in, the coach ends the tournament in the app — this locks results, finalizes standings, and makes the data available for season reports.',
    ],
  },
]

const FINAL_EXAM = [
  {
    q: 'Where does a coach go in the app to create a new tournament?',
    options: ['Captain tab', 'Coach tab — Tournament Control', 'Course tab', 'Parent tab'],
    answer: 1,
  },
  {
    q: 'What must be done before a boat can log catches in the Captain tab?',
    options: ['Angler must verify their code', 'Boat must be registered with a captain and at least one angler', 'Coach must be online', 'Tournament must be ended first'],
    answer: 1,
  },
  {
    q: 'How many tournaments can be live at the same time?',
    options: ['Unlimited', 'Two', 'One', 'Depends on team size'],
    answer: 2,
  },
  {
    q: 'What is the purpose of a verify code?',
    options: ['To reset a password', 'To authenticate a student or captain without a login account', 'To confirm weigh-in results', 'To unlock the Parent feed'],
    answer: 1,
  },
  {
    q: 'When does a student verify code expire?',
    options: ['After 24 hours', 'After the tournament ends', 'Never', 'After the student logs one catch'],
    answer: 1,
  },
  {
    q: 'What does student phone lockout do during a live tournament?',
    options: ['Turns off the phone', 'Restricts the app to Angler view only', 'Disables the camera', 'Logs the student out'],
    answer: 1,
  },
  {
    q: 'How many fish are allowed in a boat\'s active limit under Cull Mode rules?',
    options: ['Three', 'Four', 'Five', 'Six'],
    answer: 2,
  },
  {
    q: 'When a sixth fish is caught, what does Cull Mode identify?',
    options: ['The heaviest fish to keep', 'The lightest fish in the current limit to release', 'The oldest catch', 'Nothing — the captain decides manually'],
    answer: 1,
  },
  {
    q: 'What happens to a culled fish record in the database?',
    options: ['It is permanently deleted', 'It is marked with a culled flag and retained for audit', 'It is moved to the Parent feed', 'It is archived after 7 days'],
    answer: 1,
  },
  {
    q: 'When should the Emergency GPS button be used?',
    options: ['Whenever a fish is lost', 'Any time the captain needs help', 'Only for genuine life-threatening safety emergencies', 'To report a rules violation'],
    answer: 2,
  },
  {
    q: 'What is the correct use of the Need Help button?',
    options: ['Life-threatening emergencies only', 'Mechanical issues, rule questions, or minor medical concerns', 'Submitting weigh-in data', 'Requesting a cull review'],
    answer: 1,
  },
  {
    q: 'What must be enabled on the captain\'s phone for Emergency GPS to function?',
    options: ['Bluetooth', 'Location services', 'Wi-Fi', 'Notifications'],
    answer: 1,
  },
  {
    q: 'How often does the Parent tab live feed refresh during a tournament?',
    options: ['Every 5 seconds', 'Every 30 seconds', 'Every 5 minutes', 'Only when manually refreshed'],
    answer: 1,
  },
  {
    q: 'What information can parents see in the Parent tab?',
    options: ['Boat names, captain names, fish counts, and weights', 'Angler verify codes', 'Coach contact information', 'GPS coordinates of boats'],
    answer: 0,
  },
  {
    q: 'What is the late arrival penalty at weigh-in?',
    options: ['4 oz per minute late', '1 lb per minute late, up to 15 minutes', '2 lbs flat penalty', 'No penalty for the first 10 minutes'],
    answer: 1,
  },
  {
    q: 'What is the penalty for each dead fish presented at weigh-in?',
    options: ['No penalty', '2 oz deducted', '4 oz deducted', '1 lb deducted'],
    answer: 2,
  },
  {
    q: 'After 15 minutes late arriving at weigh-in, what happens to the limit?',
    options: ['Only a 15 lb penalty applies', 'The entire limit is disqualified', 'The team is warned only', '5 lbs are deducted'],
    answer: 1,
  },
  {
    q: 'Where does the coach record official weigh-in results in the app?',
    options: ['Captain tab — Log Catch', 'Coach tab — Weigh-in Station', 'Course tab', 'Parent tab — Leaderboard'],
    answer: 1,
  },
  {
    q: 'What does ending a tournament in the app do?',
    options: ['Deletes all catch records', 'Locks results, finalizes standings, and makes data available for season reports', 'Resets the leaderboard', 'Removes all boat assignments'],
    answer: 1,
  },
  {
    q: 'How are season standings calculated?',
    options: ['By number of tournaments attended', 'From all non-culled catches across completed tournaments', 'By average fish weight per event', 'Manually entered by the coach'],
    answer: 1,
  },
]

const PASS_SCORE = 16
const TOTAL_QUESTIONS = 20

function CourseTab() {
  const [activeModule, setActiveModule] = useState(null)
  const [completed, setCompleted] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bb_course_completed') || '[]') } catch { return [] }
  })
  const [examMode, setExamMode] = useState(false)
  const [examAnswers, setExamAnswers] = useState({})
  const [examSubmitted, setExamSubmitted] = useState(false)
  const [certified, setCertified] = useState(() => {
    try { return localStorage.getItem('bb_certified') === 'true' } catch { return false }
  })

  const allModulesDone = MODULES.every((m) => completed.includes(m.id))

  function markModuleComplete(modId) {
    const updated = [...new Set([...completed, modId])]
    setCompleted(updated)
    localStorage.setItem('bb_course_completed', JSON.stringify(updated))
  }

  function submitExam() {
    setExamSubmitted(true)
    const score = FINAL_EXAM.reduce((s, q, i) => s + (examAnswers[i] === q.answer ? 1 : 0), 0)
    if (score >= PASS_SCORE) {
      setCertified(true)
      localStorage.setItem('bb_certified', 'true')
    }
  }

  function retakeExam() {
    setExamAnswers({})
    setExamSubmitted(false)
  }

  const examScore = examSubmitted
    ? FINAL_EXAM.reduce((s, q, i) => s + (examAnswers[i] === q.answer ? 1 : 0), 0)
    : 0
  const examPassed = examScore >= PASS_SCORE

  // ── Module detail view ────────────────────────────────────────────────────
  if (activeModule) {
    const alreadyDone = completed.includes(activeModule.id)
    return (
      <div className="space-y-5">
        <button onClick={() => setActiveModule(null)} className="text-sm transition-colors" style={{ color: C.muted }}>
          ← Back to Modules
        </button>
        <ReceiptCard>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: C.gold }}>Module {activeModule.id}</p>
            <span className="text-xs" style={{ color: C.muted }}>{activeModule.duration}</span>
          </div>
          <h2 className="text-lg font-bold mb-4" style={{ color: C.text }}>{activeModule.title}</h2>
          <ul className="space-y-3">
            {activeModule.content.map((item, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed">
                <span className="font-bold shrink-0 mt-0.5" style={{ color: C.gold }}>{i + 1}.</span>
                <span style={{ color: C.text }}>{item}</span>
              </li>
            ))}
          </ul>
        </ReceiptCard>
        <GoldButton
          className="w-full"
          onClick={() => { markModuleComplete(activeModule.id); setActiveModule(null) }}
          disabled={alreadyDone}
        >
          {alreadyDone ? 'Module Complete' : 'Mark as Read'}
        </GoldButton>
      </div>
    )
  }

  // ── Final exam view ───────────────────────────────────────────────────────
  if (examMode) {
    if (examSubmitted) {
      return (
        <div className="space-y-5">
          <ReceiptCard>
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.gold }}>Final Exam Results</p>
            <div className="text-center py-4">
              <p className="text-4xl font-bold mb-2" style={{ color: examPassed ? C.green : C.red }}>
                {examScore}/{TOTAL_QUESTIONS}
              </p>
              <p className="text-sm font-bold mb-1" style={{ color: examPassed ? C.green : C.red }}>
                {examPassed ? 'PASSED' : 'NOT PASSED'}
              </p>
              <p className="text-xs" style={{ color: C.muted }}>
                {examPassed ? 'You scored above the 80% threshold.' : `You need ${PASS_SCORE} correct to pass. You got ${examScore}.`}
              </p>
            </div>
          </ReceiptCard>

          {examPassed && certified ? (
            <ReceiptCard>
              <div className="text-center py-6" style={{ borderTop: `2px solid ${C.gold}`, borderBottom: `2px solid ${C.gold}` }}>
                <p className="text-xs uppercase tracking-widest mb-3" style={{ color: C.muted }}>Certificate of Completion</p>
                <p className="text-xl font-bold mb-1" style={{ color: C.goldLight }}>Coach Certification</p>
                <p className="text-sm mb-4" style={{ color: C.text }}>Bass Boss Team Edition</p>
                <div className="text-xs space-y-1" style={{ color: C.muted }}>
                  <p>All 6 modules completed</p>
                  <p>Final exam passed: {examScore}/{TOTAL_QUESTIONS}</p>
                  <p>Date: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                </div>
              </div>
            </ReceiptCard>
          ) : null}

          <div className="space-y-3">
            {FINAL_EXAM.map((q, i) => {
              const chosen = examAnswers[i]
              const correct = chosen === q.answer
              return (
                <div key={i} className="rounded-lg p-3" style={{ backgroundColor: C.card, border: `1px solid ${correct ? C.green + '50' : C.red + '50'}` }}>
                  <p className="text-xs font-bold mb-2" style={{ color: correct ? C.green : C.red }}>
                    Q{i + 1} — {correct ? 'Correct' : 'Incorrect'}
                  </p>
                  <p className="text-sm mb-2" style={{ color: C.text }}>{q.q}</p>
                  {!correct && (
                    <p className="text-xs" style={{ color: C.green }}>
                      Correct answer: {q.options[q.answer]}
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          {!examPassed && (
            <GoldButton className="w-full" onClick={retakeExam}>Retake Exam</GoldButton>
          )}
          <button onClick={() => { setExamMode(false); setExamAnswers({}); setExamSubmitted(false) }} className="w-full text-sm py-2" style={{ color: C.muted }}>
            ← Back to Course
          </button>
        </div>
      )
    }

    const answeredCount = Object.keys(examAnswers).length

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <button onClick={() => setExamMode(false)} className="text-sm" style={{ color: C.muted }}>
            ← Back
          </button>
          <span className="text-xs font-bold" style={{ color: C.muted }}>{answeredCount}/{TOTAL_QUESTIONS} answered</span>
        </div>

        <ReceiptCard>
          <p className="bb-title font-bold mb-1" style={{ color: C.text }}>Final Certification Exam</p>
          <p className="text-xs mb-3" style={{ color: C.muted }}>20 questions — must score 80% (16/20) to pass — unlimited retakes</p>
          <div className="w-full rounded-full h-1.5" style={{ backgroundColor: C.border }}>
            <div className="h-1.5 rounded-full transition-all" style={{ width: `${(answeredCount / TOTAL_QUESTIONS) * 100}%`, backgroundColor: C.gold }} />
          </div>
        </ReceiptCard>

        <div className="space-y-4">
          {FINAL_EXAM.map((q, i) => (
            <div key={i} className="rounded-lg p-4" style={{ backgroundColor: C.card, border: `1px solid ${examAnswers[i] !== undefined ? C.gold + '40' : C.border}` }}>
              <p className="text-xs font-bold mb-2" style={{ color: C.muted }}>Question {i + 1} of {TOTAL_QUESTIONS}</p>
              <p className="text-sm font-bold mb-3" style={{ color: C.text }}>{q.q}</p>
              <div className="space-y-2">
                {q.options.map((opt, j) => {
                  const selected = examAnswers[i] === j
                  return (
                    <button
                      key={j}
                      onClick={() => setExamAnswers((prev) => ({ ...prev, [i]: j }))}
                      className="w-full text-left px-3 py-2.5 rounded text-sm transition-colors"
                      style={{
                        backgroundColor: selected ? '#1a1000' : C.bg,
                        border: `1px solid ${selected ? C.gold : C.border}`,
                        color: selected ? C.goldLight : C.text,
                      }}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <GoldButton
          className="w-full"
          onClick={submitExam}
          disabled={answeredCount < TOTAL_QUESTIONS}
        >
          {answeredCount < TOTAL_QUESTIONS ? `Answer all questions (${TOTAL_QUESTIONS - answeredCount} remaining)` : 'Submit Exam'}
        </GoldButton>
      </div>
    )
  }

  // ── Main course list view ─────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <ReceiptCard>
        <div className="flex items-center justify-between mb-1">
          <p className="bb-title font-bold" style={{ color: C.text }}>Coach Certification Course</p>
          <span className="text-sm font-bold" style={{ color: completed.length === MODULES.length ? C.green : C.gold }}>
            {completed.length}/{MODULES.length} modules
          </span>
        </div>
        <div className="w-full rounded-full h-2 mt-2" style={{ backgroundColor: C.border }}>
          <div
            className="h-2 rounded-full transition-all"
            style={{ width: `${(completed.length / MODULES.length) * 100}%`, backgroundColor: completed.length === MODULES.length ? C.green : C.gold }}
          />
        </div>
        {certified && (
          <p className="text-sm font-bold text-center mt-3" style={{ color: C.green }}>Certified Coach</p>
        )}
      </ReceiptCard>

      <div className="space-y-3">
        {MODULES.map((mod) => {
          const done = completed.includes(mod.id)
          return (
            <button
              key={mod.id}
              onClick={() => setActiveModule(mod)}
              className="w-full text-left rounded-lg p-4 transition-all"
              style={{ backgroundColor: C.card, border: `1px solid ${done ? C.gold + '60' : C.border}` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                    style={{ backgroundColor: done ? C.gold : C.bg, color: done ? C.bg : C.muted, border: `1px solid ${done ? C.gold : C.border}` }}
                  >
                    {done ? '✓' : mod.id}
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: C.text }}>{mod.title}</p>
                    <p className="text-xs" style={{ color: C.muted }}>{mod.duration}</p>
                  </div>
                </div>
                <span className="text-lg" style={{ color: C.muted }}>›</span>
              </div>
            </button>
          )
        })}
      </div>

      <div
        className="rounded-lg p-4"
        style={{
          backgroundColor: C.card,
          border: `1px solid ${allModulesDone ? C.gold : C.border}`,
          opacity: allModulesDone ? 1 : 0.5,
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-bold" style={{ color: allModulesDone ? C.text : C.muted }}>Final Certification Exam</p>
            <p className="text-xs" style={{ color: C.muted }}>20 questions · 80% to pass · unlimited retakes</p>
          </div>
          {certified && (
            <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ backgroundColor: C.green + '20', color: C.green, border: `1px solid ${C.green}40` }}>PASSED</span>
          )}
        </div>
        {!allModulesDone && (
          <p className="text-xs" style={{ color: C.muted }}>Complete all 6 modules to unlock the exam.</p>
        )}
        {allModulesDone && (
          <GoldButton className="w-full mt-2" onClick={() => setExamMode(true)}>
            {certified ? 'Retake Exam' : 'Start Final Exam'}
          </GoldButton>
        )}
      </div>
    </div>
  )
}

// ─── ROOT COMPONENT ───────────────────────────────────────────────────────────
export default function TeamDashboard() {
  const { org, isDirector, clearMemberSession } = useOrg()
  const [activeTab, setActiveTab] = useState(() => isDirector ? 'Coach' : 'Captain')
  const [leaveConfirm, setLeaveConfirm] = useState(false)
  const orgId = org?.id

  const visibleTabs = isDirector
    ? TABS
    : TABS.filter((t) => t !== 'Coach')

  const subtitles = {
    Coach: 'Live Dashboard & Roster',
    Captain: 'Boat Logging & Controls',
    Angler: 'Tournament View',
    History: 'Past Tournament Catches',
    Parent: 'Live Feed — No Login Required',
    Conditions: 'Weather, Lake & Solunar',
    Course: 'Coach Certification',
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.bg }}>
      <MascotHeader title="Team Edition" subtitle={subtitles[activeTab]} />

      {/* Tab Bar */}
      <div className="sticky top-0 z-10" style={{ backgroundColor: C.bg, borderBottom: `1px solid ${C.border}` }}>
        <div className="max-w-2xl mx-auto flex">
          {visibleTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors"
              style={{
                color: activeTab === tab ? C.gold : C.muted,
                borderBottom: `2px solid ${activeTab === tab ? C.gold : 'transparent'}`,
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {activeTab === 'Coach' && isDirector && <CoachTab orgId={orgId} tier={org?.tier || 'pro'} />}
        {activeTab === 'Captain' && <CaptainTab orgId={orgId} />}
        {activeTab === 'Angler' && <AnglerTab orgId={orgId} />}
        {activeTab === 'History' && <TournamentHistory orgId={orgId} />}
        {activeTab === 'Parent' && <ParentTab orgId={orgId} />}
        {activeTab === 'Conditions' && <ConditionsTab orgId={orgId} />}
        {activeTab === 'Course' && <CourseTab />}
      </div>

      {!isDirector && (
        <div className="max-w-2xl mx-auto px-4 pb-10 pt-2 text-center">
          <button
            type="button"
            onClick={() => setLeaveConfirm(true)}
            className="text-xs transition-opacity hover:opacity-60"
            style={{ color: '#5a4020' }}
          >
            Leave Team
          </button>
        </div>
      )}

      {leaveConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-5"
          style={{ backgroundColor: 'rgba(0,0,0,0.80)' }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 space-y-4"
            style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}
          >
            <p className="bb-title font-bold text-sm text-center" style={{ color: C.text }}>Leave Team?</p>
            <p className="text-xs text-center" style={{ color: C.muted }}>
              You will need to re-enter the Team Code to rejoin.
            </p>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setLeaveConfirm(false)}
                className="flex-1 py-2.5 rounded font-bold text-sm transition-colors"
                style={{ backgroundColor: C.bg, color: C.muted, border: `1px solid ${C.border}` }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { setLeaveConfirm(false); clearMemberSession() }}
                className="flex-1 py-2.5 rounded font-bold text-sm transition-colors"
                style={{ backgroundColor: C.red, color: '#fff' }}
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
