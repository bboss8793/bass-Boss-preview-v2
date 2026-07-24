const DEG = Math.PI / 180

function julianDay(date) {
  const y = date.getUTCFullYear()
  const m = date.getUTCMonth() + 1
  const d = date.getUTCDate()
  const A = Math.floor(y / 100)
  const B = 2 - A + Math.floor(A / 4)
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5
}

// Map a longitude to the nearest IANA timezone for US lakes.
// Boundaries are tuned to the lakes in this dataset so DST is handled
// correctly by Intl.DateTimeFormat.
function timezoneForLng(lng) {
  if (lng >= -85.3) return 'America/New_York'    // Eastern (FL, eastern TN)
  if (lng >= -105) return 'America/Chicago'      // Central (TX, OK, LA, MO, KY, AL, western TN)
  return 'America/Los_Angeles'                    // Pacific (WA)
}

function sunTimes(date, lat, lng) {
  const JD = julianDay(date)
  const n = JD - 2451545.0
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
  const eqT = (L - lambda) / 15
  // transit/sunrise/sunset are in UTC hours (may exceed 24 for sunset)
  const transit = 12 - lng / 15 + eqT
  const sunrise = transit - H / 15
  const sunset = transit + H / 15
  return { sunrise, sunset }
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
  // moonrise/moonset are in UTC hours
  const moonrise = (lon / 360) * 24 - (lng / 15) + 12
  const moonset = moonrise + 12.4
  return { moonrise, moonset, dec }
}

// Build a Date object from a UTC fractional hour on the same day as `date`.
// Hours > 24 roll over to the next day automatically via Date.UTC.
function utcDateFromHour(date, utcHour) {
  const h = Math.floor(utcHour)
  const m = Math.round((utcHour - h) * 60)
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    h,
    m,
  ))
}

// Format a Date in the given IANA timezone as "h:mm AM/PM".
function formatInZone(date, timeZone) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

// Extract the fractional hour (0-24) of a Date in the given timezone.
function hourInZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const h = parseInt(parts.find((p) => p.type === 'hour').value, 10)
  const m = parseInt(parts.find((p) => p.type === 'minute').value, 10)
  return h + m / 60
}

function activityRating(date, lat, lng) {
  const timeZone = timezoneForLng(lng)
  const sun = sunTimes(date, lat, lng)
  const moon = moonTimes(date, lat, lng)
  if (!sun || !moon) return { rating: 2, periods: [] }

  // Build Date objects from UTC hours, then format in the lake's local timezone.
  const sunriseDate = utcDateFromHour(date, sun.sunrise)
  const sunsetDate = utcDateFromHour(date, sun.sunset)
  const moonriseDate = utcDateFromHour(date, moon.moonrise)
  const moonsetDate = utcDateFromHour(date, moon.moonset)

  const sunriseLabel = formatInZone(sunriseDate, timeZone)
  const sunsetLabel = formatInZone(sunsetDate, timeZone)

  // Peak periods: majors at moonrise/moonset, minors offset by ~6.2 hours.
  const periods = []
  const majorTimes = [moon.moonrise, moon.moonset]
  const minorTimes = [moon.moonrise + 6.2, moon.moonset + 6.2]

  majorTimes.forEach((utcHour) => {
    const d = utcDateFromHour(date, utcHour)
    periods.push({
      type: 'major',
      hour: hourInZone(d, timeZone),
      label: formatInZone(d, timeZone),
      duration: 2,
    })
  })
  minorTimes.forEach((utcHour) => {
    const d = utcDateFromHour(date, utcHour)
    periods.push({
      type: 'minor',
      hour: hourInZone(d, timeZone),
      label: formatInZone(d, timeZone),
      duration: 1,
    })
  })

  // "now" is the user's wall-clock hour. Compare against local hours.
  const nowH = hourInZone(date, timeZone)
  let rating = 1
  for (const p of periods) {
    const diff = Math.abs(p.hour - nowH)
    if (diff < 1) rating = p.type === 'major' ? 5 : 3
    else if (diff < 2) rating = Math.max(rating, p.type === 'major' ? 4 : 2)
  }

  return {
    rating,
    periods: periods.sort((a, b) => a.hour - b.hour),
    sunrise: hourInZone(sunriseDate, timeZone),
    sunset: hourInZone(sunsetDate, timeZone),
    sunriseLabel,
    sunsetLabel,
  }
}

// Legacy formatter for a raw fractional hour (0-24). Kept for backwards-compatible imports.
function formatHour(h) {
  const totalMinutes = Math.round(h * 60)
  let hours = Math.floor(totalMinutes / 60)
  let minutes = totalMinutes % 60
  if (minutes >= 60) { hours += 1; minutes = 0 }
  hours = hours % 24
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHour = hours % 12 === 0 ? 12 : hours % 12
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`
}

export { activityRating, sunTimes, moonTimes, formatInZone, formatHour }
