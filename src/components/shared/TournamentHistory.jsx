import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import ReceiptCard from './ReceiptCard'
import { CatchGallery } from './PhotoViewer'

const C = {
  bg: '#0a0900', card: '#111008', border: '#2a2000',
  gold: '#c8a030', goldLight: '#f0c84a', text: '#f0e8c8',
  muted: '#a08040', green: '#00cc66', red: '#ef4444',
}

function SectionLabel({ children }) {
  return (
    <p className="text-xs uppercase tracking-widest font-bold mb-2" style={{ color: C.muted }}>
      {children}
    </p>
  )
}

function formatDate(dateStr) {
  if (!dateStr) return 'No date'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function TournamentHistory({ orgId }) {
  const [tournaments, setTournaments] = useState([])
  const [catches, setCatches] = useState([])
  const [boats, setBoats] = useState([])
  const [tourneyStates, setTourneyStates] = useState({})
  const [selectedTournamentId, setSelectedTournamentId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [t, b, c, ts] = await Promise.all([
      supabase.from('tournaments').select('*').eq('org_id', orgId).order('date', { ascending: false }),
      supabase.from('boats').select('*').eq('org_id', orgId).order('name'),
      supabase.from('catches').select('*').eq('org_id', orgId).order('created_at', { ascending: false }),
      supabase.from('tournament_state').select('*').eq('org_id', orgId),
    ])
    const tourList = t.data || []
    setTournaments(tourList)
    setBoats(b.data || [])
    setCatches(c.data || [])
    const stateMap = {}
    ;(ts.data || []).forEach((s) => { stateMap[s.tournament_id] = s.status })
    setTourneyStates(stateMap)
    if (tourList.length > 0 && !selectedTournamentId) {
      setSelectedTournamentId(tourList[0].id)
    }
    setLoading(false)
  }

  if (loading) {
    return <p className="text-center py-12" style={{ color: C.muted }}>Loading…</p>
  }

  if (tournaments.length === 0) {
    return (
      <ReceiptCard>
        <p className="text-sm text-center py-8" style={{ color: C.muted }}>
          No tournaments yet. Tournaments will appear here once your director creates one.
        </p>
      </ReceiptCard>
    )
  }

  const selectedTournament = tournaments.find((t) => t.id === selectedTournamentId)
  const tournamentCatches = catches.filter((c) => c.tournament_id === selectedTournamentId)
  const visibleCatches = tournamentCatches.filter((c) => !c.culled)
  const totalWeight = visibleCatches.reduce((s, c) => s + parseFloat(c.weight), 0)
  const status = tourneyStates[selectedTournamentId]

  return (
    <div className="space-y-5">
      <ReceiptCard>
        <SectionLabel>Tournament History</SectionLabel>
        <p className="text-xs mb-3" style={{ color: C.muted }}>
          Browse catches from any tournament — past or current. Tap any photo to view full-size and download.
        </p>
        <div className="space-y-2">
          {tournaments.map((t) => {
            const isSelected = t.id === selectedTournamentId
            const tStatus = tourneyStates[t.id]
            const tCatches = catches.filter((c) => c.tournament_id === t.id && !c.culled)
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTournamentId(t.id)}
                className="w-full rounded-lg p-3 text-left flex items-center justify-between transition"
                style={{
                  backgroundColor: isSelected ? `${C.gold}15` : C.bg,
                  border: `1px solid ${isSelected ? C.gold : C.border}`,
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: isSelected ? C.goldLight : C.text }}>
                    {t.name}
                  </p>
                  <p className="text-xs truncate" style={{ color: C.muted }}>
                    {t.lake_name} · {formatDate(t.date)} · {tCatches.length} catches
                  </p>
                </div>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded ml-2 flex-shrink-0"
                  style={{
                    color: tStatus === 'live' ? C.green : tStatus === 'ended' ? C.muted : C.gold,
                    backgroundColor: tStatus === 'live' ? `${C.green}18` : tStatus === 'ended' ? `${C.muted}18` : `${C.gold}18`,
                    border: `1px solid ${tStatus === 'live' ? C.green + '40' : tStatus === 'ended' ? C.muted + '40' : C.gold + '40'}`,
                  }}
                >
                  {tStatus === 'live' ? 'LIVE' : tStatus === 'ended' ? 'ENDED' : 'PENDING'}
                </span>
              </button>
            )
          })}
        </div>
      </ReceiptCard>

      {selectedTournament && (
        <>
          <ReceiptCard>
            <div className="flex items-center justify-between mb-1">
              <p className="bb-title font-bold" style={{ color: C.text }}>{selectedTournament.name}</p>
              <span className="text-xs px-2 py-0.5 rounded font-bold" style={{
                color: status === 'live' ? C.green : status === 'ended' ? C.muted : C.gold,
                backgroundColor: status === 'live' ? `${C.green}18` : status === 'ended' ? `${C.muted}18` : `${C.gold}18`,
                border: `1px solid ${status === 'live' ? C.green + '40' : status === 'ended' ? C.muted + '40' : C.gold + '40'}`,
              }}>
                {status === 'live' ? 'LIVE' : status === 'ended' ? 'ENDED' : 'PENDING'}
              </span>
            </div>
            <p className="text-xs mb-3" style={{ color: C.muted }}>
              {selectedTournament.lake_name} · {formatDate(selectedTournament.date)}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: C.muted }}>{visibleCatches.length} fish</span>
              <span className="text-xl font-bold" style={{ color: C.goldLight }}>{totalWeight.toFixed(2)} lbs</span>
            </div>
          </ReceiptCard>

          <ReceiptCard>
            <SectionLabel>Catch Gallery</SectionLabel>
            <CatchGallery catches={visibleCatches} boats={boats} />
          </ReceiptCard>
        </>
      )}
    </div>
  )
}
