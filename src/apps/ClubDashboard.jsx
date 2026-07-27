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
import { activityRating } from '../utils/solunar'
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

const CLUB_TABS = ['Director', 'Captain', 'Angler', 'History', 'Feed', 'Conditions']

// ─── helpers ──────────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <p className="text-xs uppercase tracking-widest font-bold mb-2" style={{ color: C.muted }}>
      {children}
    </p>
  )
}

function GoldButton({ children, onClick, disabled, className = '', danger = false }) {
  return (
    <button
      type={onClick ? 'button' : 'submit'}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded font-bold text-sm transition-colors disabled:opacity-50 ${className}`}
      style={{ backgroundColor: danger ? C.red : C.gold, color: danger ? '#fff' : C.bg }}
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
      style={{ backgroundColor: C.bg, border: `1px solid ${C.border}`, color: C.text }}
      onFocus={(e) => (e.target.style.borderColor = C.gold)}
      onBlur={(e) => (e.target.style.borderColor = C.border)}
    />
  )
}

// ─── LENGTH-TO-WEIGHT CHART ───────────────────────────────────────────────────
const LENGTH_WEIGHT_CHART = {
  14: 1.31, 14.5: 1.50, 15: 1.69, 15.5: 1.88, 16: 2.13, 16.5: 2.38,
  17: 2.63, 17.5: 2.88, 18: 3.13, 18.5: 3.44, 19: 3.75, 19.5: 4.06,
  20: 4.38, 20.5: 4.69, 21: 5.00, 21.5: 5.38, 22: 5.75, 22.5: 6.06,
  23: 6.50, 23.5: 7.00, 24: 7.50, 24.5: 8.00, 25: 8.50, 25.5: 9.06,
  26: 9.63, 26.5: 10.25, 27: 10.88, 27.5: 11.50, 28: 12.13,
}

function lookupPaperWeight(rawLength) {
  if (!rawLength || isNaN(rawLength) || rawLength <= 0) return null
  const rounded = Math.ceil(rawLength * 2) / 2
  const isOverChart = rounded > 28
  const key = isOverChart ? 28 : rounded
  const weight = LENGTH_WEIGHT_CHART[key]
  return weight != null ? { rounded, weight, isOverChart } : null
}

const SCORING_LABELS = { best5: 'Best 5', bigbass: 'Big Bass', alllegal: 'All Legal Fish' }
const TYPE_LABELS = { individual: 'Individual', team: 'Team' }

// ─── STANDINGS ────────────────────────────────────────────────────────────────
function computeStandings(catches, boats, tournament) {
  if (!tournament) return { standings: [], bigBassLeader: null, bigBassLeaders: [] }
  const sf = tournament.scoring_format || 'best5'
  const isIndividual = tournament.format_type === 'individual'
  const isPaperTournament = !!tournament.is_paper_tournament
  const active = catches.filter((c) => {
    if (c.culled || c.tournament_id !== tournament.id) return false
    if (isPaperTournament) return c.review_status === 'approved'
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

  let bigBassLeader = null
  let bigBassLeaders = []
  if (active.length > 0 && (tournament.big_bass_side_pot || sf === 'bigbass')) {
    const maxWeight = active.reduce((max, c) => Math.max(max, parseFloat(c.weight) || 0), 0)
    const tied = active
      .filter((c) => parseFloat(c.weight) === maxWeight)
      .map((c) => ({
        angler: c.angler_name,
        boat: boats.find((b) => b.id === c.boat_id) || null,
        weight: parseFloat(c.weight),
        length: c.length_inches ? parseFloat(c.length_inches) : null,
        createdAt: c.created_at,
        catchId: c.id,
      }))
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    bigBassLeaders = tied
    bigBassLeader = tied[0] || null
  }

  return { standings, bigBassLeader, bigBassLeaders }
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

      {isOver ? (
        <div className="rounded-lg p-6 text-center" style={{ backgroundColor: '#1a0000', border: `2px solid ${C.red}`, boxShadow: `0 0 40px ${C.red}40` }}>
          <p className="text-3xl font-bold uppercase tracking-widest" style={{ color: C.red }}>Lines Out</p>
          <p className="text-lg font-bold mt-1" style={{ color: C.text }}>Tournament Over</p>
        </div>
      ) : isFinalCountdown ? (
        <div className="rounded-lg p-6 text-center" style={{ backgroundColor: '#1a0000', border: `2px solid ${C.red}`, boxShadow: `0 0 50px ${C.red}50` }}>
          <p className="text-xs uppercase tracking-widest font-bold mb-3" style={{ color: C.red }}>Final Countdown</p>
          <p className="text-8xl font-bold font-mono leading-none" style={{ color: C.red }}>{Math.max(0, remaining)}</p>
          <p className="text-sm mt-3" style={{ color: C.muted }}>seconds remaining</p>
        </div>
      ) : remaining !== null ? (
        <div
          className="rounded-lg p-4 flex items-center justify-between"
          style={{ backgroundColor: C.card, border: `1px solid ${remaining > 1800 ? C.green + '60' : remaining > 300 ? C.gold + '60' : C.red + '60'}` }}
        >
          <div>
            <p className="text-xs uppercase tracking-widest font-bold mb-1" style={{ color: C.muted }}>Time Remaining</p>
            <p className="text-4xl font-bold font-mono" style={{ color: remaining > 1800 ? C.green : remaining > 300 ? C.goldLight : C.red }}>
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

// ─── BIG BASS CARD ────────────────────────────────────────────────────────────
function BigBassCard({ leaders, isSidePot, isEnded }) {
  const isTie = leaders.length > 1
  const title = isEnded
    ? isSidePot ? 'Big Bass Side Pot Winner' : 'Big Bass Winner'
    : isSidePot ? 'Big Bass Side Pot Leader' : 'Big Bass Leader'

  function formatTime(iso) {
    if (!iso) return ''
    return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        border: isEnded ? `2px solid ${C.gold}` : `1px solid ${C.gold}50`,
        boxShadow: isEnded ? `0 0 24px ${C.gold}20` : 'none',
      }}
    >
      <div className="px-4 py-2.5 flex items-center justify-between" style={{ backgroundColor: isEnded ? `${C.gold}18` : C.card }}>
        <div className="flex items-center gap-2">
          {isEnded && <span className="text-base">🎣</span>}
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: C.gold }}>{title}</p>
        </div>
        {isTie && (
          <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ color: C.gold, backgroundColor: `${C.gold}18`, border: `1px solid ${C.gold}40` }}>TIE</span>
        )}
      </div>
      <div className="divide-y" style={{ backgroundColor: C.bg, borderColor: C.border }}>
        {leaders.map((l, i) => (
          <div key={l.catchId || i} className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate" style={{ color: C.text }}>{l.angler}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {l.boat && <span className="text-xs" style={{ color: C.muted }}>{l.boat.name}</span>}
                {l.length != null && <span className="text-xs" style={{ color: C.muted }}>{l.length.toFixed(1)}"</span>}
                {l.createdAt && <span className="text-xs" style={{ color: C.muted }}>@ {formatTime(l.createdAt)}</span>}
              </div>
            </div>
            <span className="font-bold text-lg font-mono flex-shrink-0" style={{ color: C.goldLight }}>{l.weight.toFixed(2)} lbs</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── WEIGH-IN STATION ────────────────────────────────────────────────────────
function WeighInStation({ boats, tournament, orgId, onSaved }) {
  const [boatId, setBoatId] = useState('')
  const [anglerName, setAnglerName] = useState('')
  const [weight, setWeight] = useState('')
  const [length, setLength] = useState('')
  const [lengthError, setLengthError] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const minLength = tournament?.min_length_inches ? parseFloat(tournament.min_length_inches) : null
  const isPaper = !!tournament?.is_paper_tournament
  const paperRawLen = parseFloat(length)
  const paperResult = isPaper && length && !isNaN(paperRawLen) && paperRawLen > 0
    ? lookupPaperWeight(paperRawLen) : null
  const paperShortFish = isPaper && minLength && length && !isNaN(paperRawLen) && paperRawLen > 0
    && paperRawLen < minLength

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = []
    if (!boatId) errs.push('Select a boat')
    if (!anglerName.trim()) errs.push('Enter angler name')
    if (!isPaper && (!weight || parseFloat(weight) <= 0)) errs.push('Enter a valid weight')
    if (isPaper && (!length || parseFloat(length) <= 0)) errs.push('Enter fish length')
    if (errs.length > 0) { setFormError(errs.join(' · ')); return }
    setFormError('')

    let submitWeight, submitLength
    if (isPaper) {
      const rawLen = parseFloat(length)
      if (!rawLen || isNaN(rawLen) || rawLen <= 0) { setFormError('Enter a valid length'); return }
      if (minLength && rawLen < minLength) { setLengthError(`Short fish — does not count (min ${minLength}")`); return }
      const result = lookupPaperWeight(rawLen)
      if (!result) { setLengthError('Length out of range'); return }
      submitWeight = result.weight
      submitLength = rawLen
    } else {
      const w = parseFloat(weight)
      if (!w || w <= 0) { setFormError('Enter a valid weight'); return }
      if (minLength) {
        const l = parseFloat(length)
        if (!l || l < minLength) { setLengthError(`Short fish — does not count (min ${minLength}")`); return }
      }
      submitWeight = w
      submitLength = minLength ? parseFloat(length) : null
    }

    setLengthError(''); setFormError('')
    setSaving(true)
    const { error } = await supabase.from('catches').insert([{
      tournament_id: tournament.id,
      boat_id: boatId,
      angler_name: anglerName.trim(),
      weight: submitWeight,
      length_inches: submitLength,
      org_id: orgId,
    }])
    if (error) { alert(`Failed to log catch: ${error.message}`) }
    else { setAnglerName(''); setWeight(''); setLength(''); setLengthError(''); setFormError(''); onSaved() }
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
      {isPaper ? (
        <>
          <Input
            type="number" step="0.25" min="1"
            value={length}
            onChange={(e) => { setLength(e.target.value); setLengthError('') }}
            placeholder={minLength ? `Length in inches (min ${minLength}")` : 'Length in inches'}
          />
          {paperResult && !paperShortFish && (
            <div className="rounded px-3 py-2 text-xs space-y-0.5" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
              <div style={{ color: C.muted }}>
                Rounded to <span style={{ color: C.text }}>{paperResult.rounded}"</span>
                {' → '}
                <span className="font-bold" style={{ color: C.gold }}>{paperResult.weight.toFixed(2)} lbs</span>
              </div>
              {paperResult.isOverChart && (
                <div className="text-xs font-bold" style={{ color: C.gold }}>Over 28" — flagged for review, using 28" chart weight</div>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <Input type="number" step="0.01" min="0.1" max="25" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Weight (lbs)" />
          {minLength && (
            <Input
              type="number" step="0.1" min="1"
              value={length}
              onChange={(e) => { setLength(e.target.value); setLengthError('') }}
              placeholder={`Length (min ${minLength}")`}
            />
          )}
        </>
      )}
      {formError && (
        <p className="text-xs text-center font-bold py-1.5 rounded" style={{ color: C.red, backgroundColor: '#1a0000', border: `1px solid ${C.red}40` }}>{formError}</p>
      )}
      {lengthError && (
        <p className="text-xs text-center font-bold py-1.5 rounded" style={{ color: C.red, backgroundColor: '#1a0000', border: `1px solid ${C.red}40` }}>{lengthError}</p>
      )}
      <GoldButton disabled={saving || (isPaper && (!paperResult || paperShortFish))} className="w-full">
        {isPaper && paperResult && !paperShortFish ? `Log ${paperResult.weight.toFixed(2)} lbs (${paperResult.rounded}")` : 'Log Catch'}
      </GoldButton>
    </form>
  )
}

// ─── PAPER REVIEW QUEUE ───────────────────────────────────────────────────────
const REJECTION_REASONS = [
  'Open mouth', 'Hand over gill plate, eye, or tail', 'Fish not fully visible',
  'Board not fully visible', 'Identifier not visible', 'Measurement markings unclear',
  'Fish not on left side', 'Other',
]

function PaperReviewQueue({ tournament, boats, onReviewed, readOnly = false }) {
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [reviewing, setReviewing] = useState(null)
  const [rejReason, setRejReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [photoModal, setPhotoModal] = useState(null)

  useEffect(() => { loadQueue() }, [tournament?.id, readOnly])

  async function loadQueue() {
    setLoading(true)
    let query = supabase.from('catches').select('*')
      .eq('tournament_id', tournament.id)
      .order('created_at', { ascending: true })
    if (!readOnly) {
      query = query.eq('review_status', 'pending_review')
    }
    const { data } = await query
    setQueue(data || [])
    setLoading(false)
  }

  useEffect(() => {
    if (!tournament?.id || readOnly) return
    const ch = supabase.channel('club-review-queue-' + tournament.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'catches', filter: `tournament_id=eq.${tournament.id}` }, () => loadQueue())
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [tournament?.id, readOnly])

  async function approve(c) {
    setSaving(true)
    await supabase.from('catches').update({ review_status: 'approved', rejection_reason: null }).eq('id', c.id)
    setReviewing(null)
    await loadQueue()
    onReviewed()
    setSaving(false)
  }

  async function reject(c) {
    if (!rejReason) return
    setSaving(true)
    await supabase.from('catches').update({ review_status: 'rejected', rejection_reason: rejReason }).eq('id', c.id)
    setReviewing(null)
    setRejReason('')
    await loadQueue()
    onReviewed()
    setSaving(false)
  }

  return (
    <div>
      {photoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.92)' }} onClick={() => setPhotoModal(null)}>
          <img src={photoModal} alt="Catch photo" className="max-w-full max-h-full rounded-lg" style={{ border: `2px solid ${C.gold}` }} onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {reviewing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.88)' }}>
          <div className="w-full max-w-md rounded-2xl overflow-y-auto max-h-[90vh] space-y-4 p-5" style={{ backgroundColor: C.card, border: `2px solid ${C.gold}` }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="bb-title font-bold text-base" style={{ color: C.goldLight }}>Review Catch</p>
                <p className="text-xs mt-0.5" style={{ color: C.muted }}>
                  {reviewing.angler_name} · {boats.find((b) => b.id === reviewing.boat_id)?.name || 'Unknown boat'}
                </p>
              </div>
              <button onClick={() => { setReviewing(null); setRejReason('') }} className="text-lg leading-none" style={{ color: C.muted }}>✕</button>
            </div>

            <div className="flex gap-4 rounded-lg p-3" style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}>
              <div>
                <p className="text-xs" style={{ color: C.muted }}>Length</p>
                <p className="font-bold text-lg font-mono" style={{ color: C.text }}>{reviewing.length_inches}"</p>
              </div>
              <div>
                <p className="text-xs" style={{ color: C.muted }}>Converted</p>
                <p className="font-bold text-lg font-mono" style={{ color: C.goldLight }}>{parseFloat(reviewing.weight).toFixed(2)} lbs</p>
              </div>
            </div>

            {reviewing.photo_url ? (
              <img src={reviewing.photo_url} alt="Catch" className="w-full rounded-lg object-cover cursor-zoom-in" style={{ maxHeight: '260px', border: `1px solid ${C.border}` }} onClick={() => setPhotoModal(reviewing.photo_url)} />
            ) : (
              <div className="rounded-lg p-6 text-center text-xs" style={{ backgroundColor: C.bg, border: `1px solid ${C.border}`, color: C.muted }}>No photo attached</div>
            )}

            {readOnly ? (
              <button onClick={() => { setReviewing(null); setRejReason('') }} className="w-full py-3 rounded-lg text-sm font-bold uppercase tracking-widest transition hover:opacity-80" style={{ backgroundColor: C.card, color: C.muted, border: `1px solid ${C.border}` }}>Close</button>
            ) : (<>
              <GoldButton disabled={saving} onClick={() => approve(reviewing)} className="w-full">Approve</GoldButton>

              <div>
                <p className="text-xs mb-1.5 font-bold uppercase tracking-wider" style={{ color: C.muted }}>Reject — select reason</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {REJECTION_REASONS.map((r) => (
                    <button key={r} type="button" onClick={() => setRejReason(r)}
                      className="px-2 py-1 rounded text-xs font-bold transition-colors"
                      style={{ backgroundColor: rejReason === r ? C.red : C.bg, color: rejReason === r ? '#fff' : C.muted, border: `1px solid ${rejReason === r ? C.red : C.border}` }}
                    >{r}</button>
                  ))}
                </div>
                <GoldButton danger disabled={!rejReason || saving} onClick={() => reject(reviewing)} className="w-full">
                  Reject — {rejReason || 'select reason above'}
                </GoldButton>
              </div>
            </>)}
          </div>
        </div>
      )}

      <ReceiptCard>
        <div className="flex items-center justify-between mb-3">
          <SectionLabel>{readOnly ? 'All Catch Photos' : 'Photo Review Queue'}</SectionLabel>
          {!readOnly && queue.length > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ backgroundColor: `${C.gold}20`, color: C.gold, border: `1px solid ${C.gold}40` }}>
              {queue.length} pending
            </span>
          )}
        </div>
        {loading ? (
          <p className="text-xs text-center py-4" style={{ color: C.muted }}>Loading…</p>
        ) : queue.length === 0 ? (
          <p className="text-xs text-center py-4" style={{ color: C.muted }}>{readOnly ? 'No catches with photos for this tournament.' : 'No catches pending review.'}</p>
        ) : (
          <div className="space-y-2">
            {queue.map((c) => {
              const boat = boats.find((b) => b.id === c.boat_id)
              return (
                <button key={c.id} type="button" onClick={() => { setReviewing(c); setRejReason('') }}
                  className="w-full rounded-lg p-3 text-left flex items-center gap-3 transition-colors"
                  style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}
                >
                  {c.photo_url ? (
                    <img src={c.photo_url} alt="" className="w-12 h-12 rounded object-cover flex-shrink-0" style={{ border: `1px solid ${C.border}` }} />
                  ) : (
                    <div className="w-12 h-12 rounded flex-shrink-0 flex items-center justify-center text-lg" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>?</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: C.text }}>{c.angler_name}</p>
                    <p className="text-xs truncate" style={{ color: C.muted }}>{boat?.name || 'Unknown boat'}</p>
                    <p className="text-xs font-mono" style={{ color: C.goldLight }}>{c.length_inches}" → {parseFloat(c.weight).toFixed(2)} lbs</p>
                  </div>
                  <span className="text-xs font-bold" style={{ color: C.gold }}>{readOnly ? 'View ›' : 'Review ›'}</span>
                </button>
              )
            })}
          </div>
        )}
      </ReceiptCard>
    </div>
  )
}

// ─── DIRECTOR TAB ─────────────────────────────────────────────────────────────
function DirectorTab({ orgId, tier = 'pro' }) {
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
  const [tourneyState, setTourneyState] = useState(null)
  const [activeTournament, setActiveTournament] = useState(null)
  const [loading, setLoading] = useState(true)

  // Tournament form state
  const [newName, setNewName] = useState('')
  const [newLake, setNewLake] = useState(lakes[0].id)
  const [newDate, setNewDate] = useState('')
  const [newStartTime, setNewStartTime] = useState('')
  const [newEndTime, setNewEndTime] = useState('')
  const [newFinalCountdown, setNewFinalCountdown] = useState('60')
  const [newFormatType, setNewFormatType] = useState('team')
  const [newScoringFormat, setNewScoringFormat] = useState('best5')
  const [newBigBassSidePot, setNewBigBassSidePot] = useState(false)
  const [newMinLength, setNewMinLength] = useState('')
  const [newIsPaper, setNewIsPaper] = useState(false)
  const [newFishLimit, setNewFishLimit] = useState(5)

  // Boat form state
  const [newBoatName, setNewBoatName] = useState('')
  const [newBoatCaptain, setNewBoatCaptain] = useState('')
  const [newBoatA1, setNewBoatA1] = useState('')
  const [newBoatA2, setNewBoatA2] = useState('')
  const [saving, setSaving] = useState(false)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [formErrors, setFormErrors] = useState({})

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [t, b, c, ts] = await Promise.all([
      supabase.from('tournaments').select('*').eq('org_id', orgId).order('date', { ascending: false }),
      supabase.from('boats').select('*').eq('org_id', orgId).order('name'),
      supabase.from('catches').select('*').eq('org_id', orgId).order('created_at', { ascending: false }),
      supabase.from('tournament_state').select('*').eq('org_id', orgId).maybeSingle(),
    ])
    const tourList = t.data || []
    setTournaments(tourList)
    setBoats(b.data || [])
    setCatches(c.data || [])
    if (ts.data?.tournament_id) {
      const active = tourList.find((x) => x.id === ts.data.tournament_id)
      setActiveTournament(active || null)
      setTourneyState(ts.data)
    } else {
      setTourneyState(ts.data || null)
    }
    setLoading(false)
  }

  async function createTournament(e) {
    e.preventDefault()
    const errs = {}
    if (!newName.trim()) errs.newName = 'Tournament name is required'
    if (!newDate) errs.newDate = 'Tournament date is required'
    if (!newStartTime) errs.newStartTime = 'Start time is required'
    if (!newEndTime) errs.newEndTime = 'End time is required'
    if (newStartTime && newEndTime && new Date(newEndTime) <= new Date(newStartTime)) errs.newEndTime = 'End time must be after start time'
    setFormErrors(errs)
    if (Object.keys(errs).length > 0) return
    setSaving(true)
    const { error } = await supabase.from('tournaments').insert([{
      name: newName.trim(),
      lake_name: lakes.find((l) => l.id === newLake)?.name || newLake,
      lake_id: newLake,
      date: newDate || null,
      start_time: newStartTime ? new Date(newStartTime).toISOString() : null,
      end_time: newEndTime ? new Date(newEndTime).toISOString() : null,
      final_countdown_seconds: parseInt(newFinalCountdown) || 60,
      format_type: newFormatType,
      scoring_format: newScoringFormat,
      big_bass_side_pot: newScoringFormat !== 'bigbass' && newBigBassSidePot,
      min_length_inches: newMinLength ? parseFloat(newMinLength) : null,
      is_paper_tournament: newIsPaper,
      fish_limit: newFishLimit,
      app_type: 'club',
      org_id: orgId,
    }])
    if (error) { alert(`Failed to create tournament: ${error.message}`) }
    else {
      setNewName(''); setNewLake(lakes[0].id); setNewDate('')
      setNewStartTime(''); setNewEndTime(''); setNewFinalCountdown('60')
      setNewFormatType('team'); setNewScoringFormat('best5')
      setNewBigBassSidePot(false); setNewMinLength(''); setNewIsPaper(false)
      setNewFishLimit(5)
      load()
    }
    setSaving(false)
  }

  async function setTournamentStatus(tournamentId, status) {
    if (tourneyState) {
      await supabase.from('tournament_state').update({ tournament_id: tournamentId, status, updated_at: new Date().toISOString() }).eq('org_id', orgId)
    } else {
      await supabase.from('tournament_state').insert([{ org_id: orgId, tournament_id: tournamentId, status }])
    }
    load()
  }

  async function addBoat(e) {
    e.preventDefault()
    const errs = {}
    if (!newBoatName.trim()) errs.newBoatName = 'Boat name is required'
    setFormErrors(errs)
    if (Object.keys(errs).length > 0) return
    setSaving(true)
    const { error } = await supabase.from('boats').insert([{
      name: newBoatName.trim(),
      captain_name: newBoatCaptain.trim() || null,
      angler1_name: newBoatA1.trim(),
      angler2_name: newBoatA2.trim(),
      org_id: orgId,
    }])
    if (error) { alert(`Failed to add boat: ${error.message}`) }
    else { setNewBoatName(''); setNewBoatCaptain(''); setNewBoatA1(''); setNewBoatA2(''); load() }
    setSaving(false)
  }

  const { standings, bigBassLeaders } = computeStandings(catches, boats, activeTournament)
  const liveCatches = activeTournament
    ? catches.filter((c) => c.tournament_id === activeTournament.id && !c.culled).slice(0, 20)
    : []

  // Tier enforcement (no limits for pro, which covers all beta orgs)
  const thisYear = new Date().getFullYear()
  const yearTourneyCount = tournaments.filter((t) => {
    const d = new Date(t.date || t.created_at)
    return d.getFullYear() === thisYear
  }).length
  const anglerCount = boats.length
  const overAnglers = tier !== 'pro' && anglerCount > tierLimits.anglers
  const overTournaments = tier !== 'pro' && tierLimits.tournaments !== Infinity && yearTourneyCount > tierLimits.tournaments
  const tierLabel = tier === 'starter' ? 'Starter' : tier === 'standard' ? 'Standard' : 'Pro'

  if (loading) return <p className="text-center py-12" style={{ color: C.muted }}>Loading…</p>

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

      <TournamentCountdown tournament={activeTournament} tourneyStatus={tourneyState?.status} />

      {/* Plan Usage — only shown for non-pro tiers */}
      {tier !== 'pro' && (
        <ReceiptCard>
          <SectionLabel>Plan Usage — {tierLabel}</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs mb-0.5" style={{ color: C.muted }}>Anglers (boats)</p>
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
          <Input value={newName} onChange={(e) => { setNewName(e.target.value); setFormErrors((p) => ({ ...p, newName: undefined })) }} placeholder="Tournament name" style={formErrors.newName ? { borderColor: C.red } : {}} />
          {formErrors.newName && <p className="text-xs font-bold" style={{ color: C.red }}>{formErrors.newName}</p>}
          <LakeSelect value={newLake} onChange={setNewLake} />
          <div>
            <p className="text-xs mb-1" style={{ color: C.muted }}>Tournament Date</p>
            <Input type="date" value={newDate} onChange={(e) => { setNewDate(e.target.value); setFormErrors((p) => ({ ...p, newDate: undefined })) }} style={formErrors.newDate ? { borderColor: C.red } : {}} />
            {formErrors.newDate && <p className="text-xs font-bold" style={{ color: C.red }}>{formErrors.newDate}</p>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs mb-1" style={{ color: C.muted }}>Start time</p>
              <Input type="datetime-local" value={newStartTime} onChange={(e) => { setNewStartTime(e.target.value); setFormErrors((p) => ({ ...p, newStartTime: undefined })) }} style={formErrors.newStartTime ? { borderColor: C.red } : {}} />
              {formErrors.newStartTime && <p className="text-xs font-bold" style={{ color: C.red }}>{formErrors.newStartTime}</p>}
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: C.muted }}>End time</p>
              <Input type="datetime-local" value={newEndTime} onChange={(e) => { setNewEndTime(e.target.value); setFormErrors((p) => ({ ...p, newEndTime: undefined })) }} style={formErrors.newEndTime ? { borderColor: C.red } : {}} />
              {formErrors.newEndTime && <p className="text-xs font-bold" style={{ color: C.red }}>{formErrors.newEndTime}</p>}
            </div>
          </div>
          <div>
            <p className="text-xs mb-1.5" style={{ color: C.muted }}>Final countdown threshold</p>
            <select
              value={newFinalCountdown}
              onChange={(e) => setNewFinalCountdown(e.target.value)}
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
          <div>
            <p className="text-xs mb-1.5" style={{ color: C.muted }}>Format</p>
            <div className="flex gap-2">
              {['team', 'individual'].map((f) => (
                <button key={f} type="button" onClick={() => setNewFormatType(f)}
                  className="flex-1 py-1.5 rounded text-xs font-bold transition-colors"
                  style={{ backgroundColor: newFormatType === f ? C.gold : C.bg, color: newFormatType === f ? C.bg : C.muted, border: `1px solid ${newFormatType === f ? C.gold : C.border}` }}
                >{TYPE_LABELS[f]}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs mb-1.5" style={{ color: C.muted }}>Scoring</p>
            <div className="flex gap-2">
              {['best5', 'bigbass', 'alllegal'].map((f) => (
                <button key={f} type="button" onClick={() => setNewScoringFormat(f)}
                  className="flex-1 py-1.5 rounded text-xs font-bold transition-colors"
                  style={{ backgroundColor: newScoringFormat === f ? C.gold : C.bg, color: newScoringFormat === f ? C.bg : C.muted, border: `1px solid ${newScoringFormat === f ? C.gold : C.border}` }}
                >{SCORING_LABELS[f]}</button>
              ))}
            </div>
          </div>
          {newScoringFormat !== 'bigbass' && (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={newBigBassSidePot} onChange={(e) => setNewBigBassSidePot(e.target.checked)} className="w-4 h-4 rounded" style={{ accentColor: C.gold }} />
              <span className="text-sm" style={{ color: C.text }}>Big Bass side pot</span>
            </label>
          )}
          <Input type="number" step="0.1" min="1" value={newMinLength} onChange={(e) => setNewMinLength(e.target.value)} placeholder="Min length in inches (optional, e.g. 14)" />
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={newIsPaper} onChange={(e) => setNewIsPaper(e.target.checked)} className="w-4 h-4 rounded" style={{ accentColor: C.gold }} />
            <span className="text-sm" style={{ color: C.text }}>Paper tournament (length → weight chart)</span>
          </label>
          <div>
            <p className="text-xs mb-1.5" style={{ color: C.muted }}>Fish Limit</p>
            <div className="flex gap-2">
              {[1, 3, 5].map((n) => (
                <button key={n} type="button" onClick={() => setNewFishLimit(n)}
                  className="flex-1 py-1.5 rounded text-xs font-bold transition-colors"
                  style={{ backgroundColor: newFishLimit === n ? C.gold : C.bg, color: newFishLimit === n ? C.bg : C.muted, border: `1px solid ${newFishLimit === n ? C.gold : C.border}` }}
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
                      {t.big_bass_side_pot ? ' · BB Side Pot' : ''}
                      {t.min_length_inches ? ` · ≥${t.min_length_inches}"` : ''}
                      {t.is_paper_tournament ? ' · Paper' : ''}
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

      {/* Boats Roster */}
      <ReceiptCard>
        <SectionLabel>Boats Roster</SectionLabel>
        <form onSubmit={addBoat} className="space-y-2 mb-4">
          <div className="grid grid-cols-2 gap-2">
            <Input value={newBoatName} onChange={(e) => { setNewBoatName(e.target.value); setFormErrors((p) => ({ ...p, newBoatName: undefined })) }} placeholder="Boat name" style={formErrors.newBoatName ? { borderColor: C.red } : {}} />
            <Input value={newBoatCaptain} onChange={(e) => setNewBoatCaptain(e.target.value)} placeholder="Captain (optional)" />
            <Input value={newBoatA1} onChange={(e) => setNewBoatA1(e.target.value)} placeholder="Angler 1" />
            <Input value={newBoatA2} onChange={(e) => setNewBoatA2(e.target.value)} placeholder="Angler 2" />
          </div>
          {formErrors.newBoatName && <p className="text-xs font-bold" style={{ color: C.red }}>{formErrors.newBoatName}</p>}
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
                  {b.captain_name ? `Capt: ${b.captain_name} · ` : ''}{b.angler1_name}{b.angler2_name ? ` · ${b.angler2_name}` : ''}
                </p>
              </div>
            ))}
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

      {/* Live Standings */}
      <ReceiptCard>
        <div className="flex items-center justify-between mb-2">
          <SectionLabel>{tourneyState?.status === 'ended' ? 'Final Results' : 'Live Standings'}</SectionLabel>
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
              <div key={s.key} className="flex items-center gap-3 py-1.5 px-2 rounded"
                style={{ backgroundColor: tourneyState?.status === 'ended' && i === 0 ? `${C.gold}12` : C.bg, border: `1px solid ${tourneyState?.status === 'ended' && i === 0 ? C.gold + '60' : C.border}` }}
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

      {bigBassLeaders.length > 0 && (
        <BigBassCard leaders={bigBassLeaders} isSidePot={!!activeTournament?.big_bass_side_pot} isEnded={tourneyState?.status === 'ended'} />
      )}

      <ShareParentLink tournamentId={activeTournament?.id} isLive={tourneyState?.status === 'live'} />

      {activeTournament && tourneyState?.status === 'live' && (
        <ReceiptCard>
          <SectionLabel>Weigh-in Station</SectionLabel>
          <WeighInStation boats={boats} tournament={activeTournament} orgId={orgId} onSaved={load} />
        </ReceiptCard>
      )}

      {activeTournament?.is_paper_tournament && tourneyState?.status === 'live' && (
        <PaperReviewQueue tournament={activeTournament} boats={boats} onReviewed={load} />
      )}

      {activeTournament?.is_paper_tournament && tourneyState?.status === 'ended' && (
        <ReceiptCard>
          <SectionLabel>Paper Tournament Catches</SectionLabel>
          <p className="text-xs mb-3" style={{ color: C.muted }}>
            This tournament has ended. Review catch photos below.
          </p>
          <PaperReviewQueue tournament={activeTournament} boats={boats} onReviewed={load} readOnly />
        </ReceiptCard>
      )}

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

// ─── CAPTAIN TAB (CLUB) ───────────────────────────────────────────────────────
function CaptainTab({ orgId }) {
  const [boats, setBoats] = useState([])
  const [selectedBoat, setSelectedBoat] = useState(null)
  const [catches, setCatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [anglerMode, setAnglerMode] = useState(1)
  const [weight, setWeight] = useState('')
  const [length, setLength] = useState('')
  const [lengthError, setLengthError] = useState('')
  const [catchError, setCatchError] = useState('')
  const [photo, setPhoto] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [pendingCatch, setPendingCatch] = useState(null)
  const [checklistPhoto, setChecklistPhoto] = useState(null)
  const [checklistPhotoFile, setChecklistPhotoFile] = useState(null)
  const [checklistUploading, setChecklistUploading] = useState(false)
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
    const { data } = await supabase.from('catches').select('*')
      .eq('boat_id', boatId).eq('tournament_id', tournament.id)
      .order('created_at', { ascending: false })
    setCatches(data || [])
  }

  async function handleBoatSelect(boat) {
    setSelectedBoat(boat)
    if (anglerMode === 2 && !boat.angler2_name) setAnglerMode(1)
    if (anglerMode === 3 && !boat.captain_name) setAnglerMode(1)
    loadCatches(boat.id)
  }

  useEffect(() => {
    if (selectedBoat?.id && activeTournament) loadCatches(selectedBoat.id)
  }, [selectedBoat?.id, activeTournament?.id])

  async function logCatch(e) {
    e.preventDefault()
    if (!selectedBoat || !activeTournament) { setCatchError('No boat or tournament selected'); return }
    setCatchError('')

    const minLen = activeTournament.min_length_inches ? parseFloat(activeTournament.min_length_inches) : null
    const isPaperMode = activeTournament.is_paper_tournament
    let submitWeight, submitLength

    if (isPaperMode) {
      const rawLen = parseFloat(length)
      if (!rawLen || isNaN(rawLen)) { setCatchError('Enter a valid length'); return }
      if (minLen && rawLen < minLen) { setLengthError('Short fish — does not count'); return }
      const result = lookupPaperWeight(rawLen)
      if (!result) { setLengthError('Length out of range'); return }
      submitWeight = result.weight
      submitLength = rawLen
      const anglerName = anglerMode === 1 ? selectedBoat.angler1_name : anglerMode === 2 ? selectedBoat.angler2_name : selectedBoat.captain_name
      setPendingCatch({
        weight: submitWeight,
        length: submitLength,
        rounded: result.rounded,
        isOverChart: result.isOverChart,
        anglerName: anglerName || `Angler ${anglerMode}`,
      })
      setChecklistPhoto(null)
      setChecklistPhotoFile(null)
      return
    }

    const w = parseFloat(weight)
    if (!w || w <= 0) { setCatchError('Enter a valid weight'); return }
    if (minLen) {
      const rawLen = parseFloat(length)
      if (!rawLen || rawLen < minLen) { setLengthError(`Short fish — does not count (min ${minLen}")`); return }
    }
    submitWeight = w
    submitLength = minLen ? parseFloat(length) : null

    setLengthError(''); setCatchError('')
    setSaving(true)
    const anglerName = anglerMode === 1 ? selectedBoat.angler1_name : anglerMode === 2 ? selectedBoat.angler2_name : selectedBoat.captain_name
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
      weight: submitWeight,
      photo_url: uploadedUrl,
      length_inches: submitLength,
      review_status: 'approved',
      org_id: orgId,
    }])
    setWeight(''); setLength(''); setPhoto(null); setPhotoFile(null); setLengthError(''); setCatchError('')
    loadCatches(selectedBoat.id)
    setSaving(false)
  }

  async function confirmPaperCatch() {
    if (!pendingCatch || !checklistPhotoFile) return
    setChecklistUploading(true)
    const ext = checklistPhotoFile.name.split('.').pop() || 'jpg'
    const path = `catches/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    let uploadedUrl = ''
    const { data: uploadData, error: uploadError } = await supabase.storage.from('catch-photos').upload(path, checklistPhotoFile, { upsert: false })
    if (uploadError) { alert(`Photo upload failed: ${uploadError.message}`); setChecklistUploading(false); return }
    if (uploadData?.path) {
      const { data: urlData } = supabase.storage.from('catch-photos').getPublicUrl(uploadData.path)
      uploadedUrl = urlData?.publicUrl || ''
    }
    const { error } = await supabase.from('catches').insert([{
      tournament_id: activeTournament.id,
      boat_id: selectedBoat.id,
      angler_name: pendingCatch.anglerName,
      weight: pendingCatch.weight,
      photo_url: uploadedUrl,
      length_inches: pendingCatch.length,
      review_status: 'pending_review',
      org_id: orgId,
    }])
    if (error) { alert(`Failed to log catch: ${error.message}`); setChecklistUploading(false); return }
    setPendingCatch(null)
    setChecklistPhoto(null)
    setChecklistPhotoFile(null)
    setLength('')
    setLengthError('')
    setChecklistUploading(false)
    loadCatches(selectedBoat.id)
  }

  async function cullCatch(id) {
    await supabase.from('catches').update({ culled: true }).eq('id', id)
    loadCatches(selectedBoat.id)
  }

  const isPaper = !!activeTournament?.is_paper_tournament
  const paperRawLen = parseFloat(length)
  const paperResult = isPaper && length && !isNaN(paperRawLen) && paperRawLen > 0 ? lookupPaperWeight(paperRawLen) : null
  const paperShortFish = isPaper && activeTournament?.min_length_inches && length
    && !isNaN(paperRawLen) && paperRawLen > 0
    && paperRawLen < parseFloat(activeTournament.min_length_inches)

  const activeCatches = catches.filter((c) => !c.culled)

  if (loading) return <p className="text-center py-12" style={{ color: C.muted }}>Loading…</p>

  const PHOTO_CHECKLIST = [
    'Whole fish visible tip to tail — nothing cut off',
    'Entire measuring board visible, including zero end',
    'Unique identifier card clearly visible',
    'Measurement markings legible and unobstructed',
    'Fish lying on left side',
    'Mouth closed',
    'Hand in middle of body only — not over gill plate, eye, or tail',
  ]

  return (
    <div className="space-y-5">
      {/* Paper catch photo checklist modal */}
      {pendingCatch && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="w-full max-w-md rounded-2xl overflow-y-auto max-h-[90vh] space-y-4 p-5" style={{ backgroundColor: C.card, border: `2px solid ${C.gold}` }}>
            <div className="text-center">
              <p className="bb-title font-bold text-base uppercase tracking-widest mb-0.5" style={{ color: C.goldLight }}>Photo Required</p>
              <p className="text-xs" style={{ color: C.muted }}>
                {pendingCatch.rounded.toFixed(1)}" → {pendingCatch.weight.toFixed(2)} lbs · {pendingCatch.anglerName}
              </p>
              {pendingCatch.isOverChart && <p className="text-xs font-bold mt-1" style={{ color: C.gold }}>Over 28" — flagged for review</p>}
            </div>

            <div className="rounded-lg p-3 space-y-2" style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: C.muted }}>Photo Checklist</p>
              {PHOTO_CHECKLIST.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-xs font-bold mt-0.5 flex-shrink-0" style={{ color: C.gold }}>{i + 1}.</span>
                  <span className="text-xs leading-relaxed" style={{ color: C.text }}>{item}</span>
                </div>
              ))}
            </div>

            <PhotoCapture onCapture={(file, url) => { setChecklistPhotoFile(file); setChecklistPhoto(url) }} label="Take or upload catch photo" />

            {checklistPhoto && (
              <img src={checklistPhoto} alt="Catch preview" className="w-full rounded-lg object-cover max-h-52" style={{ border: `1px solid ${C.border}` }} />
            )}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={() => { setPendingCatch(null); setChecklistPhoto(null); setChecklistPhotoFile(null) }}
                className="py-2.5 rounded text-sm font-bold" style={{ border: `1px solid ${C.border}`, color: C.muted }}>
                Cancel
              </button>
              <GoldButton disabled={!checklistPhotoFile || checklistUploading} onClick={confirmPaperCatch}>
                {checklistUploading ? 'Uploading...' : 'Submit for Review'}
              </GoldButton>
            </div>
          </div>
        </div>
      )}

      {/* Boat Selector */}
      <ReceiptCard>
        <SectionLabel>Your Boat</SectionLabel>
        {boats.length === 0 ? (
          <p className="text-sm" style={{ color: C.muted }}>No boats registered. Ask your director to add your boat.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {boats.map((b) => (
              <button key={b.id} onClick={() => handleBoatSelect(b)}
                className="px-3 py-2 rounded text-sm font-bold transition-colors"
                style={{ backgroundColor: selectedBoat?.id === b.id ? C.gold : C.bg, color: selectedBoat?.id === b.id ? C.bg : C.text, border: `1px solid ${selectedBoat?.id === b.id ? C.gold : C.border}` }}
              >{b.name}</button>
            ))}
          </div>
        )}
      </ReceiptCard>

      {selectedBoat && (
        <>
          {/* Log Catch */}
          {activeTournament ? (
            <ReceiptCard>
              {/* Proxy entry: angler selector at top of form */}
              {(selectedBoat.angler2_name || selectedBoat.captain_name) ? (
                <div className="mb-3 pb-3" style={{ borderBottom: `1px solid ${C.border}` }}>
                  <p className="text-xs uppercase tracking-widest font-bold mb-2" style={{ color: C.muted }}>Entering catch for</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setAnglerMode(1)}
                      className="flex-1 py-2 rounded font-bold text-sm transition-colors"
                      style={{ backgroundColor: anglerMode === 1 ? C.gold : C.bg, color: anglerMode === 1 ? C.bg : C.text, border: `1px solid ${anglerMode === 1 ? C.gold : C.border}` }}
                    >{selectedBoat.angler1_name || 'Angler 1'}</button>
                    {selectedBoat.angler2_name && (
                      <button type="button" onClick={() => setAnglerMode(2)}
                        className="flex-1 py-2.5 rounded text-sm transition-colors"
                        style={{ backgroundColor: anglerMode === 2 ? `${C.gold}22` : C.bg, color: anglerMode === 2 ? C.goldLight : C.muted, border: `1px solid ${anglerMode === 2 ? C.gold : C.border}`, fontWeight: anglerMode === 2 ? 700 : 500 }}
                      >
                        <span className="text-xs block" style={{ color: anglerMode === 2 ? C.gold : C.muted, opacity: 0.8 }}>Partner</span>
                        {selectedBoat.angler2_name}
                      </button>
                    )}
                    {selectedBoat.captain_name && (
                      <button type="button" onClick={() => setAnglerMode(3)}
                        className="flex-1 py-2.5 rounded text-sm transition-colors"
                        style={{ backgroundColor: anglerMode === 3 ? `${C.gold}22` : C.bg, color: anglerMode === 3 ? C.goldLight : C.muted, border: `1px solid ${anglerMode === 3 ? C.gold : C.border}`, fontWeight: anglerMode === 3 ? 700 : 500 }}
                      >
                        <span className="text-xs block" style={{ color: anglerMode === 3 ? C.gold : C.muted, opacity: 0.8 }}>Captain</span>
                        {selectedBoat.captain_name}
                      </button>
                    )}
                  </div>
                  {anglerMode === 2 && (
                    <p className="text-xs mt-2 text-center" style={{ color: C.gold }}>Catch will be credited to {selectedBoat.angler2_name}</p>
                  )}
                  {anglerMode === 3 && (
                    <p className="text-xs mt-2 text-center" style={{ color: C.gold }}>Catch will be credited to {selectedBoat.captain_name}</p>
                  )}
                </div>
              ) : null}

              <div className="flex items-center justify-between mb-2">
                <SectionLabel>{anglerMode === 2 ? `Logging for ${selectedBoat.angler2_name}` : anglerMode === 3 ? `Logging for ${selectedBoat.captain_name}` : 'Log Catch'}</SectionLabel>
                {isPaper && <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ color: C.gold, border: `1px solid ${C.gold}40` }}>Paper</span>}
              </div>
              {activeTournament.min_length_inches && (
                <p className="text-xs mb-2" style={{ color: C.muted }}>Min length: {activeTournament.min_length_inches}"</p>
              )}
              <form onSubmit={logCatch} className="space-y-3">
                {isPaper ? (
                  <>
                    <Input type="number" step="0.25" min="1" max="30" value={length}
                      onChange={(e) => { setLength(e.target.value); setLengthError('') }}
                      placeholder="Length (inches, e.g. 16.75)"
                    />
                    {length && !isNaN(paperRawLen) && paperRawLen > 0 && (
                      paperShortFish ? (
                        <div className="rounded px-3 py-2 text-center" style={{ backgroundColor: '#1a0000', border: `1px solid ${C.red}40` }}>
                          <p className="bb-title font-bold text-sm" style={{ color: C.red }}>Short fish — does not count</p>
                        </div>
                      ) : paperResult ? (
                        <div className="rounded px-3 py-2.5 space-y-1" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
                          <div className="flex items-center justify-between text-sm">
                            <span style={{ color: C.muted }}>Rounds up to</span>
                            <span className="font-bold font-mono" style={{ color: C.text }}>{paperResult.rounded.toFixed(1)}"</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span style={{ color: C.muted }}>Converted weight</span>
                            <span className="font-bold font-mono text-base" style={{ color: C.goldLight }}>{paperResult.weight.toFixed(2)} lbs</span>
                          </div>
                          {paperResult.isOverChart && (
                            <p className="text-xs text-center font-bold pt-1" style={{ color: C.gold }}>Over 28" — using 28.0" max (12.13 lbs) · flag for review</p>
                          )}
                        </div>
                      ) : null
                    )}
                    {lengthError && <p className="text-xs text-center font-bold py-1.5 rounded" style={{ color: C.red, backgroundColor: '#1a0000', border: `1px solid ${C.red}40` }}>{lengthError}</p>}
                    {catchError && <p className="text-xs text-center font-bold py-1.5 rounded" style={{ color: C.red, backgroundColor: '#1a0000', border: `1px solid ${C.red}40` }}>{catchError}</p>}
                  </>
                ) : (
                  <>
                    <Input type="number" step="0.01" min="0.1" max="25" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Weight (lbs)" />
                    {activeTournament.min_length_inches && (
                      <Input type="number" step="0.1" min="1" value={length}
                        onChange={(e) => { setLength(e.target.value); setLengthError('') }}
                        placeholder={`Length (min ${activeTournament.min_length_inches}")`}
                      />
                    )}
                    {lengthError && <p className="text-xs text-center font-bold py-1.5 rounded" style={{ color: C.red, backgroundColor: '#1a0000', border: `1px solid ${C.red}40` }}>{lengthError}</p>}
                    {catchError && <p className="text-xs text-center font-bold py-1.5 rounded" style={{ color: C.red, backgroundColor: '#1a0000', border: `1px solid ${C.red}40` }}>{catchError}</p>}
                  </>
                )}
                {!isPaper && <PhotoCapture onCapture={(file, url) => { setPhotoFile(file); setPhoto(url) }} label="Photo (optional)" />}
                <GoldButton disabled={saving || (isPaper && (!length || paperShortFish || !paperResult))} className="w-full">
                  {isPaper && paperResult
                    ? `Review & Submit for ${anglerMode === 2 ? selectedBoat.angler2_name : anglerMode === 3 ? selectedBoat.captain_name : (selectedBoat.angler1_name || 'you')} (${paperResult.weight.toFixed(2)} lbs)`
                    : anglerMode === 2 ? `Log Catch for ${selectedBoat.angler2_name}` : anglerMode === 3 ? `Log Catch for ${selectedBoat.captain_name}` : 'Log Catch'}
                </GoldButton>
              </form>
            </ReceiptCard>
          ) : (
            <ReceiptCard>
              <p className="text-sm text-center py-4" style={{ color: C.muted }}>No live tournament active.</p>
            </ReceiptCard>
          )}

          {/* Boat Catches (paper mode review status) */}
          {isPaper && activeCatches.length > 0 && (
            <ReceiptCard>
              <SectionLabel>Boat Catches</SectionLabel>
              <div className="space-y-2">
                {activeCatches.map((c) => {
                  const status = c.review_status || 'approved'
                  const statusColor = status === 'approved' ? C.green : status === 'rejected' ? C.red : C.gold
                  const statusLabel = status === 'approved' ? 'Approved' : status === 'rejected' ? 'Rejected' : 'Pending'
                  const isPartner = c.angler_name === selectedBoat?.angler2_name
                  const isCaptain = c.angler_name === selectedBoat?.captain_name
                  return (
                    <div key={c.id} className="rounded-lg p-3 space-y-1" style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-bold" style={{ color: C.text }}>{parseFloat(c.weight).toFixed(2)} lbs</span>
                          {c.length_inches && <span className="text-xs ml-2" style={{ color: C.muted }}>{c.length_inches}"</span>}
                          <span className="text-xs ml-2 font-medium" style={{ color: isPartner || isCaptain ? C.gold : C.muted }}>
                            {c.angler_name}{isPartner ? ' (partner)' : isCaptain ? ' (captain)' : ''}
                          </span>
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ color: statusColor, backgroundColor: `${statusColor}18`, border: `1px solid ${statusColor}40` }}>
                          {statusLabel}
                        </span>
                      </div>
                      {status === 'rejected' && c.rejection_reason && <p className="text-xs" style={{ color: C.red }}>Reason: {c.rejection_reason}</p>}
                      {status === 'rejected' && <p className="text-xs" style={{ color: C.muted }}>You may resubmit if time allows.</p>}
                    </div>
                  )
                })}
              </div>
            </ReceiptCard>
          )}

          {/* Cull Mode */}
          {(!activeTournament || (activeTournament.scoring_format !== 'alllegal' && activeTournament.scoring_format !== 'bigbass')) && (
            <ReceiptCard>
              <CullMode catches={activeCatches} onCull={cullCatch} fishLimit={activeTournament?.fish_limit || 5} />
            </ReceiptCard>
          )}
          {activeTournament?.scoring_format === 'alllegal' && (
            <ReceiptCard>
              <p className="text-xs text-center py-2 font-bold uppercase tracking-widest" style={{ color: C.muted }}>All Legal Fish — no cull limit</p>
            </ReceiptCard>
          )}
        </>
      )}
    </div>
  )
}

// ─── ANGLER TAB (CLUB) ────────────────────────────────────────────────────────
function AnglerTab({ orgId }) {
  const [activeTournament, setActiveTournament] = useState(null)
  const [tourneyState, setTourneyState] = useState(null)
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
        <p className="text-sm text-center py-8" style={{ color: C.muted }}>No active tournament. Check back with your director.</p>
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

// ─── FEED TAB (CLUB — public live standings) ──────────────────────────────────
function FeedTab({ orgId }) {
  const [activeTournament, setActiveTournament] = useState(null)
  const [tourneyState, setTourneyState] = useState(null)
  const [boats, setBoats] = useState([])
  const [catches, setCatches] = useState([])
  const [loading, setLoading] = useState(true)
  const refreshTimer = useRef(null)

  useEffect(() => {
    load()
    refreshTimer.current = setInterval(load, 30000)
    return () => clearInterval(refreshTimer.current)
  }, [])

  async function load() {
    const [ts, t, b, c] = await Promise.all([
      supabase.from('tournament_state').select('*').eq('org_id', orgId).maybeSingle(),
      supabase.from('tournaments').select('*').eq('org_id', orgId),
      supabase.from('boats').select('*').eq('org_id', orgId).order('name'),
      supabase.from('catches').select('*').order('created_at', { ascending: false }),
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

  const { standings, bigBassLeaders } = computeStandings(catches, boats, activeTournament)
  const recentCatches = catches.filter((c) => !c.culled).slice(0, 15)

  if (loading) return <p className="text-center py-12" style={{ color: C.muted }}>Loading…</p>

  return (
    <div className="space-y-5">
      <ReceiptCard>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tourneyState?.status === 'live' ? C.green : C.muted, animation: tourneyState?.status === 'live' ? 'pulse 1.5s infinite' : 'none' }}></div>
          <SectionLabel>
            {tourneyState?.status === 'live' ? 'Live Tournament' : tourneyState?.status === 'ended' ? 'Tournament Ended' : 'No Active Tournament'}
          </SectionLabel>
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
            <SectionLabel>{tourneyState?.status === 'ended' ? 'Final Results' : 'Leaderboard'}</SectionLabel>
            {activeTournament && (
              <span className="text-xs" style={{ color: C.muted }}>
                {TYPE_LABELS[activeTournament.format_type || 'team']} · {SCORING_LABELS[activeTournament.scoring_format || 'best5']}
              </span>
            )}
          </div>
          <div className="space-y-2">
            {standings.map((s, i) => (
              <div key={s.key} className="flex items-center gap-3 px-3 py-2.5 rounded"
                style={{ backgroundColor: tourneyState?.status === 'ended' && i === 0 ? `${C.gold}12` : C.bg, border: `1px solid ${i === 0 ? C.gold + '80' : C.border}` }}
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

      {bigBassLeaders.length > 0 && (
        <BigBassCard leaders={bigBassLeaders} isSidePot={!!activeTournament?.big_bass_side_pot} isEnded={tourneyState?.status === 'ended'} />
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
    </div>
  )
}

// ─── CONDITIONS TAB ───────────────────────────────────────────────────────────
const USGS_GAUGES = {
  'lake-fork': '08017410', 'sam-rayburn': '08026000', 'toledo-bend-tx': '08020500',
  'lake-conroe': '08068800', 'lake-texoma': '07299890', 'lake-livingston': '08068090',
  'lake-houston': '08072700', 'lake-lewisville': '08055580', 'lake-ray-hubbard': '08061540',
  'lake-tawakoni': '08017200', 'richland-chambers': '08042689', 'cedar-creek': '08042500',
  'lake-whitney': '08095000', 'possum-kingdom': '08085500', 'lake-granbury': '08096800',
  'lake-belton': '08101000', 'lake-travis': '08158700', 'lake-buchanan': '08153500',
  'lake-waco': '08095200', 'amistad-reservoir': '08446500', 'falcon-lake': '08470200',
  'caddo-lake': '07362100', 'grand-lake': '07190500', 'lake-eufaula-ok': '07315200',
  'kentucky-lake': '03611500', 'lake-guntersville': '03574250', 'lake-okeechobee': '02276625',
}

function windDirLabel(deg) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
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
  const map = { rising: { label: 'Rising', color: C.green }, falling: { label: 'Falling', color: C.red }, steady: { label: 'Steady', color: C.muted }, stable: { label: 'Stable', color: C.muted } }
  const { label, color } = map[trend] || map.steady
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ color, backgroundColor: `${color}18`, border: `1px solid ${color}40` }}>{label}</span>
  )
}

function ConditionsTab({ orgId }) {
  const [location, setLocation] = useState(null)
  const [locError, setLocError] = useState('')
  const [weather, setWeather] = useState(null)
  const [lakeLevel, setLakeLevel] = useState(null)
  const [lakeLevelError, setLakeLevelError] = useState('')
  const [solunar, setSolunar] = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTournament, setActiveTournament] = useState(null)
  const refreshTimer = useRef(null)

  useEffect(() => { loadTournament() }, [])

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
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude, label: 'Your Location', lakeId: null }
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
    await Promise.all([fetchWeather(loc, tour), fetchLakeLevel(loc)])
    computeSolunar(loc)
    setLastRefresh(new Date())
    setLoading(false)
    setRefreshing(false)
  }

  async function fetchWeather(loc, tour) {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lng}&current=temperature_2m,wind_speed_10m,wind_direction_10m,surface_pressure&hourly=temperature_2m,wind_speed_10m,wind_direction_10m,surface_pressure&wind_speed_unit=mph&temperature_unit=fahrenheit&forecast_days=1&timezone=auto`
      const res = await fetch(url)
      const data = await res.json()
      const endHour = tour?.end_time ? new Date(tour.end_time).getHours() + 1 : 23
      setWeather({ ...data, endHour })
    } catch { setWeather(null) }
  }

  async function fetchLakeLevel(loc) {
    setLakeLevelError('')
    if (!loc.lakeId) { setLakeLevel(null); setLakeLevelError('No specific lake selected — lake level unavailable'); return }
    const lake = lakes.find((l) => l.id === loc.lakeId)
    const gauge = lake?.gauge || (USGS_GAUGES[loc.lakeId] ? { source: 'usgs', station: USGS_GAUGES[loc.lakeId], params: ['00065'] } : null)
    if (!gauge) { setLakeLevel(null); setLakeLevelError('No gauge data for this lake'); return }
    try {
      const level = await fetchLakeLevelFor({ id: loc.lakeId, gauge })
      if (!level) { setLakeLevel(null); setLakeLevelError('No gauge data available'); return }
      setLakeLevel(level)
    } catch { setLakeLevel(null); setLakeLevelError('Failed to load gauge data') }
  }

  function computeSolunar(loc) {
    setSolunar(activityRating(new Date(), loc.lat, loc.lng))
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
        {[1, 2, 3, 4].map((i) => <div key={i} className="rounded-xl h-28 animate-pulse" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }} />)}
        <p className="text-xs text-center" style={{ color: C.muted }}>Loading conditions…</p>
      </div>
    )
  }

  const cur = weather?.current
  const hourly = weather?.hourly
  const now = new Date()
  const currentHour = now.getHours()
  const endHour = weather?.endHour ?? 23
  const hourlyIndices = hourly
    ? hourly.time.map((t, i) => ({ i, h: new Date(t).getHours() })).filter(({ h }) => h >= currentHour && h <= endHour).slice(0, 12)
    : []
  const pressureReadings = hourlyIndices.map(({ i }) => hourly.surface_pressure[i]).filter(Boolean)
  const pTrend = pressureTrend(pressureReadings)
  const llTrend = lakeLevel ? levelTrend(lakeLevel.readings) : 'stable'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold" style={{ color: C.text }}>{location?.label}</p>
          {activeTournament && <p className="text-xs" style={{ color: C.gold }}>Active: {activeTournament.name}</p>}
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
        <ReceiptCard><p className="text-xs text-center py-4" style={{ color: C.muted }}>Conditions unavailable on this network. Try on mobile data or a different connection.</p></ReceiptCard>
      )}

      {hourly && hourlyIndices.length > 0 && (
        <ReceiptCard>
          <SectionLabel>Hourly Forecast{activeTournament?.end_time ? ' through tournament end' : ' — end of day'}</SectionLabel>
          <div className="overflow-x-auto -mx-1">
            <div className="flex gap-2 pb-1" style={{ minWidth: 'max-content' }}>
              {hourlyIndices.map(({ i, h }) => {
                const period = h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`
                const isCurrent = h === currentHour
                return (
                  <div key={i} className="flex flex-col items-center rounded-lg px-2.5 py-2 gap-0.5"
                    style={{ backgroundColor: isCurrent ? `${C.gold}18` : C.bg, border: `1px solid ${isCurrent ? C.gold : C.border}`, minWidth: '52px' }}
                  >
                    <p className="text-xs font-bold" style={{ color: isCurrent ? C.goldLight : C.muted }}>{period}</p>
                    <p className="text-sm font-bold font-mono" style={{ color: C.text }}>{Math.round(hourly.temperature_2m[i])}°</p>
                    <p className="text-xs font-bold" style={{ color: C.gold }}>{Math.round(hourly.wind_speed_10m[i])}</p>
                    <p className="text-xs" style={{ color: C.muted }}>{windDirLabel(hourly.wind_direction_10m[i])}</p>
                  </div>
                )
              })}
            </div>
          </div>
          <p className="text-xs mt-1" style={{ color: C.muted }}>Wind in mph · Temperature in °F</p>
        </ReceiptCard>
      )}

      <ReceiptCard>
        <SectionLabel>Lake Level</SectionLabel>
        {lakeLevel ? (
          <>
            <div className="flex items-end gap-3 mb-2">
              <p className="text-3xl font-bold font-mono" style={{ color: C.goldLight }}>{lakeLevel.value.toFixed(2)}</p>
              <p className="text-sm pb-1" style={{ color: C.muted }}>{lakeLevel.unit}</p>
              <div className="pb-1 ml-auto"><TrendBadge trend={llTrend} /></div>
            </div>
            <div className="flex items-end gap-0.5 h-8 mt-2">
              {lakeLevel.readings.slice(-12).map((v, i, arr) => {
                const min = Math.min(...arr), max = Math.max(...arr)
                const pct = ((v - min) / (max - min || 0.1)) * 100
                return (
                  <div key={i} className="flex-1 rounded-sm"
                    style={{ height: `${Math.max(10, pct)}%`, backgroundColor: i === arr.length - 1 ? C.goldLight : C.gold, opacity: 0.5 + (i / arr.length) * 0.5 }}
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
                <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2"
                  style={{ backgroundColor: active ? `${C.gold}15` : C.bg, border: `1px solid ${active ? C.gold : C.border}` }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{p.type === 'major' ? '◉' : '○'}</span>
                    <div>
                      <p className="text-sm font-bold" style={{ color: active ? C.goldLight : C.text }}>{p.label}</p>
                      <p className="text-xs" style={{ color: C.muted }}>{p.type === 'major' ? 'Major' : 'Minor'} · {p.duration}hr window</p>
                    </div>
                  </div>
                  {active && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ color: C.gold, backgroundColor: `${C.gold}20`, border: `1px solid ${C.gold}40` }}>Active</span>
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

// ─── ROOT COMPONENT ───────────────────────────────────────────────────────────
export default function ClubDashboard() {
  const { org, isDirector, clearMemberSession } = useOrg()
  const [activeTab, setActiveTab] = useState(() => isDirector ? 'Director' : 'Captain')
  const [leaveConfirm, setLeaveConfirm] = useState(false)
  const orgId = org?.id

  const visibleTabs = isDirector
    ? CLUB_TABS
    : CLUB_TABS.filter((t) => t !== 'Director')

  const subtitles = {
    Director: 'Tournament Control & Standings',
    Captain: 'Boat Logging & Controls',
    Angler: 'Tournament View',
    History: 'Past Tournament Catches',
    Feed: 'Live Feed — No Login Required',
    Conditions: 'Weather, Lake & Solunar',
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.bg }}>
      <MascotHeader title="Club Edition" subtitle={subtitles[activeTab]} />

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
        {activeTab === 'Director' && isDirector && <DirectorTab orgId={orgId} tier={org?.tier || 'pro'} />}
        {activeTab === 'Captain' && <CaptainTab orgId={orgId} />}
        {activeTab === 'Angler' && <AnglerTab orgId={orgId} />}
        {activeTab === 'History' && <TournamentHistory orgId={orgId} />}
        {activeTab === 'Feed' && <FeedTab orgId={orgId} />}
        {activeTab === 'Conditions' && <ConditionsTab orgId={orgId} />}
      </div>

      {!isDirector && (
        <div className="max-w-2xl mx-auto px-4 pb-10 pt-2 text-center">
          <button
            type="button"
            onClick={() => setLeaveConfirm(true)}
            className="text-xs transition-opacity hover:opacity-60"
            style={{ color: '#5a4020' }}
          >
            Leave Club
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
            <p className="bb-title font-bold text-sm text-center" style={{ color: C.text }}>Leave Club?</p>
            <p className="text-xs text-center" style={{ color: C.muted }}>
              You will need to re-enter the Club Code to rejoin.
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
