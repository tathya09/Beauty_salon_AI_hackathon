'use client'

import { useEffect, useState, useCallback } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { SalonCard } from './SalonCard'
import { useDiscoveryStore } from '@/store/discoveryStore'
import type { Salon } from '@/types'

interface SalonGridProps {
  initialSalons: Salon[]
  initialQuery?: string
  initialArea?: string
}

export function SalonGrid({ initialSalons, initialQuery = '', initialArea = '' }: SalonGridProps) {
  const { activeSalonId, query, filters } = useDiscoveryStore()
  const [salons, setSalons] = useState<Salon[]>(initialSalons)
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const search = useCallback(async (q: string, area?: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/ai/embed-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          filters: { city: 'Mumbai', area: area ?? filters.area, ...filters },
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.items?.length > 0) {
          setSalons(data.items)
        } else {
          setSalons(initialSalons)
        }
      }
    } catch {
      setSalons(initialSalons)
    } finally {
      setLoading(false)
      setHasSearched(true)
    }
  }, [filters, initialSalons])

  // On mount: if URL has query or area, search immediately
  useEffect(() => {
    if ((initialQuery || initialArea) && !hasSearched) {
      search(initialQuery, initialArea)
    }
  }, [initialQuery, initialArea, hasSearched, search])

  // On store query change
  useEffect(() => {
    if (query) {
      search(query, filters.area)
    } else if (filters.area || filters.priceRange?.length || filters.categories?.length) {
      search('', filters.area)
    } else if (hasSearched) {
      setSalons(initialSalons)
    }
  }, [query, filters]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-[4/3] rounded-xl w-full" />
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
        <div className="text-5xl mb-3">🔍</div>
        <p className="font-medium text-gray-600">No salons found</p>
        <p className="text-sm mt-1">Try a different search term or area</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {salons.map((salon) => (
        <SalonCard
          key={salon.id}
          salon={salon}
          highlighted={salon.id === activeSalonId}
        />
      ))}
    </div>
  )
}
