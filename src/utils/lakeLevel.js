// Lake level / pool elevation fetchers.
//
// Two data sources are supported:
//   - USGS NWIS Instantaneous Values (https://waterservices.usgs.gov/nwis/iv/)
//   - Bureau of Reclamation RISE (https://data.usbr.gov/rise/api/result)
//
// Both resolve to the same display shape so the UI does not need to know which
// backend a given lake uses: { value, unit, readings, gaugeId, converted }.

const NO_LEVEL = null

// USGS parameter codes, tried in priority order: reservoir pool elevation
// (NAVD88) → NGVD29 → gage height. Callers may pass a narrower fallback list.
const DEFAULT_USGS_PARAMS = ['62614', '62615', '00062', '00065']

// Offset applied when a lake's only returning parameter is gage height (00065)
// on a local datum, to convert to NAVD88. Keyed by lake id.
const GAGE_HEIGHT_OFFSETS = {
  'lake-sammamish': 3.61, // local gage-height datum → NAVD88
}

// Lakes whose only returning param is gage height (00065) and therefore need
// the datum offset applied before display.
function needsOffset(lakeId, param) {
  return param === '00065' && Object.prototype.hasOwnProperty.call(GAGE_HEIGHT_OFFSETS, lakeId)
}

// Fetch pool elevation from USGS NWIS IV. Tries each parameter in priority
// order and returns the first one that returns a usable time series.
//
// Returns { value, unit, readings, gaugeId, source: 'usgs', param, converted }
// or null if no param returns data.
export async function fetchLakeLevel(station, fallbackParams, lakeId) {
  const params = (fallbackParams && fallbackParams.length ? fallbackParams : DEFAULT_USGS_PARAMS).slice()
  for (const param of params) {
    let data
    try {
      const res = await fetch(
        `https://waterservices.usgs.gov/nwis/iv/?format=json&sites=${station}&parameterCd=${param}&period=PT3H`
      )
      data = await res.json()
    } catch {
      continue
    }
    const series = data?.value?.timeSeries?.[0]
    if (!series) continue
    const readings = series.values?.[0]?.value
      ?.map((v) => parseFloat(v.value))
      .filter((v) => !isNaN(v)) || []
    if (!readings.length) continue
    const value = readings[readings.length - 1]
    const unit = series.variable?.unit?.unitCode || 'ft'
    const converted = needsOffset(lakeId, param)
    return {
      value: converted ? value + GAGE_HEIGHT_OFFSETS[lakeId] : value,
      unit,
      readings: converted ? readings.map((r) => r + GAGE_HEIGHT_OFFSETS[lakeId]) : readings,
      gaugeId: station,
      source: 'usgs',
      param,
      converted,
    }
  }
  return NO_LEVEL
}

// Fetch the most recent elevation from the Bureau of Reclamation RISE API.
// Response shape: { result: [ { dateTime, result, ... }, ... ] } with result
// values in feet (NAVD88).
//
// Returns { value, unit, readings, gaugeId, source: 'rise' } or null.
export async function fetchRiseElevation(locationId, itemId) {
  try {
    const res = await fetch(
      `https://data.usbr.gov/rise/api/result?locationId=${locationId}&itemId=${itemId}`
    )
    const data = await res.json()
    const results = data?.result
    if (!Array.isArray(results) || !results.length) return NO_LEVEL
    const readings = results
      .map((r) => parseFloat(r.result))
      .filter((v) => !isNaN(v))
    if (!readings.length) return NO_LEVEL
    return {
      value: readings[readings.length - 1],
      unit: 'ft',
      readings,
      gaugeId: `RISE ${locationId}/${itemId}`,
      source: 'rise',
    }
  } catch {
    return NO_LEVEL
  }
}

// Dispatcher: route a lake to the right backend based on its gauge config.
//
// gauge config shape (from lakes.js):
//   { source: 'usgs', station, params? }          → fetchLakeLevel
//   { source: 'rise', locationId, itemId }        → fetchRiseElevation
//
// Returns the normalized level object or null (caller shows "No gauge data").
export async function fetchLakeLevelFor(lake) {
  const gauge = lake?.gauge
  if (!gauge) return NO_LEVEL
  if (gauge.source === 'usgs') {
    return fetchLakeLevel(gauge.station, gauge.params, lake.id)
  }
  if (gauge.source === 'rise') {
    return fetchRiseElevation(gauge.locationId, gauge.itemId)
  }
  return NO_LEVEL
}
