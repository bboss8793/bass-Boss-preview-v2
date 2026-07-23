const DEG = Math.PI / 180

function julianDay(date) {
  const y = date.getUTCFullYear()
  const m = date.getUTCMonth() + 1
  const d = date.getUTCDate()
  const A = Math.floor(y / 100)
  const B = 2 - A + Math.floor(A / 4)
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5
}

function sunTimes(date, lat, lng) {
  const JD = julianDay(date)
  const n = JD - 2451545.0
  // Keep L in [0, 360) to avoid large-number precision loss
  const L = ((280.46 + 0.9856474 * n) % 360 + 360) % 360
  const g = ((357.528 + 0.9856003 * n) % 360 + 360) % 360
  const lambda = L + 1.915 * Math.sin(g * DEG) + 0.02 * Math.sin(2 * g * DEG)
  const epsilon = 23.439 - 0.0000004 * n
  const sinDec = Math.sin(epsilon * DEG) * Math.sin(lambda * DEG)
  const dec = Math.asin(sinDec) / DEG
  const cosH = (Math.cos(90.833 * DEG) - Math.sin(lat * DEG) * Math.sin(dec * DEG)) /
    (Math.cos(lat * DEG) * Math.cos(dec * DEG))
  if (cosH > 1 || cosH < -1) return null
  const H = Math.acos(cosH) / DEG
  // Equation of time correction (hours): accounts for difference between mean and apparent solar time
  const eqT = (L - lambda) / 15
  const transit = 12 - lng / 15 + eqT
  const sunrise = transit - H / 15
  const sunset = transit + H / 15
  return { sunrise: normalizeHour(sunrise), sunset: normalizeHour(sunset) }
}

function normalizeHour(h) {
  return ((h % 24) + 24) % 24
}

function moonTimes(date, lat, lng) {
  const JD = julianDay(date)
  const d = JD - 2451545.0
  const L = (218.316 + 13.176396 * d) % 360
  const M = (134.963 + 13.064993 * d) % 360
  const F = (93.272 + 13.229350 * d) % 360
  const lon = L + 6.289 * Math.sin(M * DEG)
  const lat2 = 5.128 * Math.sin(F * DEG)
  const dec = Math.asin(Math.sin(lat2 * DEG) * Math.cos(0 * DEG) +
    Math.cos(lat2 * DEG) * Math.sin(0 * DEG) * Math.sin(lon * DEG)) / DEG
  const moonrise = (lon / 360) * 24 - (lng / 15) + 12
  const moonset = moonrise + 12.4
  return { moonrise: normalizeHour(moonrise), moonset: normalizeHour(moonset), dec }
}

function formatHour(h) {
  const totalMinutes = Math.round(h * 60)
  let hours = Math.floor(totalMinutes / 60)
  let minutes = totalMinutes % 60
  if (minutes >= 60) { hours += 1; minutes = 0 }
  hours = hours % 24
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHour = hours % 12 === 0 ? 12 : hours % 12
  const displayMinutes = String(minutes).padStart(2, '0')
  return `${displayHour}:${displayMinutes} ${period}`
}

function activityRating(date, lat, lng) {
  const sun = sunTimes(date, lat, lng)
  const moon = moonTimes(date, lat, lng)
  if (!sun || !moon) return { rating: 2, periods: [] }

  const periods = []
  const majors = [moon.moonrise, moon.moonset]
  const minors = [
    normalizeHour(moon.moonrise + 6.2),
    normalizeHour(moon.moonset + 6.2),
  ]

  majors.forEach((h) => periods.push({ type: 'major', hour: h, label: formatHour(h), duration: 2 }))
  minors.forEach((h) => periods.push({ type: 'minor', hour: h, label: formatHour(h), duration: 1 }))

  const now = date.getHours() + date.getMinutes() / 60
  let rating = 1
  for (const p of periods) {
    const diff = Math.abs(p.hour - now)
    if (diff < 1) rating = p.type === 'major' ? 5 : 3
    else if (diff < 2) rating = Math.max(rating, p.type === 'major' ? 4 : 2)
  }

  return {
    rating,
    periods: periods.sort((a, b) => a.hour - b.hour),
    sunrise: sun.sunrise,
    sunset: sun.sunset,
    sunriseLabel: formatHour(sun.sunrise),
    sunsetLabel: formatHour(sun.sunset),
  }
}

export { activityRating, sunTimes, moonTimes, formatHour }
