import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { searchSalonsByTags, getSalonsByArea, getAllSalons } from '@/lib/repositories/salonRepository'
import { MOCK_SALONS, isFirebaseConfigured } from '@/lib/mockData'
import { getGeminiGeneratedSalons } from '@/lib/geminiSalonData'
import { haversineKm, getAreaCoords, MUMBAI_AREA_COORDS } from '@/utils/geo'
import type { SearchFilters, Salon } from '@/types'

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')

// Nail sub-type → tag mappings
const NAIL_SUB_TYPE_TAGS: Record<string, string[]> = {
  'gel-nails':    ['gel-nails', 'gel'],
  'soft-gel':     ['soft-gel'],
  'hard-gel':     ['hard-gel'],
  'acrylic-nails':['acrylic-nails', 'acrylic'],
  'nail-art':     ['nail-art'],
  'manicure':     ['manicure'],
  'pedicure':     ['pedicure'],
  'chrome-nails': ['chrome-nails'],
  'ombre-nails':  ['ombre-nails'],
  'bridal-nails': ['bridal-nails'],
}

// Extract service keywords from a query string
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

/** Apply in-memory filters (price, category, nail sub-types, tags, area) */
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

/** Get all salons (Firestore → Gemini → MOCK fallback) */
async function fetchAllSalons(): Promise<Salon[]> {
  if (isFirebaseConfigured()) {
    try {
      const fs = await getAllSalons(50)
      if (fs.length > 0) return fs
    } catch (err) {
      console.warn('Firestore getAllSalons failed, using Gemini fallback:', err)
    }
  }
  const gemini = await getGeminiGeneratedSalons()
  return gemini.length > 0 ? gemini : MOCK_SALONS
}

/** Sort salons by distance from a point, return with distance attached */
function sortByDistance(
  salons: Salon[],
  lat: number,
  lng: number
): Salon[] {
  return [...salons].sort((a, b) => {
    const da = haversineKm(lat, lng, a.coordinates.latitude, a.coordinates.longitude)
    const db = haversineKm(lat, lng, b.coordinates.latitude, b.coordinates.longitude)
    return da - db
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      query: searchQuery = '',
      filters = {} as SearchFilters,
      userLocation,
    } = body
    const city = filters.city ?? 'Mumbai'

    // ── 1. GPS location provided → sort all salons by real distance ──────────
    if (userLocation?.latitude && userLocation?.longitude) {
      let all = await fetchAllSalons()
      all = applyFilters(all, filters)
      all = sortByDistance(all, userLocation.latitude, userLocation.longitude)
      return NextResponse.json({ items: all, total: all.length, hasMore: false })
    }

    // ── 2. Area name typed in search bar → geocode → distance sort ───────────
    const areaCoords = searchQuery ? getAreaCoords(searchQuery) : null
    if (areaCoords) {
      let all = await fetchAllSalons()
      // Also filter: salons in the matched area should appear first,
      // but show all sorted by distance from area centre
      all = applyFilters(all, filters)
      all = sortByDistance(all, areaCoords.latitude, areaCoords.longitude)
      return NextResponse.json({ items: all, total: all.length, hasMore: false })
    }

    // ── 3. filters.area set (from SearchBar suggestion click) ────────────────
    if (filters.area) {
      const lower = filters.area.toLowerCase()
      const coords =
        MUMBAI_AREA_COORDS[lower] ??
        getAreaCoords(lower) ??
        null

      let all = await fetchAllSalons()
      all = applyFilters(all, filters)

      if (coords) {
        all = sortByDistance(all, coords.latitude, coords.longitude)
      } else {
        // Area not in our map — substring match on area field
        const areaMatches = all.filter((s) =>
          s.area.toLowerCase().includes(lower)
        )
        if (areaMatches.length > 0) all = areaMatches
        all = all.sort((a, b) => b.rating - a.rating)
      }
      return NextResponse.json({ items: all, total: all.length, hasMore: false })
    }

    // ── 4. Nail sub-type filter with no text query ────────────────────────────
    if (!searchQuery && filters.nailSubTypes?.length) {
      const nailTags = filters.nailSubTypes.flatMap((t: string) => NAIL_SUB_TYPE_TAGS[t] ?? [t])
      let salons = isFirebaseConfigured()
        ? await searchSalonsByTags(nailTags, city)
        : (await getGeminiGeneratedSalons().catch(() => [])).filter(
            (s) => s.city === city && nailTags.some((tag: string) => s.tags.includes(tag))
          )
      if (salons.length === 0) {
        const fb = await searchSalonsByTags(['nails', 'gel-nails', 'manicure', 'nail-art'], city)
        salons = fb
      }
      salons = applyFilters(salons, filters).sort((a, b) => b.rating - a.rating)
      return NextResponse.json({ items: salons, total: salons.length, hasMore: false })
    }

    // ── 5. Text search: Gemini tag extraction → repo search ──────────────────
    let salons: Salon[] = []

    if (searchQuery && process.env.GEMINI_API_KEY) {
      try {
        const model = genai.getGenerativeModel({ model: 'gemini-1.5-flash' })
        const prompt = `Extract 3-5 beauty salon service tags from: "${searchQuery}".
Return ONLY a JSON array. Example: ["balayage","hair-color"].
Tags: hair,hair-color,balayage,keratin,bridal,makeup,nails,gel-nails,soft-gel,hard-gel,acrylic-nails,nail-art,skin,facial,waxing,threading,grooming,beard,haircut,spa,massage,extensions,ombre,highlights,mehendi,cleanup,manicure,pedicure,chrome-nails,ombre-nails,bridal-nails,curly-hair,luxury`
        const result = await model.generateContent(prompt)
        const text = result.response.text().trim()
        const match = text.match(/\[[\s\S]*?\]/)
        if (match) {
          const aiTags: string[] = JSON.parse(match[0])
          if (aiTags.length > 0) {
            salons = await searchSalonsByTags(aiTags, city)
          }
        }
      } catch { /* fall through */ }
    }

    // Keyword fallback
    if (salons.length === 0) {
      const tags = extractKeywords(searchQuery)
      if (tags.length > 0) {
        salons = await searchSalonsByTags(tags, city)
      }
    }

    // Area / city fallback — returns all salons sorted by rating
    if (salons.length === 0) {
      const result = await getSalonsByArea(city, filters.area, filters, { limit: 20 })
      salons = result.items
    }

    salons = applyFilters(salons, filters)
    salons = salons.sort((a, b) => b.rating - a.rating)

    return NextResponse.json({ items: salons, total: salons.length, hasMore: false })
  } catch (err) {
    console.error('embed-search error:', err)
    return NextResponse.json({ items: [], total: 0, hasMore: false }, { status: 500 })
  }
}
