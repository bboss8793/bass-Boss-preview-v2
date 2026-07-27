import { useState, useEffect, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import MascotHeader from '../components/shared/MascotHeader'
import ReceiptCard from '../components/shared/ReceiptCard'
import { getAllCatches, deleteCatch } from '../utils/catchStorage'
import { createBrandedImage, shareCatch } from '../utils/brandedImage'

const C = {
  bg: '#0a0900', card: '#111008', border: '#2a2000',
  gold: '#c8a030', goldLight: '#f0c84a', text: '#f0e8c8',
  muted: '#a08040', green: '#00cc66', red: '#ef4444',
}

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function formatTime(iso) {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function goldIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="width:18px;height:18px;background:#f0c84a;border:2px solid #0a0900;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 1px 4px rgba(0,0,0,0.5);"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 18],
  })
}

export default function MyCatches() {
  const [catches, setCatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('gallery')
  const [yearFilter, setYearFilter] = useState('all')
  const [sharing, setSharing] = useState(null)
  const [mapReady, setMapReady] = useState(false)
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markersRef = useRef([])

  useEffect(() => {
    loadCatches()
  }, [])

  async function loadCatches() {
    setLoading(true)
    const data = await getAllCatches()
    setCatches(data)
    setLoading(false)
  }

  const years = useMemo(() => {
    const set = new Set(catches.map((c) => new Date(c.createdAt).getFullYear()))
    return Array.from(set).sort((a, b) => b - a)
  }, [catches])

  const filtered = useMemo(() => {
    if (yearFilter === 'all') return catches
    return catches.filter((c) => new Date(c.createdAt).getFullYear() === parseInt(yearFilter))
  }, [catches, yearFilter])

  const catchesWithGPS = useMemo(() => filtered.filter((c) => c.lat != null && c.lng != null), [filtered])

  useEffect(() => {
    if (view !== 'map' || !mapRef.current || mapInstance.current) return
    mapInstance.current = L.map(mapRef.current, { zoomControl: true, attributionControl: true })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(mapInstance.current)
    setMapReady(true)
  }, [view])

  useEffect(() => {
    if (view !== 'map' || !mapInstance.current || !mapReady) return
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []
    if (catchesWithGPS.length === 0) return
    const bounds = []
    catchesWithGPS.forEach((c) => {
      const m = L.marker([c.lat, c.lng], { icon: goldIcon() })
        .addTo(mapInstance.current)
        .bindPopup(`<div style="font-family:Barlow,sans-serif"><b style="color:#f0c84a">${c.weight ? c.weight + ' lb' : 'Catch'}</b><br/>${c.lakeName || ''}<br/><span style="color:#a08040">${formatDate(c.createdAt)}</span></div>`)
      markersRef.current.push(m)
      bounds.push([c.lat, c.lng])
    })
    mapInstance.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
  }, [catchesWithGPS, view, mapReady])

  async function handleShare(catchItem) {
    setSharing(catchItem.id)
    try {
      const photoBlob = await blobFromUrl(catchItem.photoUrl)
      const branded = await createBrandedImage(photoBlob, {
        weight: catchItem.weight,
        lakeName: catchItem.lakeName,
        length: catchItem.length,
      })
      await shareCatch(branded, `bass-boss-${catchItem.id}.jpg`)
    } catch (e) {
      // ignore
    }
    setSharing(null)
  }

  async function handleDelete(id) {
    await deleteCatch(id)
    await loadCatches()
  }

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: C.bg }}>
        <MascotHeader title="Bass Boss" />
        <div className="max-w-xl mx-auto px-4 py-12">
          <p className="text-center text-sm" style={{ color: C.muted }}>Loading your catches…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.bg }}>
      <MascotHeader title="Bass Boss" />

      <div className="max-w-xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <Link to="/app" className="text-sm font-bold uppercase tracking-widest hover:opacity-70 transition" style={{ color: C.gold }}>
            ← Back
          </Link>
          <h1 className="text-lg font-bold uppercase tracking-widest" style={{ color: C.goldLight }}>My Catches</h1>
          <div className="w-12" />
        </div>

        {catches.length === 0 ? (
          <ReceiptCard>
            <div className="text-center py-10">
              <div className="text-4xl mb-3">🎣</div>
              <p className="text-sm mb-1" style={{ color: C.text }}>No catches logged yet</p>
              <p className="text-xs" style={{ color: C.muted }}>Use Catch Logging on the On Water screen to save your first catch.</p>
              <Link to="/app" className="inline-block mt-4 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition hover:opacity-80"
                style={{ backgroundColor: C.gold, color: C.bg }}>
                Go to On Water
              </Link>
            </div>
          </ReceiptCard>
        ) : (
          <>
            <div className="flex gap-2 items-center">
              <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: C.border }}>
                <button onClick={() => setView('gallery')} className="px-3 py-2 text-xs font-bold uppercase tracking-wider transition"
                  style={{ backgroundColor: view === 'gallery' ? C.gold : C.card, color: view === 'gallery' ? C.bg : C.muted }}>
                  Gallery
                </button>
                <button onClick={() => setView('map')} className="px-3 py-2 text-xs font-bold uppercase tracking-wider transition"
                  style={{ backgroundColor: view === 'map' ? C.gold : C.card, color: view === 'map' ? C.bg : C.muted }}>
                  Map
                </button>
              </div>
              <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border outline-none"
                style={{ backgroundColor: C.card, borderColor: C.border, color: C.text }}>
                <option value="all">All Years</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {view === 'gallery' ? (
              <div className="space-y-3">
                {filtered.length === 0 ? (
                  <p className="text-center text-sm py-8" style={{ color: C.muted }}>No catches in {yearFilter}.</p>
                ) : (
                  filtered.map((c) => (
                    <ReceiptCard key={c.id}>
                      <div className="flex gap-3">
                        {c.photoUrl && (
                          <img src={c.photoUrl} alt="Catch" className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
                            style={{ border: `1px solid ${C.border}` }} />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              {c.weight && (
                                <p className="text-lg font-bold font-mono" style={{ color: C.goldLight }}>{c.weight} lb</p>
                              )}
                              {c.length && (
                                <p className="text-xs" style={{ color: C.muted }}>{c.length}"</p>
                              )}
                              <p className="text-xs mt-1" style={{ color: C.text }}>{c.lakeName || 'Unknown lake'}</p>
                              <p className="text-xs" style={{ color: C.muted }}>{formatDate(c.createdAt)} · {formatTime(c.createdAt)}</p>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-2">
                            <button onClick={() => handleShare(c)} disabled={sharing === c.id}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition hover:opacity-80 disabled:opacity-50"
                              style={{ backgroundColor: C.gold, color: C.bg }}>
                              {sharing === c.id ? 'Preparing…' : 'Share'}
                            </button>
                            <button onClick={() => handleDelete(c.id)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition hover:opacity-80"
                              style={{ backgroundColor: 'transparent', color: C.red, border: `1px solid ${C.red}40` }}>
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </ReceiptCard>
                  ))
                )}
              </div>
            ) : (
              <ReceiptCard>
                {catchesWithGPS.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-sm mb-1" style={{ color: C.text }}>No GPS data available</p>
                    <p className="text-xs" style={{ color: C.muted }}>Catches logged without location permission won't appear on the map.</p>
                  </div>
                ) : (
                  <>
                    <div ref={mapRef} style={{ height: '400px', borderRadius: '8px', overflow: 'hidden', border: `1px solid ${C.border}` }} />
                    <p className="text-xs mt-2 text-center" style={{ color: C.muted }}>
                      {catchesWithGPS.length} of {filtered.length} catches have GPS data · Locations are private to you
                    </p>
                  </>
                )}
              </ReceiptCard>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function blobFromUrl(url) {
  return fetch(url).then((r) => r.blob())
}
