import { useState, useEffect } from 'react'

const C = {
  bg: '#0a0900', card: '#111008', border: '#2a2000',
  gold: '#c8a030', goldLight: '#f0c84a', text: '#f0e8c8',
  muted: '#a08040', green: '#00cc66', red: '#ef4444',
}

export function PhotoViewer({ photoUrl, onClose }) {
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    if (photoUrl) {
      document.addEventListener('keydown', handleKey)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [photoUrl, onClose])

  if (!photoUrl) return null

  function handleDownload(e) {
    e.stopPropagation()
    const a = document.createElement('a')
    a.href = photoUrl
    a.download = `bass-boss-catch-${Date.now()}.jpg`
    a.target = '_blank'
    a.click()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}
      onClick={onClose}
    >
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <button
          type="button"
          onClick={handleDownload}
          className="px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition hover:opacity-80"
          style={{ backgroundColor: C.gold, color: C.bg }}
        >
          Download
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition hover:opacity-80"
          style={{ backgroundColor: C.card, color: C.muted, border: `1px solid ${C.border}` }}
        >
          ✕ Close
        </button>
      </div>
      <img
        src={photoUrl}
        alt="Catch photo"
        className="max-w-full max-h-full rounded-lg object-contain"
        style={{ border: `2px solid ${C.gold}` }}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}

export function CatchThumbnail({ photoUrl, onClick, size = 'w-10 h-10' }) {
  if (!photoUrl) {
    return (
      <div
        className={`${size} rounded flex-shrink-0 flex items-center justify-center text-lg`}
        style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}
      >
        ?
      </div>
    )
  }
  return (
    <img
      src={photoUrl}
      alt="Catch"
      className={`${size} rounded object-cover flex-shrink-0 cursor-zoom-in`}
      style={{ border: `1px solid ${C.border}` }}
      onClick={onClick}
    />
  )
}

export function CatchGallery({ catches, boats }) {
  const [photoViewer, setPhotoViewer] = useState(null)

  function boatName(id) {
    const b = boats?.find((b) => b.id === id)
    return b?.name || 'Unknown boat'
  }

  if (catches.length === 0) {
    return (
      <p className="text-sm text-center py-4" style={{ color: C.muted }}>
        No catches recorded for this tournament.
      </p>
    )
  }

  return (
    <>
      <div className="space-y-2">
        {catches.map((c, i) => (
          <div
            key={c.id}
            className="flex items-center gap-3 px-3 py-2 rounded"
            style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}
          >
            <span className="text-xs font-bold w-6 text-center" style={{ color: i === 0 ? C.goldLight : C.muted }}>
              #{i + 1}
            </span>
            <CatchThumbnail photoUrl={c.photo_url} onClick={() => setPhotoViewer(c.photo_url)} />
            <div className="flex-1 min-w-0">
              <span className="font-bold text-sm" style={{ color: C.text }}>
                {parseFloat(c.weight).toFixed(2)} lbs
              </span>
              {c.length_inches && (
                <span className="text-xs ml-2" style={{ color: C.muted }}>
                  {parseFloat(c.length_inches).toFixed(1)}"
                </span>
              )}
              <span className="text-xs ml-2" style={{ color: C.muted }}>
                {c.angler_name}
              </span>
              <span className="text-xs ml-2" style={{ color: C.muted }}>
                · {boatName(c.boat_id)}
              </span>
            </div>
            {c.review_status === 'rejected' && (
              <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ color: C.red, backgroundColor: `${C.red}18`, border: `1px solid ${C.red}40` }}>
                Rejected
              </span>
            )}
            {c.review_status === 'pending_review' && (
              <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ color: C.gold, backgroundColor: `${C.gold}18`, border: `1px solid ${C.gold}40` }}>
                Pending
              </span>
            )}
          </div>
        ))}
      </div>
      <PhotoViewer photoUrl={photoViewer} onClose={() => setPhotoViewer(null)} />
    </>
  )
}
