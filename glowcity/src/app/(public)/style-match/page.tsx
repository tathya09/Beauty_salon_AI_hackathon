'use client'

import { useState } from 'react'
import { StyleMatchUpload } from '@/components/ai/StyleMatchUpload'
import { SalonCard } from '@/components/discovery/SalonCard'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Sparkles, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { StyleMatchResult, Salon } from '@/types'

export default function StyleMatchPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<StyleMatchResult | null>(null)

  async function handleUpload(imageUrl: string) {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/ai/style-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }),
      })
      const data = await res.json()
      setResult(data)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  // Convert SalonCard to minimal Salon shape for SalonCard component
  function cardToSalon(card: StyleMatchResult['recommendedSalons'][0]): Salon {
    return {
      id: card.salonId,
      name: card.name,
      slug: card.salonId,
      city: 'Mumbai',
      area: card.area,
      coordinates: { latitude: 19.076, longitude: 72.877 },
      coverImage: card.coverImage,
      gallery: [],
      services: [],
      priceRange: card.priceRange,
      rating: card.rating,
      reviewCount: 0,
      tags: [card.relevantService],
      isVerified: true,
      ownerId: '',
      openingHours: {},
      createdAt: null as unknown as Salon['createdAt'],
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-50">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-gray-500 hover:text-gray-700"><ArrowLeft className="w-5 h-5" /></Link>
        <Sparkles className="w-5 h-5 text-rose-500" />
        <div>
          <h1 className="font-bold text-gray-900">AI Style Matcher</h1>
          <p className="text-xs text-gray-500">Upload an inspiration photo, find your perfect salon</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Find salons that match your vibe ✨</h2>
          <p className="text-gray-500 mt-2">Upload a hair or beauty inspiration photo and our AI will find Mumbai salons that specialise in that exact style.</p>
        </div>

        <StyleMatchUpload onUploadComplete={handleUpload} loading={loading} />

        {loading && (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-7 w-20 rounded-full" />)}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-[4/3] rounded-xl" />)}
            </div>
          </div>
        )}

        {result && !loading && (
          <div className="space-y-6">
            <Card className="border-rose-100 bg-rose-50/50">
              <CardContent className="p-4">
                <p className="text-sm text-gray-700 mb-3">✨ {result.description}</p>
                <div className="flex flex-wrap gap-2">
                  {result.extractedTags.map((tag) => (
                    <Badge key={tag} className="bg-rose-100 text-rose-700 border-rose-200">{tag}</Badge>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  AI confidence: {Math.round(result.confidenceScore * 100)}%
                </p>
              </CardContent>
            </Card>

            {result.recommendedSalons.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-800 mb-4">
                  Salons that can recreate this look 🎯
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {result.recommendedSalons.map((card) => (
                    <div key={card.salonId} className="relative">
                      <SalonCard salon={cardToSalon(card)} />
                      <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs font-medium text-rose-600">
                        {Math.round(card.matchScore * 100)}% match
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
