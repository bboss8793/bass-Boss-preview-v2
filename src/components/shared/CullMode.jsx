// catches: array of non-culled catch objects (from Supabase) for the active boat+tournament
// onCull: (catchId) => void — marks the catch culled in the database
// fishLimit: 3 or 5 (read from tournament.fish_limit, defaults to 5)
export default function CullMode({ catches = [], onCull, fishLimit = 5 }) {
  // Sort all active catches heaviest first
  const sorted = [...catches].sort((a, b) => parseFloat(b.weight) - parseFloat(a.weight))

  const inLimit = sorted.slice(0, fishLimit)

  // The recommended cull is the absolute lightest fish once over the limit
  const recommendedCullId = catches.length > fishLimit ? sorted[sorted.length - 1]?.id : null

  const total = inLimit.reduce((s, c) => s + parseFloat(c.weight), 0)
  const overBy = catches.length - fishLimit

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[#a08040] text-sm uppercase tracking-wider">Cull Mode</span>
          <span
            className="text-xs px-1.5 py-0.5 rounded font-semibold"
            style={{ color: '#c8a030', backgroundColor: '#1a1000', border: '1px solid #2a2000' }}
          >
            {fishLimit}-Fish
          </span>
        </div>
        <span className="text-[#f0c84a] font-bold">
          {Math.min(catches.length, fishLimit)}/{fishLimit} — {total.toFixed(2)} lbs
        </span>
      </div>

      {catches.length === 0 ? (
        <p className="text-[#a08040] text-sm text-center py-2">No fish in limit yet.</p>
      ) : (
        <div className="space-y-1">
          {sorted.map((c, i) => {
            const isOverflow = i >= fishLimit
            const isCullTarget = c.id === recommendedCullId
            return (
              <div
                key={c.id}
                className="flex items-center justify-between rounded px-3 py-2 transition-colors"
                style={{
                  backgroundColor: isCullTarget ? '#1a0800' : '#0a0900',
                  border: `1px solid ${isCullTarget ? '#ef4444' : isOverflow ? '#3a1000' : '#2a2000'}`,
                }}
              >
                <span className="text-xs w-5" style={{ color: isOverflow ? '#3a1000' : '#a08040' }}>
                  {isOverflow ? '—' : `#${i + 1}`}
                </span>
                <span className="font-bold flex-1 text-center text-sm" style={{ color: isCullTarget ? '#ef4444' : isOverflow ? '#5a2000' : '#f0e8c8' }}>
                  {parseFloat(c.weight).toFixed(2)} lbs
                  {isCullTarget && <span className="ml-2 text-xs font-normal text-[#ef4444]">← CULL</span>}
                </span>
                {(!isOverflow || isCullTarget) && (
                  <button
                    onClick={() => onCull?.(c.id)}
                    className="text-xs px-2 py-0.5 rounded transition-colors"
                    style={{
                      color: isCullTarget ? '#ef4444' : '#a08040',
                      border: `1px solid ${isCullTarget ? '#ef444460' : '#2a2000'}`,
                    }}
                  >
                    Cull
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {overBy > 0 && (
        <p className="text-xs text-center" style={{ color: '#ef4444' }}>
          Over limit by {overBy} — release the fish marked CULL
        </p>
      )}
    </div>
  )
}
