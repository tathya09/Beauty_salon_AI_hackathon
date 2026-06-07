import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { searchSalonsByTags, getSalonsByArea } from '@/lib/repositories/salonRepository'
import type { SearchFilters, Salon } from '@/types'

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')

// Extract keywords from query for tag-based fallback search
function extractKeywords(q: string): string[] {
  const KNOWN_TAGS = [
    'hair', 'hair-color', 'balayage', 'keratin', 'bridal', 'makeup', 'nails',
    'gel-nails', 'nail-art', 'skin', 'facial', 'waxing', 'threading', 'grooming',
    'beard', 'haircut', 'spa', 'massage', 'extensions', 'ombre', 'highlights',
    'mehendi', 'cleanup', 'manicure', 'pedicure',
  ]
  const lower = q.toLowerCase()
  return KNOWN_TAGS.filter((tag) => lower.includes(tag.replace('-', ' ')) || lower.includes(tag))
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { query: searchQuery = '', filters = {} as SearchFilters } = body
    const city = filters.city ?? 'Mumbai'

    let salons: Salon[] = []

    // Try Gemini-assisted keyword extraction first
    if (searchQuery && process.env.GEMINI_API_KEY) {
      try {
        const model = genai.getGenerativeModel({ model: 'gemini-1.5-flash' })
        const prompt = `Extract 3-5 beauty salon service tags from this query: "${searchQuery}". 
Return ONLY a JSON array of lowercase tags. Example: ["balayage","hair-color","bridal"].
Use tags from this list: hair, hair-color, balayage, keratin, bridal, makeup, nails, gel-nails, nail-art, skin, facial, waxing, threading, grooming, beard, haircut, spa, massage, extensions, ombre, highlights, mehendi, cleanup, manicure, pedicure, curly-hair, luxury.`

        const result = await model.generateContent(prompt)
        const text = result.response.text().trim()
        const jsonMatch = text.match(/\[[\s\S]*?\]/)  
        if (jsonMatch) {
          const aiTags: string[] = JSON.parse(jsonMatch[0])
          if (aiTags.length > 0) {
            salons = await searchSalonsByTags(aiTags, city)
          }
        }
      } catch {
        // Fall through to keyword fallback
      }
    }

    // Fallback: keyword-based tag extraction
    if (salons.length === 0) {
      const tags = extractKeywords(searchQuery)
      if (tags.length > 0) {
        salons = await searchSalonsByTags(tags, city)
      }
    }

    // Final fallback: area/city filter
    if (salons.length === 0) {
      const result = await getSalonsByArea(city, filters.area, filters, { limit: 12 })
      salons = result.items
    }

    // Apply client-side price range filter if needed
    if (filters.priceRange?.length) {
      salons = salons.filter((s) => filters.priceRange!.includes(s.priceRange))
    }

    return NextResponse.json({ items: salons, total: salons.length, hasMore: false })
  } catch (err) {
    console.error('embed-search error:', err)
    return NextResponse.json({ items: [], total: 0, hasMore: false }, { status: 500 })
  }
}
