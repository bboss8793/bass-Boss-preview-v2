import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const POLL_MS = 30000

const C = {
  bg: '#0a0900', card: '#111008', border: '#2a2000',
  gold: '#c8a030', goldLight: '#f0c84a', text: '#f0e8c8',
  muted: '#a08040', green: '#00cc66', red: '#ef4444',
}

// Same scoring logic as the director/coach dashboards, kept self-contained so
// the public page has no dependency on the gated dashboard internals.
function computeStandings(catches, boats, tournament) {
  if (!tournament) return { standings: [], bigBass: null }
  const sf = tournament.scoring_format || 'best5'
  const isIndividual = tournament.format_type === 'individual'
  const isPaper = !!tournament.is_paper_tournament
  const active = catches.filter((c) => {
    if (c.culled || c.tournament_id !== tournament.id) return false
    if (isPaper) return c.review_status === 'approved'
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
    // Big fish on this boat (from all active catches, not just counted)
    const bigFish = sorted[0] ? parseFloat(sorted[0].weight) : 0
    return {
      key,
      label: isIndividual ? key : (boat?.name || 'Boat'),
      captain: boat?.captain_name || '',
      total,
      count: counted.length,
      bigFish,
    }
  }).sort((a, b) => b.total - a.total)

  let bigBass = null
  if (active.length > 0 && (tournament.big_bass_side_pot || sf === 'bigbass')) {
    const maxWeight = active.reduce((max, c) => Math.max(max, parseFloat(c.weight) || 0), 0)
    const top = active.find((c) => parseFloat(c.weight) === maxWeight)
    if (top) {
      const boat = boats.find((b) => b.id === top.boat_id)
      bigBass = { angler: top.angler_name, boat: boat?.name || '', weight: maxWeight }
    }
  }

  return { standings, bigBass }
}

function formatCountdown(remaining) {
  const total = Math.max(0, remaining)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function useCountdown(endTime) {
  const [remaining, setRemaining] = useState(null)
  useEffect(() => {
    if (!endTime) { setRemaining(null); return }
    const end = new Date(endTime)
    const tick = () => setRemaining(Math.round((end - Date.now()) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [endTime])
  return remaining
}

function Logo() {
  return (
    <div className="flex items-center justify-center gap-2 mb-1">
      <span className="text-xl font-black tracking-tight" style={{ color: C.gold }}>BASS BOSS</span>
    </div>
  )
}

export default function LiveFeedPage() {
  const { tournamentId } = useParams()
  const [tournament, setTournament] = useState(null)
  const [state, setState] = useState(null)
  const [boats, setBoats] = useState([])
  const [catches, setCatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastRefresh, setLastRefresh] = useState(null)

  const load = useCallback(async () => {
    if (!tournamentId) return
    const [t, ts, b, c] = await Promise.all([
      supabase.from('tournaments').select('*').eq('id', tournamentId).maybeSingle(),
      supabase.from('tournament_state').select('*').eq('tournament_id', tournamentId).maybeSingle(),
      supabase.from('boats').select('*').eq('org_id', null),
      supabase.from('catches').select('*').eq('tournament_id', tournamentId).order('created_at', { ascending: false }),
    ])
    if (t.error || !t.data) { setError('Tournament not found'); setLoading(false); return }
    setTournament(t.data)
    setState(ts.data)
    // Boats belong to the same org as the tournament — fetch by org_id.
    const orgId = t.data?.org_id
    if (orgId) {
      const { data: orgBoats } = await supabase.from('boats').select('*').eq('org_id', orgId).order('name')
      setBoats(orgBoats || [])
    } else {
      setBoats(b.data || [])
    }
    setCatches((c.data || []).filter((x) => x.tournament_id === tournamentId))
    setLastRefresh(new Date())
    setLoading(false)
  }, [tournamentId])

  useEffect(() => {
    load()
    const id = setInterval(load, POLL_MS)
    return () => clearInterval(id)
  }, [load])

  const isLive = state?.status === 'live'
  const isEnded = state?.status === 'ended'
  const { standings, bigBass } = computeStandings(catches, boats, tournament)
  const remaining = useCountdown(tournament?.end_time)

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: C.bg }}>
        <Logo />
        <p className="text-sm" style={{ color: C.muted }}>Loading live feed…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center" style={{ backgroundColor: C.bg }}>
        <Logo />
        <p className="text-sm mt-4" style={{ color: C.red }}>{error}</p>
        <p className="text-xs mt-2" style={{ color: C.muted }}>Check the link with your tournament director.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: C.bg }}>
      <header className="px-4 pt-5 pb-3 text-center" style={{ borderBottom: `1px solid ${C.border}` }}>
        <Logo />
        <div className="flex items-center justify-center gap-2 mt-1">
          <span
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
            style={{
              backgroundColor: isLive ? `${C.green}20` : isEnded ? `${C.muted}20` : `${C.muted}20`,
              color: isLive ? C.green : C.muted,
              border: `1px solid ${isLive ? C.green : C.muted}40`,
            }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: isLive ? C.green : C.muted, animation: isLive ? 'pulse 1.5s infinite' : 'none' }}
            />
            {isLive ? 'Live' : isEnded ? 'Final Results' : 'Scheduled'}
          </span>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 mx-auto w-full max-w-md space-y-4">
        {/* Tournament header */}
        <div className="rounded-xl p-4" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
          <h1 className="text-lg font-bold leading-tight" style={{ color: C.text }}>{tournament.name || 'Tournament'}</h1>
          <p className="text-sm mt-1" style={{ color: C.muted }}>{tournament.lake_name || '—'}</p>
          <p className="text-xs mt-0.5" style={{ color: C.muted }}>
            {tournament.date ? new Date(tournament.date + 'T00:00:00').toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Date TBD'}
          </p>
        </div>

        {/* Countdown */}
        {isLive && tournament?.end_time && remaining !== null && (
          <div
            className="rounded-xl p-4 text-center"
            style={{
              backgroundColor: C.card,
              border: `2px solid ${remaining > 1800 ? C.green + '60' : remaining > 300 ? C.gold + '60' : C.red + '60'}`,
            }}
          >
            <p className="text-xs uppercase tracking-widest font-bold mb-1" style={{ color: C.muted }}>Time Remaining</p>
            <p
              className="text-4xl font-bold font-mono"
              style={{ color: remaining > 1800 ? C.green : remaining > 300 ? C.goldLight : C.red }}
            >
              {formatCountdown(remaining)}
            </p>
          </div>
        )}

        {/* Big Bass */}
        {bigBass && (
          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.gold}50` }}>
            <div className="px-4 py-2 flex items-center justify-between" style={{ backgroundColor: `${C.gold}18` }}>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: C.gold }}>Big Bass</p>
              <span className="text-sm font-bold font-mono" style={{ color: C.goldLight }}>{bigBass.weight.toFixed(2)} lbs</span>
            </div>
            <div className="px-4 py-2" style={{ backgroundColor: C.bg }}>
              <p className="text-sm font-bold" style={{ color: C.text }}>{bigBass.angler}</p>
              {bigBass.boat && <p className="text-xs" style={{ color: C.muted }}>{bigBass.boat}</p>}
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
          <div className="px-4 py-2.5 flex items-center justify-between" style={{ backgroundColor: C.card }}>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: C.gold }}>Leaderboard</p>
            <span className="text-xs" style={{ color: C.muted }}>{standings.length} {standings.length === 1 ? 'boat' : 'boats'}</span>
          </div>
          {standings.length === 0 ? (
            <div className="px-4 py-6 text-center" style={{ backgroundColor: C.bg }}>
              <p className="text-sm" style={{ color: C.muted }}>No catches logged yet.</p>
              <p className="text-xs mt-1" style={{ color: C.muted }}>Standings appear once boats start weighing in.</p>
            </div>
          ) : (
            <ol className="divide-y" style={{ borderColor: C.border }}>
              {standings.map((s, i) => (
                <li
                  key={s.key}
                  className="px-4 py-3 flex items-center gap-3"
                  style={{ backgroundColor: C.bg }}
                >
                  <span
                    className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm"
                    style={{
                      backgroundColor: i === 0 ? `${C.gold}20` : 'transparent',
                      color: i === 0 ? C.goldLight : C.muted,
                      border: `1px solid ${i === 0 ? C.gold : C.border}`,
                    }}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: C.text }}>{s.label}</p>
                    {s.captain && <p className="text-xs truncate" style={{ color: C.muted }}>Capt: {s.captain}</p>}
                    <p className="text-xs mt-0.5" style={{ color: C.muted }}>
                      {s.count} {s.count === 1 ? 'fish' : 'fish'} · Big {s.bigFish.toFixed(2)} lbs
                    </p>
                  </div>
                  <span className="text-lg font-bold font-mono flex-shrink-0" style={{ color: C.goldLight }}>
                    {s.total.toFixed(2)} <span className="text-xs" style={{ color: C.muted }}>lbs</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Refresh indicator */}
        <div className="flex items-center justify-center gap-2 pt-1">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: C.green, animation: 'pulse 1.5s infinite' }} />
          <p className="text-xs" style={{ color: C.muted }}>
            Updates every 30s{lastRefresh ? ` · last ${lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : ''}
          </p>
        </div>
      </main>

      <footer className="px-4 py-4 text-center" style={{ borderTop: `1px solid ${C.border}` }}>
        <p className="text-xs" style={{ color: C.muted }}>
          Powered by <span style={{ color: C.gold }}>Bass Boss</span> — getbassboss.com
        </p>
      </footer>
    </div>
  )
}
