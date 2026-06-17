'use client'

import { useEffect, useState, useCallback } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { SalonCard } from './SalonCard'
import { useDiscoveryStore } from '@/store/discoveryStore'
import { setVisibleSalons } from './visibleSalons'
import { haversineKm, formatDistance, getAreaCoords } from '@/utils/geo'
import type { Salon } from '@/types'

interface SalonGridProps {
  initialSalons: Salon[]
}

export function SalonGrid({ initialSalons }: SalonGridProps) {
  const {
    activeSalonId, query, filters,
    userLocation, sortByDistance,
    setSortByDistance, setUserLocation,
    setLocationLoading, setLocationError,
    locationLoading, locationError,
  } = useDiscoveryStore()

  const [salons, setSalons] = useState<Salon[]>(initialSalons)
  const [loading, setLoading] = useState(false)

  // ── Geolocation ─────────────────────────────────────────────
  function requestLocation() {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.')
      return
    }
    setLocationLoading(true)
    setLocationError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy })
        setLocationLoading(false)
        setSortByDistance(true)
      },
      (err) => {
        setLocationError(err.code === 1 ? 'Location access denied. Please allow location in your browser.' : 'Could not get your location.')
        setLocationLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // ── Search ───────────────────────────────────────────────────
  const search = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ai/embed-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          filters,
          userLocation: userLocation ?? undefined,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setSalons(data.items ?? [])

        // Auto-enable nearest-first when area coords or GPS available
        const hasAreaCoords = (query && getAreaCoords(query)) ||
          (filters.area && getAreaCoords(filters.area))
        if (userLocation || hasAreaCoords) {
          setSortByDistance(true)
        }
      }
    } catch {
      // keep current results on network error
    } finally {
      setLoading(false)
    }
  }, [query, filters, userLocation, setSortByDistance])

  useEffect(() => {
    // Trigger search when: GPS location active, area filter set, or any other filter/query
    const hasFilter =
      query ||
      filters.area ||
      filters.priceRange?.length ||
      filters.categories?.length ||
      filters.nailSubTypes?.length ||
      filters.tags?.length

    if (userLocation || hasFilter) {
      search()
    } else {
      setSalons(initialSalons)
    }
  }, [query, filters, userLocation, initialSalons, search])

  // ── Reference point for distance display ──────────────────────
  // Use GPS location if available, otherwise geocode area from query/filters
  const refPoint = userLocation ??
    (query ? getAreaCoords(query) : null) ??
    (filters.area ? getAreaCoords(filters.area) : null)

  // ── Sort by distance when a reference point is available ─────
  const displaySalons = (() => {
    if (!sortByDistance || !refPoint) return salons
    return [...salons].sort((a, b) => {
      const da = haversineKm(refPoint.latitude, refPoint.longitude, a.coordinates.latitude, a.coordinates.longitude)
      const db = haversineKm(refPoint.latitude, refPoint.longitude, b.coordinates.latitude, b.coordinates.longitude)
      return da - db
    })
  })()

  // Sync visible salons to the map
  useEffect(() => {
    setVisibleSalons(displaySalons)
  }, [displaySalons])

  // ── Loading skeleton ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-[4/3] rounded-lg w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ── Location bar ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {!userLocation ? (
            <button
              onClick={requestLocation}
              disabled={locationLoading}
              className="flex items-center gap-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-full font-medium transition-colors disabled:opacity-60"
            >
              {locationLoading ? (
                <>
                  <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  Locating…
                </>
              ) : (
                <>📍 Use my location</>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full font-medium">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                Location active
              </span>
              <button
                onClick={() => {
                  setUserLocation(null)
                  setSortByDistance(false)
                }}
                className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5 rounded-full hover:bg-gray-100"
              >
                ✕ Clear
              </button>
            </div>
          )}

          {/* Show nearest-first toggle when GPS or area reference point available */}
          {refPoint && (
            <button
              onClick={() => setSortByDistance(!sortByDistance)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                sortByDistance
                  ? 'bg-rose-500 text-white border-rose-500'
                  : 'text-gray-600 border-gray-200 hover:border-rose-300'
              }`}
            >
              {sortByDistance ? '✓ Nearest first' : 'Sort: Nearest first'}
            </button>
          )}
        </div>

        <span className="text-xs text-gray-400">{displaySalons.length} salon{displaySalons.length !== 1 ? 's' : ''}</span>
      </div>

      {/* ── Location error ── */}
      {locationError && (
        <div className="text-xs text-orange-600 bg-orange-50 border border-orange-100 px-3 py-2 rounded-lg">
          {locationError}
        </div>
      )}

      {/* ── No results ── */}
      {displaySalons.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">🔍</div>
          <p className="font-medium text-gray-600">No salons found for this combination</p>
          <p className="text-sm mt-1">Try clearing some filters or searching by area</p>
          <button
            onClick={() => {
              useDiscoveryStore.getState().reset()
              setSalons(initialSalons)
            }}
            className="mt-4 text-sm text-rose-500 hover:underline"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {displaySalons.map((salon, idx) => {
            const dist = refPoint
              ? haversineKm(refPoint.latitude, refPoint.longitude, salon.coordinates.latitude, salon.coordinates.longitude)
              : null
            const isNearest = (sortByDistance || !!refPoint) && idx === 0

            return (
              <div key={salon.id} className="relative">
                {isNearest && (
                  <div className="absolute -top-2 left-2 z-10 bg-amber-400 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow">
                    🏆 Nearest
                  </div>
                )}
                <SalonCard
                  salon={salon}
                  highlighted={salon.id === activeSalonId}
                  distanceLabel={dist !== null ? formatDistance(dist) : undefined}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
