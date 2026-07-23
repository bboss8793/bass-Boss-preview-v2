import { useState, useEffect, useRef } from 'react'
import MascotHeader from '../components/shared/MascotHeader'
import ReceiptCard from '../components/shared/ReceiptCard'
import PhotoCapture from '../components/shared/PhotoCapture'
import { activityRating } from '../utils/solunar'
import { getCurrentSeason, getSeasonTactics } from '../utils/tactics'
import { getPatternsForSeason, categoryColors } from '../utils/patterns'
import { lakes } from '../data/lakes'
import LakeSelect from '../components/shared/LakeSelect'
import { fetchLakeLevelFor } from '../utils/lakeLevel'

const C = {
  bg: '#0a0900', card: '#111008', border: '#2a2000',
  gold: '#c8a030', goldLight: '#f0c84a', text: '#f0e8c8',
  muted: '#a08040', green: '#00cc66', red: '#ef4444',
}

// Verified USGS reservoir stations — each confirmed to return pool elevation above datum
const USGS_GAUGES = {
  'lake-fork':         { station: '08018800',  params: ['62614'] },  // Lake Fk Res nr Quitman TX
  'sam-rayburn':       { station: '08039300',  params: ['62614'] },  // Sam Rayburn Res nr Jasper TX
  'toledo-bend-tx':    { station: '312914093422701', params: ['62615'] }, // Toledo Bend Res nr Negreet LA
  'lake-conroe':       { station: '08067600',  params: ['62614'] },  // Lk Conroe nr Conroe TX
  'lake-texoma':       { station: '07331455',  params: ['62614', '00065'] }, // Lake Texoma at Cumberland Cut OK
  'lake-livingston':   { station: '08066190',  params: ['62614'] },  // Livingston Res nr Goodrich TX
  'lake-houston':      { station: '08072000',  params: ['62614', '00065'] }, // Lk Houston nr Sheldon TX
  'lake-lewisville':   { station: '08052800',  params: ['62614'] },  // Lewisville Lk nr Lewisville TX
  'lake-ray-hubbard':  { station: '08061550',  params: ['62614'] },  // Lk Ray Hubbard nr Forney TX
  'lake-tawakoni':     { station: '08017400',  params: ['62614'] },  // Lk Tawakoni nr Wills Point TX
  'richland-chambers': { station: '08064550',  params: ['62614'] },  // Richland-Chambers Res nr Kerens TX
  'cedar-creek':       { station: '08063010',  params: ['62614'] },  // Cedar Ck Res nr Trinidad TX
  'lake-whitney':      { station: '08092500',  params: ['62614'] },  // Whitney Lk nr Whitney TX
  'possum-kingdom':    { station: '08088500',  params: ['62614'] },  // Possum Kingdom Lk nr Graford TX
  'lake-granbury':     { station: '08090900',  params: ['62614'] },  // Lk Granbury nr Granbury TX
  'lake-belton':       { station: '08102000',  params: ['62614'] },  // Belton Lk nr Belton TX
  'lake-travis':       { station: '08154500',  params: ['00062'] },  // LCRA Lk Travis nr Austin TX
  'lake-buchanan':     { station: '08148000',  params: ['00062'] },  // LCRA Lk Buchanan nr Burnet TX
  'lake-waco':         { station: '08095550',  params: ['62614'] },  // Waco Lk nr Waco TX
  'grand-lake':        { station: '07190000',  params: ['62614', '00065'] }, // Lake O Cherokees at Langley OK
}

// No gauge feed exists for these lakes — don't attempt a fetch (saves an API call that always fails)
const NO_GAUGE_LAKES = new Set([
  'amistad-reservoir', 'falcon-lake', 'caddo-lake', 'lake-eufaula-ok',
  'kentucky-lake', 'lake-guntersville', 'lake-okeechobee',
  'lake-roosevelt', 'alder-lake', 'lake-washington',
])

// Resolve a lake's gauge config — checks lakes.js first, then the legacy USGS_GAUGES map
function gaugeFor(lakeId) {
  const lake = lakes.find((l) => l.id === lakeId)
  if (lake?.gauge) return lake.gauge
  const legacy = USGS_GAUGES[lakeId]
  if (legacy) return { source: 'usgs', ...legacy }
  return null
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
  const map = {
    rising:  { label: 'Rising',  color: C.green },
    falling: { label: 'Falling', color: C.red },
    steady:  { label: 'Steady',  color: C.muted },
    stable:  { label: 'Stable',  color: C.muted },
  }
  const { label, color } = map[trend] || map.steady
  return (
    <span
      className="text-xs font-bold px-2 py-0.5 rounded"
      style={{ color, backgroundColor: `${color}18`, border: `1px solid ${color}40` }}
    >
      {label}
    </span>
  )
}

export default function BassApp() {
  const [selectedLake, setSelectedLake] = useState(lakes[0])
  const [photo, setPhoto] = useState(null)
  const [intelOpen, setIntelOpen] = useState(false)

  const [weather, setWeather] = useState(null)
  const [lakeLevel, setLakeLevel] = useState(null)
  const [lakeLevelError, setLakeLevelError] = useState('')
  const [condLoading, setCondLoading] = useState(true)
  const [condLocError, setCondLocError] = useState('')
  const refreshTimer = useRef(null)

  const now = new Date()
  const season = getCurrentSeason(now)
  const solunar = activityRating(now, selectedLake.lat, selectedLake.lng)
  const tactics = getSeasonTactics(season)
  const patterns = getPatternsForSeason(season)
  const ratingBars = Array.from({ length: 5 }, (_, i) => i < solunar.rating)

  useEffect(() => {
    resolveConditionsLocation()
    return () => clearInterval(refreshTimer.current)
  }, [selectedLake?.id])

  function resolveConditionsLocation() {
    if (selectedLake?.lat && selectedLake?.lng) {
      setCondLocError('')
      const loc = { lat: selectedLake.lat, lng: selectedLake.lng, lakeId: selectedLake.id }
      scheduleConditions(loc)
      return
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCondLocError('')
          scheduleConditions({ lat: pos.coords.latitude, lng: pos.coords.longitude, lakeId: null })
        },
        () => {
          setCondLocError('Select a lake above to see conditions')
          setCondLoading(false)
        },
        { timeout: 8000, maximumAge: 300000 }
      )
    } else {
      setCondLocError('Select a lake above to see conditions')
      setCondLoading(false)
    }
  }

  function scheduleConditions(loc) {
    fetchConditions(loc)
    if (refreshTimer.current) clearInterval(refreshTimer.current)
    refreshTimer.current = setInterval(() => fetchConditions(loc), 15 * 60 * 1000)
  }

  async function fetchConditions(loc) {
    setCondLoading(true)
    await Promise.all([fetchWeather(loc), fetchLakeLevel(loc)])
    setCondLoading(false)
  }

  async function fetchWeather(loc) {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lng}&current=temperature_2m,wind_speed_10m,wind_direction_10m,surface_pressure&hourly=surface_pressure&wind_speed_unit=mph&temperature_unit=fahrenheit&forecast_days=1&timezone=auto`
      const res = await fetch(url)
      setWeather(await res.json())
    } catch {
      setWeather(null)
    }
  }

  async function fetchLakeLevel(loc) {
    setLakeLevelError('')
    if (!loc.lakeId) {
      setLakeLevel(null)
      setLakeLevelError('No specific lake selected — pool elevation unavailable')
      return
    }
    if (NO_GAUGE_LAKES.has(loc.lakeId)) {
      setLakeLevel(null)
      setLakeLevelError('No gauge data available')
      return
    }
    const gauge = gaugeFor(loc.lakeId)
    if (!gauge) {
      setLakeLevel(null)
      setLakeLevelError('No gauge data available')
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

  const cur = weather?.current
  const hourly = weather?.hourly
  const pressureReadings = hourly
    ? hourly.time
        .map((t, i) => ({ h: new Date(t).getHours(), i }))
        .filter(({ h }) => h >= now.getHours())
        .slice(0, 6)
        .map(({ i }) => hourly.surface_pressure[i])
        .filter(Boolean)
    : []
  const pTrend = pressureTrend(pressureReadings)
  const llTrend = lakeLevel ? levelTrend(lakeLevel.readings) : 'stable'

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.bg }}>
      <MascotHeader title="Bass Boss" />

      <div className="max-w-xl mx-auto px-4 py-6 space-y-4">

        {/* Lake Selector */}
        <ReceiptCard>
          <label className="block text-xs uppercase tracking-widest font-bold mb-2" style={{ color: C.muted }}>
            Active Lake
          </label>
          <LakeSelect
            value={selectedLake.id}
            onChange={(id) => setSelectedLake(lakes.find((l) => l.id === id))}
          />
        </ReceiptCard>

        {/* 1 — SOLUNAR ACTIVITY */}
        <ReceiptCard>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: C.gold }}>
              Solunar Activity
            </h2>
            <div className="flex gap-1">
              {ratingBars.map((filled, i) => (
                <div
                  key={i}
                  className="w-3 h-5 rounded-sm"
                  style={{ backgroundColor: filled ? C.green : C.border }}
                />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs mb-1" style={{ color: C.muted }}>Sunrise / Sunset</p>
              <p style={{ color: C.goldLight }}>{solunar.sunriseLabel} – {solunar.sunsetLabel}</p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: C.muted }}>Peak Periods</p>
              <div className="space-y-0.5">
                {solunar.periods?.slice(0, 2).map((p, i) => (
                  <p key={i} className="text-xs" style={{ color: C.green }}>
                    {p.label}{' '}
                    <span style={{ color: C.muted }}>
                      ({p.type === 'major' ? '2hr major' : '1hr minor'})
                    </span>
                  </p>
                ))}
              </div>
            </div>
          </div>
        </ReceiptCard>

        {/* 2 — CONDITIONS */}
        <ReceiptCard>
          <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: C.gold }}>
            Conditions
          </h2>
          {condLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-7 rounded animate-pulse" style={{ backgroundColor: C.border }} />
              ))}
            </div>
          ) : cur ? (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center">
                  <p className="text-2xl font-bold font-mono" style={{ color: C.goldLight }}>
                    {Math.round(cur.temperature_2m)}°
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: C.muted }}>air temp</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold font-mono" style={{ color: C.goldLight }}>
                    {Math.round(cur.wind_speed_10m)}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: C.muted }}>
                    mph {windDirLabel(cur.wind_direction_10m)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold font-mono" style={{ color: C.goldLight }}>
                    {Math.round(cur.surface_pressure)}
                  </p>
                  <p className="text-xs mt-0.5 mb-1" style={{ color: C.muted }}>hPa</p>
                  <TrendBadge trend={pTrend} />
                </div>
              </div>

              <p className="text-xs text-center py-1.5 rounded mb-3" style={{ color: C.gold, backgroundColor: `${C.gold}10`, border: `1px solid ${C.gold}20` }}>
                {pressureImplication(pTrend)}
              </p>

              <div className="flex items-center justify-between pt-2" style={{ borderTop: `1px solid ${C.border}` }}>
                <div>
                  <p className="text-xs mb-0.5" style={{ color: C.muted }}>Pool Elevation</p>
                  {lakeLevel ? (
                    <p className="text-sm font-bold font-mono" style={{ color: C.text }}>
                      {lakeLevel.value.toFixed(1)} ft above sea level
                    </p>
                  ) : (
                    <p className="text-xs" style={{ color: C.muted }}>{lakeLevelError || 'Unavailable'}</p>
                  )}
                  {lakeLevel && (
                    <p className="text-xs mt-0.5" style={{ color: C.muted }}>
                      {lakeLevel.source === 'rise'
                        ? `USBR RISE ${lakeLevel.gaugeId}`
                        : `USGS #${lakeLevel.gaugeId}`}
                      {lakeLevel.converted ? ' · converted to NAVD88' : ''} · last 3 hrs
                    </p>
                  )}
                </div>
                {lakeLevel && <TrendBadge trend={llTrend} />}
              </div>
            </>
          ) : condLocError ? (
            <p className="text-xs py-4 text-center" style={{ color: C.muted }}>
              {condLocError}
            </p>
          ) : (
            <p className="text-xs py-4 text-center" style={{ color: C.muted }}>
              Conditions unavailable on this network. Try on mobile data or a different connection.
            </p>
          )}
        </ReceiptCard>

        {/* 3 — CATCH LOGGING */}
        <ReceiptCard>
          <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: C.gold }}>
            Catch Logging
          </h2>
          <PhotoCapture
            onCapture={(file, url) => setPhoto(url)}
            label="Capture Your Catch"
          />
        </ReceiptCard>

        {/* 4 — DAILY INTEL (collapsible) */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: `1px solid ${C.border}`, backgroundColor: C.card }}
        >
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-3 transition-opacity hover:opacity-80"
            onClick={() => setIntelOpen(v => !v)}
          >
            <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: C.gold }}>
              Daily Intel
            </h2>
            <span
              className="text-base font-bold transition-transform duration-200"
              style={{
                color: C.gold,
                display: 'inline-block',
                transform: intelOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            >
              ▾
            </span>
          </button>

          {intelOpen && (
            <div className="px-4 pb-4 space-y-4" style={{ borderTop: `1px solid ${C.border}` }}>
              <div className="pt-3">
                <p className="text-xs uppercase tracking-widest font-bold mb-2" style={{ color: C.muted }}>
                  {season.charAt(0).toUpperCase() + season.slice(1)} Patterns
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {patterns.map((p) => (
                    <div
                      key={p.id}
                      className="rounded p-2"
                      style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}
                    >
                      <div className="text-xs font-bold mb-0.5" style={{ color: categoryColors[p.category] || C.gold }}>
                        {p.name}
                      </div>
                      <div className="text-xs" style={{ color: C.muted }}>{p.targetDepth}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-widest font-bold mb-2" style={{ color: C.muted }}>
                  Field Tactics
                </p>
                <ul className="space-y-2">
                  {tactics.map((t, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <span className="font-bold mt-0.5 shrink-0" style={{ color: C.gold }}>{i + 1}.</span>
                      <span className="leading-snug" style={{ color: C.text }}>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
