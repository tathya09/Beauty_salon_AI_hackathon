import { create } from 'zustand'
import type { SearchFilters } from '@/types'

interface DiscoveryState {
  query: string
  filters: SearchFilters
  activeSalonId: string | null
  setQuery: (q: string) => void
  setFilters: (f: Partial<SearchFilters>) => void
  setActiveSalonId: (id: string | null) => void
  reset: () => void
}

const DEFAULT_FILTERS: SearchFilters = { city: 'Mumbai' }

export const useDiscoveryStore = create<DiscoveryState>((set) => ({
  query: '',
  filters: DEFAULT_FILTERS,
  activeSalonId: null,
  setQuery: (query) => set({ query }),
  setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
  setActiveSalonId: (activeSalonId) => set({ activeSalonId }),
  reset: () => set({ query: '', filters: DEFAULT_FILTERS, activeSalonId: null }),
}))
