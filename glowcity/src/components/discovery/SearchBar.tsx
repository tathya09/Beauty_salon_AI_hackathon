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
  'Versova', 'Dadar West', 'Borivali', 'Chembur', 'Thane',
]

interface SearchBarProps {
  onSearch?: (query: string, area?: string) => void
  className?: string
  placeholder?: string
  navigateOnSubmit?: boolean
}

export function SearchBar({ onSearch, className, placeholder, navigateOnSubmit = false }: SearchBarProps) {
  const router = useRouter()
  const { setQuery, setFilters } = useDiscoveryStore()
  const [value, setValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const filtered = MUMBAI_AREAS.filter((a) =>
    value.length > 1 && a.toLowerCase().includes(value.toLowerCase())
  )

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
    if (navigateOnSubmit) {
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
            className="pl-9"
          />
        </div>
        <Button onClick={() => submit()} className="bg-rose-500 hover:bg-rose-600 shrink-0">
          Search
        </Button>
      </div>
      {showSuggestions && filtered.length > 0 && (
        <ul className="absolute z-50 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {filtered.map((area) => (
            <li
              key={area}
              onMouseDown={() => { setValue(area); submit(area, area) }}
              className="px-4 py-2 hover:bg-rose-50 cursor-pointer text-sm text-gray-700"
            >
              📍 {area}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
