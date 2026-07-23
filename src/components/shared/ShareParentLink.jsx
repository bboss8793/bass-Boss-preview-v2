import { useState } from 'react'

const C = {
  bg: '#0a0900', card: '#111008', border: '#2a2000',
  gold: '#c8a030', goldLight: '#f0c84a', text: '#f0e8c8',
  muted: '#a08040', green: '#00cc66',
}

// Builds the public spectator URL for a tournament: /live/[tournament-id]
function liveUrl(tournamentId) {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}/live/${tournamentId}`
}

// "Parent Live Feed" share card shown on the director/coach dashboard.
// Only renders while the tournament status is live (per spec).
export default function ShareParentLink({ tournamentId, isLive }) {
  const [copied, setCopied] = useState(false)

  if (!tournamentId || !isLive) return null

  const url = liveUrl(tournamentId)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea')
      ta.value = url
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch {}
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="rounded-xl p-3 mt-3"
      style={{ backgroundColor: C.card, border: `1px solid ${C.gold}40` }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-bold uppercase tracking-widest" style={{ color: C.gold }}>
          Parent Live Feed
        </span>
        <span
          className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: `${C.green}20`, color: C.green, border: `1px solid ${C.green}40` }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: C.green, animation: 'pulse 1.5s infinite' }} />
          Live
        </span>
      </div>
      <p className="text-xs mb-2" style={{ color: C.muted }}>
        Share this link with parents — no app or account needed. Opens the live leaderboard in any mobile browser.
      </p>
      <div className="flex items-stretch gap-2">
        <input
          readOnly
          value={url}
          onClick={(e) => e.target.select()}
          className="flex-1 min-w-0 rounded px-3 py-2 text-xs font-mono"
          style={{ backgroundColor: C.bg, border: `1px solid ${C.border}`, color: C.text }}
        />
        <button
          onClick={copy}
          className="px-4 rounded font-bold text-xs uppercase tracking-wider transition-opacity hover:opacity-80 flex-shrink-0"
          style={{ backgroundColor: copied ? C.green : C.gold, color: C.bg }}
        >
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
      </div>
    </div>
  )
}
