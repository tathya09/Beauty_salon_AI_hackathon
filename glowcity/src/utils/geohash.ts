/// <reference path="../types/ngeohash.d.ts" />
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ngeohash = require('ngeohash') as typeof import('ngeohash')

export function encodeGeohash(lat: number, lng: number, precision = 6): string {
  return ngeohash.encode(lat, lng, precision)
}

export function decodeGeohash(hash: string): { latitude: number; longitude: number } {
  const decoded = ngeohash.decode(hash)
  return { latitude: decoded.latitude, longitude: decoded.longitude }
}

export function getGeohashRange(lat: number, lng: number, radiusKm: number) {
  const latDelta = radiusKm / 111
  const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180))
  return {
    lower: ngeohash.encode(lat - latDelta, lng - lngDelta, 6),
    upper: ngeohash.encode(lat + latDelta, lng + lngDelta, 6),
  }
}
