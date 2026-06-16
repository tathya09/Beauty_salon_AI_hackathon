import { create } from 'zustand'
import type { SearchFilters } from '@/types'

export interface UserLocation {
  latitude: number
  longitude: number
  accuracy?: number
}

interface DiscoveryState {
  query: string
  filters: SearchFilters
  activeSalonId: string | null
  userLocation: UserLocation | null
  locationLoading: boolean
  locationError: string | null
  sortByDistance: boolean
  setQuery: (q: string) => void
  setFilters: (f: Partial<SearchFilters>) => void
  setActiveSalonId: (id: string | null) => void
  setUserLocation: (loc: UserLocation | null) => void
  setLocationLoading: (v: boolean) => void
  setLocationError: (e: string | null) => void
  setSortByDistance: (v: boolean) => void
  reset: () => void
}

const DEFAULT_FILTERS: SearchFilters = { city: 'Mumbai' }

export const useDiscoveryStore = create<DiscoveryState>((set) => ({
  query: '',
  filters: DEFAULT_FILTERS,
  activeSalonId: null,
  userLocation: null,
  locationLoading: false,
  locationError: null,
  sortByDistance: false,
  setQuery: (query) => set({ query }),
  setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
  setActiveSalonId: (activeSalonId) => set({ activeSalonId }),
  setUserLocation: (userLocation) => set({ userLocation }),
  setLocationLoading: (locationLoading) => set({ locationLoading }),
  setLocationError: (locationError) => set({ locationError }),
  setSortByDistance: (sortByDistance) => set({ sortByDistance }),
  reset: () => set({ query: '', filters: DEFAULT_FILTERS, activeSalonId: null }),
}))
