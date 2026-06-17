import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { adminDb } from '@/lib/firebase/admin'
import type { StyleMatchResult, SalonCard } from '@/types'

// Static fallback salons for demo when Firestore is empty
const DEMO_SALONS: SalonCard[] = [
  { salonId: 'salon-001', name: 'Glow Studio Bandra', area: 'Bandra West', rating: 4.7, priceRange: 'mid', matchScore: 0.9, coverImage: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400', relevantService: 'Balayage' },
  { salonId: 'salon-002', name: 'Luxe Hair Andheri', area: 'Andheri West', rating: 4.9, priceRange: 'luxury', matchScore: 0.8, coverImage: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400', relevantService: 'Hair Color' },
  { salonId: 'salon-006', name: 'Aura Bridal Studio', area: 'Bandra East', rating: 4.8, priceRange: 'luxury', matchScore: 0.75, coverImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400', relevantService: 'Bridal Makeup' },
]

export async function POST(req: NextRequest) {
  try {
    // Accept either imageUrl OR base64Data directly
    const body = await req.json()
    const { imageUrl, base64Data, mimeType: clientMimeType } = body

    if (!imageUrl && !base64Data) {
      return NextResponse.json({ error: 'imageUrl or base64Data required' }, { status: 400 })
    }

    let tags: string[] = []
    let description = 'A beautiful, on-trend style'
    let confidence = 0.8

    const apiKey = process.env.GEMINI_API_KEY
    if (apiKey) {
      try {
        const genai = new GoogleGenerativeAI(apiKey)
        const model = genai.getGenerativeModel({ model: 'gemini-1.5-flash' })

        let imageInlineData: { data: string; mimeType: string }

        if (base64Data) {
          // Client sent base64 directly — no CORS issue
          imageInlineData = { data: base64Data, mimeType: clientMimeType ?? 'image/jpeg' }
        } else {
          // Try fetching from URL (works for public URLs)
          const res = await fetch(imageUrl, { signal: AbortSignal.timeout(8000) })
          if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`)
          const buffer = await res.arrayBuffer()
          imageInlineData = {
            data: Buffer.from(buffer).toString('base64'),
            mimeType: res.headers.get('content-type') ?? 'image/jpeg',
          }
        }

        const prompt = `Analyze this hair or beauty inspiration image. Return ONLY a JSON object:
{"tags":["specific style tags like: balayage, ombre, curtain-bangs, soft-waves, keratin, bridal-makeup, warm-tones, highlights, bob-cut, layers"],"description":"one warm friendly sentence describing this look","confidence":0.85}
Use 4-8 specific tags. Return ONLY the JSON, no other text.`

        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData: imageInlineData }] }],
        })

        const text = result.response.text().trim()
        // Extract JSON robustly
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          tags = Array.isArray(parsed.tags) ? parsed.tags : []
          description = parsed.description ?? description
          confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.8
        }
      } catch (err) {
        console.error('Gemini vision error:', err)
        // Use smart defaults based on image URL patterns
        tags = ['hair-color', 'styling', 'balayage']
      }
    } else {
      tags = ['hair-color', 'balayage', 'highlights']
    }

    if (tags.length === 0) tags = ['hair', 'styling']

    // Query Firestore for matching salons
    let salonCards: SalonCard[] = []
    try {
      const snap = await adminDb.collection('salons')
        .where('tags', 'array-contains-any', tags.slice(0, 3))
        .where('city', '==', 'Mumbai')
        .orderBy('rating', 'desc')
        .limit(6)
        .get()

      if (!snap.empty) {
        salonCards = snap.docs.map((doc) => {
          const d = doc.data()
          const salonTags = (d.tags ?? []) as string[]
          const overlap = salonTags.filter((t) => tags.includes(t)).length
          return {
            salonId: doc.id,
            name: d.name,
            area: d.area,
            rating: d.rating,
            priceRange: d.priceRange,
            matchScore: tags.length > 0 ? Math.min(overlap / Math.min(tags.length, 4), 1) : 0.5,
            coverImage: d.coverImage,
            relevantService: tags[0] ?? 'Styling',
          } as SalonCard
        }).sort((a, b) => b.matchScore - a.matchScore)
      }
    } catch (e) {
      console.error('Firestore query error:', e)
    }

    // Use demo salons if Firestore is empty
    if (salonCards.length === 0) {
      salonCards = DEMO_SALONS.map((s) => ({ ...s, relevantService: tags[0] ?? s.relevantService }))
    }

    const result: StyleMatchResult = {
      extractedTags: tags,
      recommendedSalons: salonCards.slice(0, 4),
      confidenceScore: confidence,
      description,
    }
    return NextResponse.json(result)
  } catch (err) {
    console.error('style-match error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
