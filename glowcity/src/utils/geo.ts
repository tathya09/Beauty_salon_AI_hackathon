/**
 * Haversine formula — returns distance in km between two lat/lng points
 */
export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

/** Known Mumbai area name → approx centre coordinates */
export const MUMBAI_AREA_COORDS: Record<string, { latitude: number; longitude: number }> = {
  'bandra west':       { latitude: 19.0596, longitude: 72.8295 },
  'bandra east':       { latitude: 19.0544, longitude: 72.8407 },
  'andheri west':      { latitude: 19.1136, longitude: 72.8697 },
  'andheri east':      { latitude: 19.1197, longitude: 72.8794 },
  'juhu':              { latitude: 19.1075, longitude: 72.8263 },
  'colaba':            { latitude: 18.9067, longitude: 72.8147 },
  'powai':             { latitude: 19.1197, longitude: 72.9051 },
  'malad west':        { latitude: 19.1871, longitude: 72.8481 },
  'malad east':        { latitude: 19.1886, longitude: 72.8664 },
  'khar west':         { latitude: 19.0728, longitude: 72.8376 },
  'versova':           { latitude: 19.1300, longitude: 72.8185 },
  'dadar west':        { latitude: 19.0176, longitude: 72.8433 },
  'dadar east':        { latitude: 19.0200, longitude: 72.8490 },
  'santacruz west':    { latitude: 19.0821, longitude: 72.8415 },
  'santacruz east':    { latitude: 19.0820, longitude: 72.8550 },
  'worli':             { latitude: 19.0144, longitude: 72.8192 },
  'borivali':          { latitude: 19.2288, longitude: 72.8567 },
  'goregaon':          { latitude: 19.1663, longitude: 72.8526 },
  'chembur':           { latitude: 19.0522, longitude: 72.9005 },
  'thane':             { latitude: 19.2183, longitude: 72.9781 },
  'navi mumbai':       { latitude: 19.0330, longitude: 73.0297 },
  'lower parel':       { latitude: 18.9937, longitude: 72.8296 },
  'kurla':             { latitude: 19.0726, longitude: 72.8797 },
  'mulund':            { latitude: 19.1726, longitude: 72.9560 },
  'vile parle':        { latitude: 19.0990, longitude: 72.8478 },
  'kandivali':         { latitude: 19.2041, longitude: 72.8567 },
  'ghatkopar':         { latitude: 19.0863, longitude: 72.9074 },
  'wadala':            { latitude: 19.0178, longitude: 72.8587 },
  'fort':              { latitude: 18.9340, longitude: 72.8340 },
  'nariman point':     { latitude: 18.9256, longitude: 72.8242 },
}

/**
 * Given a text query (e.g. "Bandra West" or "bandra west salons"),
 * returns the matching area coordinates if found, else null.
 */
export function getAreaCoords(text: string): { latitude: number; longitude: number } | null {
  const lower = text.toLowerCase()
  for (const [area, coords] of Object.entries(MUMBAI_AREA_COORDS)) {
    if (lower.includes(area)) return coords
  }
  return null
}
