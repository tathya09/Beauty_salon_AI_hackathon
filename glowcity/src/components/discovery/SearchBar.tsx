'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'
import { useDiscoveryStore } from '@/store/discoveryStore'

const MUMBAI_AREAS = [
  'Bandra West', 'Bandra East', 'Andheri West', 'Andheri East',
  'Juhu', 'Colaba', 'Powai', 'Malad West', 'Khar West',
  'Versova', 'Dadar West', 'Borivali', 'Chembur', 'Worli',
]

// Popular search suggestions
const SUGGESTIONS = [
  'Balayage', 'Bridal makeup', 'Hair color', 'Keratin treatment',
  'Gel nails', 'Facial', 'Beard trim', 'Hair spa',
]

interface SearchBarProps {
  onSearch?: (query: string, area?: string) => void
  className?: string
  placeholder?: string
  navigateOnSubmit?: boolean
  initialQuery?: string
  initialArea?: string
}

export function SearchBar({
  onSearch, className, placeholder, navigateOnSubmit = false,
  initialQuery = '', initialArea = '',
}: SearchBarProps) {
  const router = useRouter()
  const { setQuery, setFilters } = useDiscoveryStore()
  const [value, setValue] = useState(initialQuery || initialArea)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const areaMatches = MUMBAI_AREAS.filter((a) =>
    value.length > 1 && a.toLowerCase().includes(value.toLowerCase())
  )
  const suggestionMatches = value.length === 0 ? SUGGESTIONS.slice(0, 4) : []

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setValue(v)
    setShowSuggestions(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setQuery(v)
      onSearch?.(v)
    }, 500)
  }, [setQuery, onSearch])

  function submit(q = value, area?: string) {
    setQuery(q)
    if (area) setFilters({ area })
    setShowSuggestions(false)

    if (navigateOnSubmit || !onSearch) {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (area) params.set('area', area)
      router.push(`/salons?${params.toString()}`)
    } else {
      onSearch?.(q, area)
    }
  }

  return (
    <div className={`relative ${className ?? ''}`}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={value}
            onChange={handleChange}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder={placeholder ?? 'Search salons, services, areas…'}
            className="pl-9 h-11 text-sm"
          />
        </div>
        <Button
          onClick={() => submit()}
          className="bg-rose-500 hover:bg-rose-600 shrink-0 h-11 px-5"
        >
          Search
        </Button>
      </div>

      {showSuggestions && (areaMatches.length > 0 || suggestionMatches.length > 0) && (
        <ul className="absolute z-50 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {areaMatches.map((area) => (
            <li
              key={area}
              onMouseDown={() => { setValue(area); submit(area, area) }}
              className="px-4 py-2.5 hover:bg-rose-50 cursor-pointer text-sm text-gray-700 flex items-center gap-2"
            >
              <span>📍</span> {area}
            </li>
          ))}
          {suggestionMatches.map((s) => (
            <li
              key={s}
              onMouseDown={() => { setValue(s); submit(s) }}
              className="px-4 py-2.5 hover:bg-rose-50 cursor-pointer text-sm text-gray-600 flex items-center gap-2"
            >
              <span>🔍</span> {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
