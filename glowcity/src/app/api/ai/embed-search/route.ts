import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { searchSalonsByTags, getSalonsByArea, getAllSalons } from '@/lib/repositories/salonRepository'
import { MOCK_SALONS, isFirebaseConfigured } from '@/lib/mockData'
import { haversineKm } from '@/utils/geo'
import type { SearchFilters, Salon } from '@/types'

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')

// Nail sub-type → tag mappings for search
const NAIL_SUB_TYPE_TAGS: Record<string, string[]> = {
  'gel-nails': ['gel-nails', 'gel'],
  'soft-gel': ['soft-gel'],
  'hard-gel': ['hard-gel'],
  'acrylic-nails': ['acrylic-nails', 'acrylic'],
  'nail-art': ['nail-art'],
  'manicure': ['manicure'],
  'pedicure': ['pedicure'],
  'chrome-nails': ['chrome-nails'],
  'ombre-nails': ['ombre-nails'],
  'bridal-nails': ['bridal-nails'],
}

// Extract keywords from query for tag-based fallback search
function extractKeywords(q: string): string[] {
  const KNOWN_TAGS = [
    'hair', 'hair-color', 'balayage', 'keratin', 'bridal', 'makeup', 'nails',
    'gel-nails', 'soft-gel', 'hard-gel', 'acrylic-nails', 'nail-art', 'skin',
    'facial', 'waxing', 'threading', 'grooming', 'beard', 'haircut', 'spa',
    'massage', 'extensions', 'ombre', 'highlights', 'mehendi', 'cleanup',
    'manicure', 'pedicure', 'chrome-nails', 'ombre-nails', 'bridal-nails',
    'curly-hair', 'luxury',
  ]
  const lower = q.toLowerCase()
  return KNOWN_TAGS.filter((tag) => lower.includes(tag.replace(/-/g, ' ')) || lower.includes(tag))
}

/** Apply all in-memory filters (price, category, nail sub-types, tags) */
function applyFilters(salons: Salon[], filters: SearchFilters): Salon[] {
  let result = salons

  if (filters.priceRange?.length) {
    result = result.filter((s) => filters.priceRange!.includes(s.priceRange))
  }

  if (filters.categories?.length) {
    result = result.filter((s) =>
      s.services.some((sv) => filters.categories!.includes(sv.category)) ||
      filters.categories!.some((cat) => s.tags.includes(cat))
    )
  }

  if (filters.nailSubTypes?.length) {
    // Build tag list from nail sub-type selections
    const nailTags = filters.nailSubTypes.flatMap((t) => NAIL_SUB_TYPE_TAGS[t] ?? [t])
    result = result.filter((s) => nailTags.some((tag) => s.tags.includes(tag)))
  }

  if (filters.tags?.length) {
    result = result.filter((s) => filters.tags!.some((t) => s.tags.includes(t)))
  }

  if (filters.minRating) {
    result = result.filter((s) => s.rating >= filters.minRating!)
  }

  return result
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { query: searchQuery = '', filters = {} as SearchFilters, userLocation } = body
    const city = filters.city ?? 'Mumbai'

    // ── When user location is provided: fetch ALL salons, sort by distance ──
    if (userLocation?.latitude && userLocation?.longitude) {
      // Get all salons regardless of city
      let all: Salon[] = isFirebaseConfigured()
        ? await getAllSalons(50)
        : MOCK_SALONS

      // Apply tag/category filters if any
      all = applyFilters(all, filters)

      // Sort by real distance
      all = all.sort((a, b) => {
        const da = haversineKm(userLocation.latitude, userLocation.longitude, a.coordinates.latitude, a.coordinates.longitude)
        const db = haversineKm(userLocation.latitude, userLocation.longitude, b.coordinates.latitude, b.coordinates.longitude)
        return da - db
      })

      return NextResponse.json({ items: all, total: all.length, hasMore: false })
    }

    // If nailSubTypes are set but no text query, skip straight to tag-based search
    if (!searchQuery && filters.nailSubTypes?.length) {
      const nailTags = filters.nailSubTypes.flatMap((t: string) => NAIL_SUB_TYPE_TAGS[t] ?? [t])
      let salons = isFirebaseConfigured()
        ? await searchSalonsByTags(nailTags, city)
        : MOCK_SALONS.filter((s) => s.city === city && nailTags.some((t) => s.tags.includes(t)))
      salons = applyFilters(salons, filters)
      // If nail filter returns nothing, show all nail salons
      if (salons.length === 0) {
        const fallback = isFirebaseConfigured()
          ? await searchSalonsByTags(['nails', 'gel-nails', 'manicure', 'nail-art'], city)
          : MOCK_SALONS.filter((s) => s.city === city && s.services.some((sv) => sv.category === 'nails'))
        salons = applyFilters(fallback, { ...filters, nailSubTypes: undefined })
      }
      return NextResponse.json({ items: salons, total: salons.length, hasMore: false })
    }

    let salons: Salon[] = []

    // Try Gemini-assisted keyword extraction first
    if (searchQuery && process.env.GEMINI_API_KEY) {
      try {
        const model = genai.getGenerativeModel({ model: 'gemini-1.5-flash' })
        const prompt = `Extract 3-5 beauty salon service tags from this query: "${searchQuery}". 
Return ONLY a JSON array of lowercase tags. Example: ["balayage","hair-color","bridal"].
Use tags from this list: hair, hair-color, balayage, keratin, bridal, makeup, nails, gel-nails, soft-gel, hard-gel, acrylic-nails, nail-art, skin, facial, waxing, threading, grooming, beard, haircut, spa, massage, extensions, ombre, highlights, mehendi, cleanup, manicure, pedicure, chrome-nails, ombre-nails, bridal-nails, curly-hair, luxury.`

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
      const result = await getSalonsByArea(city, filters.area, filters, { limit: 20 })
      salons = result.items
    }

    // Apply all in-memory filters
    salons = applyFilters(salons, filters)

    return NextResponse.json({ items: salons, total: salons.length, hasMore: false })
  } catch (err) {
    console.error('embed-search error:', err)
    return NextResponse.json({ items: [], total: 0, hasMore: false }, { status: 500 })
  }
}
