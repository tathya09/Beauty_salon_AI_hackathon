'use client'

/**
 * SalonMapWrapper
 * ───────────────
 * Client component that bridges the server-rendered initialSalons with the
 * live Zustand store. When the user searches/filters, the grid updates its
 * local state — this wrapper reads from a shared store key so the map
 * always reflects the current visible salons.
 *
 * We keep the actual salon list in a lightweight shared atom in the store
 * so both SalonGrid and SalonMapWrapper stay in sync without prop-drilling.
 */

import { useEffect, useState } from 'react'
import { SalonMap } from './SalonMap'
import { useDiscoveryStore } from '@/store/discoveryStore'
import type { Salon } from '@/types'
import { getVisibleSalons, subscribeVisibleSalons } from './visibleSalons'

interface SalonMapWrapperProps {
  initialSalons: Salon[]
}

export function useVisibleSalons(fallback: Salon[]): Salon[] {
  const [salons, setSalons] = useState<Salon[]>(() => {
    const visible = getVisibleSalons()
    return visible.length ? visible : fallback
  })

  useEffect(() => {
    const unsubscribe = subscribeVisibleSalons(() => {
      setSalons([...getVisibleSalons()])
    })
    return unsubscribe
  }, [])

  return salons
}

export function SalonMapWrapper({ initialSalons }: SalonMapWrapperProps) {
  const salons = useVisibleSalons(initialSalons)
  const { userLocation } = useDiscoveryStore()

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden shadow-sm border border-gray-200">
      <SalonMap salons={salons} />

      {/* Map legend */}
      <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg shadow px-3 py-2 text-xs space-y-1 border border-gray-100 z-[400]">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-sm" />
          <span className="text-gray-600">You</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-4 w-4 rounded-sm bg-amber-500" aria-hidden="true" />
          <span className="text-gray-600">Nearest salon</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-4 w-4 rounded-sm bg-rose-500" aria-hidden="true" />
          <span className="text-gray-600">Salon</span>
        </div>
        {userLocation && (
          <div className="flex items-center gap-2 border-t border-gray-100 pt-1 mt-1">
            <span className="text-blue-500">⊙</span>
            <span className="text-gray-500">2 km radius shown</span>
          </div>
        )}
      </div>
    </div>
  )
}
