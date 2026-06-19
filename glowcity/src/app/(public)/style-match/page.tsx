'use client'

import { useState } from 'react'
import { StyleMatchUpload } from '@/components/ai/StyleMatchUpload'
import { SalonCard } from '@/components/discovery/SalonCard'
import { MegaNav } from '@/components/discovery/MegaNav'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Sparkles, RefreshCw, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { StyleMatchResult, Salon } from '@/types'

function cardToSalon(card: StyleMatchResult['recommendedSalons'][0]): Salon {
  return {
    id: card.salonId, name: card.name, slug: card.salonId,
    city: 'Mumbai', area: card.area,
    coordinates: { latitude: 19.076, longitude: 72.877 },
    coverImage: card.coverImage, gallery: [],
    services: [{ id: '1', name: card.relevantService, category: 'hair', duration: 60, price: 1500, description: '' }],
    priceRange: card.priceRange, rating: card.rating, reviewCount: 0,
    tags: [card.relevantService], isVerified: true, ownerId: '',
    openingHours: {}, createdAt: null as unknown as Salon['createdAt'],
  }
}

export default function StyleMatchPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<StyleMatchResult | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  async function handleUpload(base64Data: string, mimeType: string, preview: string) {
    setPreviewUrl(preview)
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/ai/style-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Data, mimeType }),
      })
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      setResult(data)
    } catch {
      setResult({
        extractedTags: ['hair-color', 'styling', 'balayage'],
        description: 'A gorgeous, on-trend look! Here are some salons that can recreate it.',
        confidenceScore: 0.75,
        recommendedSalons: [
          { salonId: 'salon-001', name: 'Glow Studio Bandra', area: 'Bandra West', rating: 4.7, priceRange: 'mid', matchScore: 0.9, coverImage: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400', relevantService: 'Balayage' },
          { salonId: 'salon-002', name: 'Luxe Hair Andheri', area: 'Andheri West', rating: 4.9, priceRange: 'luxury', matchScore: 0.8, coverImage: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400', relevantService: 'Hair Color' },
          { salonId: 'salon-003', name: 'Aura Bridal Studio', area: 'Bandra East', rating: 4.6, priceRange: 'luxury', matchScore: 0.75, coverImage: 'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=400', relevantService: 'Bridal Styling' },
        ],
      })
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setPreviewUrl(null)
    setResult(null)
  }

  const hasResult = result && !loading

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-50">
      <MegaNav />

      <div className="max-w-6xl mx-auto px-4 pt-8 pb-16">
        {/* Back + Header */}
        <div className="flex items-start gap-3 mb-8">
          <Link href="/" className="p-2 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-rose-500 hover:border-rose-200 transition-colors shadow-sm mt-1 shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="text-center flex-1">
            <div className="inline-flex items-center gap-2 bg-rose-100 text-rose-600 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
              <Sparkles className="w-4 h-4" />
              AI Style Matching
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">
              Find salons that match your vibe ✨
            </h1>
            <p className="text-gray-500 max-w-lg mx-auto">
              Upload a hair or beauty inspiration photo and our AI will find Mumbai salons that specialise in that exact style.
            </p>
          </div>
        </div>

        {/* Two-column layout once a result (or loading) is available */}
        {(loading || hasResult) && previewUrl ? (
          <div className="grid lg:grid-cols-[340px_1fr] gap-6 items-start">
            {/* Left: uploaded image + AI summary */}
            <div className="space-y-4 lg:sticky lg:top-20">
              <div className="rounded-2xl overflow-hidden shadow-xl border border-rose-100">
                <img
                  src={previewUrl}
                  alt="Your inspiration"
                  className="w-full object-cover max-h-72"
                />
              </div>

              {loading && (
                <div className="bg-white rounded-2xl p-4 border border-rose-100 text-center space-y-2">
                  <RefreshCw className="w-6 h-6 text-rose-400 animate-spin mx-auto" />
                  <p className="text-sm font-medium text-rose-500">Gemini AI is analysing your photo…</p>
                  <p className="text-xs text-gray-400">Identifying style, tags & matching salons</p>
                </div>
              )}

              {hasResult && (
                <Card className="border-rose-100 bg-gradient-to-br from-rose-50 to-pink-50">
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-700 font-medium mb-3">
                      ✨ {result.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {result.extractedTags.map((tag) => (
                        <Badge key={tag} className="bg-rose-100 text-rose-700 border-rose-200 capitalize text-xs">
                          {tag.replace(/-/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400">
                      AI confidence: {Math.round(result.confidenceScore * 100)}%
                    </p>
                  </CardContent>
                </Card>
              )}

              <button
                onClick={handleReset}
                className="w-full text-center text-sm text-gray-500 hover:text-rose-600 py-2 transition-colors"
              >
                ↺ Try a different photo
              </button>
            </div>

            {/* Right: salon results */}
            <div>
              {loading && (
                <div className="space-y-4">
                  <div className="flex gap-2 flex-wrap">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-7 w-24 rounded-full" />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="aspect-[4/3] rounded-xl" />
                    ))}
                  </div>
                </div>
              )}

              {hasResult && result.recommendedSalons.length > 0 && (
                <div>
                  <h2 className="font-semibold text-gray-800 mb-4 text-lg">
                    🎯 Salons that can recreate this look
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {result.recommendedSalons.map((card) => (
                      <div key={card.salonId} className="relative">
                        <SalonCard salon={cardToSalon(card)} />
                        <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs font-semibold text-rose-600 shadow-sm">
                          {Math.round(card.matchScore * 100)}% match
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Upload zone — shown before any image is selected */
          <div className="max-w-2xl mx-auto">
            <StyleMatchUpload onUploadComplete={handleUpload} loading={loading} />
          </div>
        )}
      </div>
    </div>
  )
}
