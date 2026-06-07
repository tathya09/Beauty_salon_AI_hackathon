'use client'

import { useEffect, useState, useCallback } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { SalonCard } from './SalonCard'
import { useDiscoveryStore } from '@/store/discoveryStore'
import type { Salon } from '@/types'

interface SalonGridProps {
  initialSalons: Salon[]
}

export function SalonGrid({ initialSalons }: SalonGridProps) {
  const { activeSalonId, query, filters } = useDiscoveryStore()
  const [salons, setSalons] = useState<Salon[]>(initialSalons)
  const [loading, setLoading] = useState(false)

  const search = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ai/embed-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, filters }),
      })
      if (res.ok) {
        const data = await res.json()
        setSalons(data.items ?? [])
      }
    } catch {
      // silently keep current results
    } finally {
      setLoading(false)
    }
  }, [query, filters])

  useEffect(() => {
    if (query || filters.area || filters.priceRange?.length || filters.categories?.length) {
      search()
    } else {
      setSalons(initialSalons)
    }
  }, [query, filters, initialSalons, search])

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-[4/3] rounded-lg w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  if (salons.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-4xl mb-3">🔍</div>
        <p className="font-medium">No salons found</p>
        <p className="text-sm mt-1">Try a different search or clear your filters</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {salons.map((salon) => (
        <SalonCard key={salon.id} salon={salon} highlighted={salon.id === activeSalonId} />
      ))}
    </div>
  )
}
