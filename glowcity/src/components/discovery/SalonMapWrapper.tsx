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

interface SalonMapWrapperProps {
  initialSalons: Salon[]
}

// We extend the discovery store with a visible salons list.
// Using module-level state for simplicity (avoids store churn).
let _visibleSalons: Salon[] = []
const listeners = new Set<() => void>()

export function setVisibleSalons(salons: Salon[]) {
  _visibleSalons = salons
  listeners.forEach((l) => l())
}

export function useVisibleSalons(fallback: Salon[]): Salon[] {
  const [salons, setSalons] = useState<Salon[]>(_visibleSalons.length ? _visibleSalons : fallback)
  useEffect(() => {
    const update = () => setSalons([..._visibleSalons])
    listeners.add(update)
    return () => { listeners.delete(update) }
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
          <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png" className="h-4" alt="nearest" />
          <span className="text-gray-600">Nearest salon</span>
        </div>
        <div className="flex items-center gap-2">
          <img src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png" className="h-4" alt="salon" />
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
