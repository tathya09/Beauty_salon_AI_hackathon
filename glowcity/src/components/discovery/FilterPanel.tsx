'use client'

import { Badge } from '@/components/ui/badge'
import { useDiscoveryStore } from '@/store/discoveryStore'
import type { PriceRange, ServiceCategory } from '@/types'

const PRICE_RANGES: { label: string; value: PriceRange }[] = [
  { label: '💰 Budget', value: 'budget' },
  { label: '💎 Mid-range', value: 'mid' },
  { label: '✨ Luxury', value: 'luxury' },
]

const CATEGORIES: { label: string; value: ServiceCategory }[] = [
  { label: '💇 Hair', value: 'hair' },
  { label: '💅 Nails', value: 'nails' },
  { label: '🧴 Skin', value: 'skin' },
  { label: '👰 Bridal', value: 'bridal' },
  { label: '🪒 Grooming', value: 'grooming' },
  { label: '🛁 Spa', value: 'spa' },
]

export function FilterPanel() {
  const { filters, setFilters } = useDiscoveryStore()

  function togglePrice(val: PriceRange) {
    const current = filters.priceRange ?? []
    const next = current.includes(val) ? current.filter((v) => v !== val) : [...current, val]
    setFilters({ priceRange: next.length ? next : undefined })
  }

  function toggleCategory(val: ServiceCategory) {
    const current = filters.categories ?? []
    const next = current.includes(val) ? current.filter((v) => v !== val) : [...current, val]
    setFilters({ categories: next.length ? next : undefined })
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-xs font-medium text-gray-500 mr-1">Price:</span>
      {PRICE_RANGES.map(({ label, value }) => (
        <Badge
          key={value}
          variant={filters.priceRange?.includes(value) ? 'default' : 'outline'}
          className={`cursor-pointer select-none ${filters.priceRange?.includes(value) ? 'bg-rose-500 hover:bg-rose-600' : 'hover:bg-rose-50'}`}
          onClick={() => togglePrice(value)}
        >
          {label}
        </Badge>
      ))}
      <span className="text-xs font-medium text-gray-500 mx-1">Service:</span>
      {CATEGORIES.map(({ label, value }) => (
        <Badge
          key={value}
          variant={filters.categories?.includes(value) ? 'default' : 'outline'}
          className={`cursor-pointer select-none ${filters.categories?.includes(value) ? 'bg-rose-500 hover:bg-rose-600' : 'hover:bg-rose-50'}`}
          onClick={() => toggleCategory(value)}
        >
          {label}
        </Badge>
      ))}
    </div>
  )
}
