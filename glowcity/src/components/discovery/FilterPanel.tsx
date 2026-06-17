'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { useDiscoveryStore } from '@/store/discoveryStore'
import { ChevronDown, X, Leaf, FlaskConical, Stethoscope, Flower2 } from 'lucide-react'
import type { PriceRange, ServiceCategory } from '@/types'

// ── Price ranges ──────────────────────────────────────────────
const PRICE_RANGES: { label: string; value: PriceRange }[] = [
  { label: '💰 Budget', value: 'budget' },
  { label: '💎 Mid-range', value: 'mid' },
  { label: '✨ Luxury', value: 'luxury' },
]

// ── Top-level categories ──────────────────────────────────────
const CATEGORIES: { label: string; value: ServiceCategory; icon: string }[] = [
  { label: 'Hair', value: 'hair', icon: '💇' },
  { label: 'Nails', value: 'nails', icon: '💅' },
  { label: 'Skin', value: 'skin', icon: '🧴' },
  { label: 'Bridal', value: 'bridal', icon: '👰' },
  { label: 'Grooming', value: 'grooming', icon: '🪒' },
  { label: 'Spa', value: 'spa', icon: '🛁' },
]

// ── Sub-type definitions per category ────────────────────────
type SubType = { label: string; tag: string; desc?: string }

const SUB_TYPES: Record<ServiceCategory, SubType[]> = {
  hair: [
    { label: 'Balayage', tag: 'balayage', desc: 'Sun-kissed color' },
    { label: 'Keratin', tag: 'keratin', desc: 'Frizz-free smoothing' },
    { label: 'Extensions', tag: 'extensions', desc: 'Length & volume' },
    { label: 'Hair Color', tag: 'hair-color', desc: 'Global & highlights' },
    { label: 'Ombre', tag: 'ombre', desc: 'Gradient coloring' },
    { label: 'Hair Spa', tag: 'hair-spa', desc: 'Deep conditioning' },
    { label: 'Haircut', tag: 'haircut', desc: 'Cut & styling' },
    { label: 'Curly Care', tag: 'curly-hair', desc: 'Curl specialists' },
  ],
  nails: [
    { label: 'Gel Nails', tag: 'gel-nails', desc: 'UV/LED cured gel' },
    { label: 'Soft Gel', tag: 'soft-gel', desc: 'Flexible builder gel' },
    { label: 'Hard Gel', tag: 'hard-gel', desc: 'Sculpting gel' },
    { label: 'Acrylic', tag: 'acrylic-nails', desc: 'Powder & liquid' },
    { label: 'Nail Art', tag: 'nail-art', desc: 'Custom designs' },
    { label: 'Chrome', tag: 'chrome-nails', desc: 'Mirror finish' },
    { label: 'Ombre Nails', tag: 'ombre-nails', desc: 'Gradient art' },
    { label: 'Manicure', tag: 'manicure', desc: 'Classic hand care' },
    { label: 'Pedicure', tag: 'pedicure', desc: 'Foot treatment' },
    { label: 'Bridal Nails', tag: 'bridal-nails', desc: 'Wedding packages' },
  ],
  skin: [
    { label: 'Hydra Facial', tag: 'facial', desc: 'Deep hydration' },
    { label: 'Gold Facial', tag: 'gold-facial', desc: 'Anti-aging gold' },
    { label: 'Cleanup', tag: 'cleanup', desc: 'Basic cleanup' },
    { label: 'Waxing', tag: 'waxing', desc: 'Hair removal' },
    { label: 'Threading', tag: 'threading', desc: 'Brow shaping' },
    { label: 'Anti-Aging', tag: 'anti-aging', desc: 'Wrinkle treatment' },
    { label: 'Acne Treatment', tag: 'acne', desc: 'Blemish control' },
    { label: 'Pigmentation', tag: 'pigmentation', desc: 'Even skin tone' },
  ],
  bridal: [
    { label: 'Bridal Makeup', tag: 'bridal', desc: 'Full bridal look' },
    { label: 'Mehendi', tag: 'mehendi', desc: 'Henna designs' },
    { label: 'Pre-Bridal', tag: 'pre-bridal', desc: 'Prep packages' },
    { label: 'Saree Draping', tag: 'draping', desc: 'Traditional draping' },
    { label: 'Airbrush', tag: 'airbrush', desc: 'HD airbrush finish' },
    { label: 'Engagement', tag: 'engagement', desc: 'Engagement looks' },
  ],
  grooming: [
    { label: "Men's Haircut", tag: 'haircut', desc: 'Cut & style' },
    { label: 'Beard Styling', tag: 'beard', desc: 'Precision beard' },
    { label: 'Clean Shave', tag: 'shave', desc: 'Hot towel shave' },
    { label: 'Scalp Treatment', tag: 'scalp', desc: 'Scalp therapy' },
    { label: 'Detan Facial', tag: 'detan', desc: 'Men\'s facial' },
  ],
  spa: [
    { label: 'Swedish Massage', tag: 'massage', desc: 'Relaxing full body' },
    { label: 'Deep Tissue', tag: 'deep-tissue', desc: 'Muscle relief' },
    { label: 'Aromatherapy', tag: 'aromatherapy', desc: 'Essential oils' },
    { label: 'Hot Stone', tag: 'hot-stone', desc: 'Stone therapy' },
    { label: 'Body Wrap', tag: 'body-wrap', desc: 'Detox wrap' },
    { label: 'Reflexology', tag: 'reflexology', desc: 'Foot pressure' },
  ],
}

// ── Treatment preference types ────────────────────────────────
type TreatmentPref = 'natural' | 'ayurvedic' | 'chemical' | 'dermat'
const TREATMENT_PREFS: { label: string; value: TreatmentPref; icon: React.ReactNode; color: string; activeBg: string; desc: string }[] = [
  {
    label: 'Natural',
    value: 'natural',
    icon: <Leaf className="w-3.5 h-3.5" />,
    color: 'text-green-700 border-green-200',
    activeBg: 'bg-green-500 text-white border-green-500',
    desc: 'Plant-based ingredients',
  },
  {
    label: 'Ayurvedic',
    value: 'ayurvedic',
    icon: <Flower2 className="w-3.5 h-3.5" />,
    color: 'text-amber-700 border-amber-200',
    activeBg: 'bg-amber-500 text-white border-amber-500',
    desc: 'Traditional Indian herbs',
  },
  {
    label: 'Chemical',
    value: 'chemical',
    icon: <FlaskConical className="w-3.5 h-3.5" />,
    color: 'text-blue-700 border-blue-200',
    activeBg: 'bg-blue-500 text-white border-blue-500',
    desc: 'Advanced formulations',
  },
  {
    label: 'Dermat',
    value: 'dermat',
    icon: <Stethoscope className="w-3.5 h-3.5" />,
    color: 'text-violet-700 border-violet-200',
    activeBg: 'bg-violet-500 text-white border-violet-500',
    desc: 'Dermatologist-recommended',
  },
]

// Treatment pref → search tags mapping
const TREATMENT_TAGS: Record<TreatmentPref, string[]> = {
  natural: ['natural', 'organic', 'plant-based', 'herbal'],
  ayurvedic: ['ayurvedic', 'herbal', 'traditional'],
  chemical: ['chemical', 'keratin', 'anti-aging', 'pigmentation', 'acne'],
  dermat: ['dermat', 'clinic', 'medical-grade', 'anti-aging', 'acne', 'pigmentation'],
}

export function FilterPanel() {
  const { filters, setFilters } = useDiscoveryStore()
  const [activeTreatment, setActiveTreatment] = useState<TreatmentPref | null>(null)
  const [expandedSubCat, setExpandedSubCat] = useState<ServiceCategory | null>(null)

  // Active category that has sub-types showing
  const activeCategory = expandedSubCat ?? (filters.categories?.length === 1 ? filters.categories[0] : null)

  function togglePrice(val: PriceRange) {
    const current = filters.priceRange ?? []
    const next = current.includes(val) ? current.filter((v) => v !== val) : [...current, val]
    setFilters({ priceRange: next.length ? next : undefined })
  }

  function toggleCategory(val: ServiceCategory) {
    const current = filters.categories ?? []
    const isRemoving = current.includes(val)
    const next = isRemoving ? current.filter((v) => v !== val) : [...current, val]

    if (isRemoving) {
      setExpandedSubCat(null)
      setFilters({ categories: next.length ? next : undefined, nailSubTypes: undefined })
    } else {
      setExpandedSubCat(val)
      setFilters({ categories: next.length ? next : undefined })
    }
  }

  function toggleTag(tag: string) {
    const current = filters.tags ?? []
    const next = current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]
    setFilters({ tags: next.length ? next : undefined })
  }

  function toggleTreatment(val: TreatmentPref) {
    if (activeTreatment === val) {
      setActiveTreatment(null)
      setFilters({ tags: (filters.tags ?? []).filter((t) => !TREATMENT_TAGS[val].includes(t)) })
    } else {
      setActiveTreatment(val)
      const existingTags = (filters.tags ?? []).filter(
        (t) => !Object.values(TREATMENT_TAGS).flat().includes(t)
      )
      setFilters({ tags: [...existingTags, ...TREATMENT_TAGS[val]] })
    }
  }

  function clearAll() {
    setFilters({ priceRange: undefined, categories: undefined, nailSubTypes: undefined, tags: undefined })
    setActiveTreatment(null)
    setExpandedSubCat(null)
  }

  const hasActiveFilters =
    (filters.priceRange?.length ?? 0) > 0 ||
    (filters.categories?.length ?? 0) > 0 ||
    (filters.tags?.length ?? 0) > 0

  const subTypes = activeCategory ? SUB_TYPES[activeCategory] : []

  return (
    <div className="space-y-2">
      {/* ── Row 1: Price + Category + Treatment ── */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-xs font-medium text-gray-400 mr-0.5">Price:</span>
        {PRICE_RANGES.map(({ label, value }) => (
          <Badge
            key={value}
            variant={filters.priceRange?.includes(value) ? 'default' : 'outline'}
            className={`cursor-pointer select-none text-xs ${
              filters.priceRange?.includes(value)
                ? 'bg-rose-500 hover:bg-rose-600 text-white border-rose-500'
                : 'hover:bg-rose-50 hover:border-rose-300'
            }`}
            onClick={() => togglePrice(value)}
          >
            {label}
          </Badge>
        ))}

        <span className="text-xs font-medium text-gray-400 mx-0.5">Service:</span>
        {CATEGORIES.map(({ label, value, icon }) => {
          const isActive = filters.categories?.includes(value)
          const isExpanded = expandedSubCat === value
          return (
            <button
              key={value}
              onClick={() => { toggleCategory(value); if (!isExpanded) setExpandedSubCat(value) }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-150
                ${isActive
                  ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-rose-300 hover:text-rose-600'
                }`}
            >
              {icon} {label}
              {isActive && <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />}
            </button>
          )
        })}

        {/* Treatment preference */}
        <span className="text-xs font-medium text-gray-400 mx-0.5">Approach:</span>
        {TREATMENT_PREFS.map(({ label, value, icon, color, activeBg, desc }) => (
          <button
            key={value}
            title={desc}
            onClick={() => toggleTreatment(value)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-150
              ${activeTreatment === value ? activeBg : `bg-white ${color} hover:bg-gray-50`}`}
          >
            {icon} {label}
          </button>
        ))}

        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs text-gray-400 hover:text-rose-500 hover:bg-rose-50 border border-transparent transition-colors ml-1"
          >
            <X className="w-3 h-3" /> Clear all
          </button>
        )}
      </div>

      {/* ── Row 2: Sub-type filters (shown when a category is active) ── */}
      {activeCategory && subTypes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl px-3 py-2 border border-rose-100 animate-in fade-in slide-in-from-top-1 duration-200">
          <span className="text-xs font-semibold text-rose-600 mr-1 flex items-center gap-1">
            {CATEGORIES.find((c) => c.value === activeCategory)?.icon}
            <span className="capitalize">{activeCategory} type:</span>
          </span>
          {subTypes.map(({ label, tag, desc }) => (
            <button
              key={tag}
              title={desc}
              onClick={() => toggleTag(tag)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-150
                ${filters.tags?.includes(tag)
                  ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-rose-300 hover:text-rose-600'
                }`}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => setExpandedSubCat(null)}
            className="ml-auto text-xs text-rose-300 hover:text-rose-500 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
