'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Star, MapPin } from 'lucide-react'
import { formatINR } from '@/utils/format'
import type { Salon } from '@/types'

const PRICE_LABELS = { budget: '₹', mid: '₹₹', luxury: '₹₹₹' }
const PRICE_COLORS = { budget: 'bg-green-100 text-green-700', mid: 'bg-blue-100 text-blue-700', luxury: 'bg-purple-100 text-purple-700' }

interface SalonCardProps {
  salon: Salon
  highlighted?: boolean
  compact?: boolean
}

export function SalonCard({ salon, highlighted, compact }: SalonCardProps) {
  const minPrice = salon.services.length
    ? Math.min(...salon.services.map((s) => s.price))
    : null

  return (
    <Link href={`/salons/${salon.id}`}>
      <Card className={`group overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer ${highlighted ? 'ring-2 ring-rose-400' : ''}`}>
        <div className="relative overflow-hidden aspect-[4/3]">
          <Image
            src={salon.coverImage || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600'}
            alt={salon.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          />
          <div className="absolute top-2 right-2">
            <Badge className={`text-xs font-semibold ${PRICE_COLORS[salon.priceRange]}`}>
              {PRICE_LABELS[salon.priceRange]}
            </Badge>
          </div>
        </div>
        <CardContent className="p-3">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate">{salon.name}</h3>
          <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{salon.area}</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-400 stroke-amber-400" />
              <span className="text-xs font-medium">{salon.rating.toFixed(1)}</span>
              {!compact && <span className="text-xs text-gray-400">({salon.reviewCount})</span>}
            </div>
            {minPrice !== null && (
              <span className="text-xs text-gray-500">from {formatINR(minPrice)}</span>
            )}
          </div>
          {!compact && salon.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs mr-1 mt-1 text-rose-600 border-rose-200">
              {tag}
            </Badge>
          ))}
        </CardContent>
      </Card>
    </Link>
  )
}
