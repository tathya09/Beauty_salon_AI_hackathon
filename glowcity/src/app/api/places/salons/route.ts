/**
 * /api/places/salons
 * Fetches real beauty salons from Google Places Text Search (New) API.
 * Falls back gracefully when the API key is missing.
 *
 * POST body:
 *   { query: string, location?: { lat: number, lng: number }, radius?: number }
 *
 * Returns:
 *   { items: Salon[], source: 'google' | 'unavailable' }
 */
import { NextRequest, NextResponse } from 'next/server'
import type { Salon, Service } from '@/types'

const PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY ?? ''

// Google Places Text Search (New) — POST endpoint
const PLACES_TEXT_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText'

// Field mask — only request the fields we actually use (reduces billing)
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.photos',
  'places.types',
  'places.businessStatus',
  'places.regularOpeningHours',
].join(',')

// ── Price level → PriceRange mapping ─────────────────────────
function mapPriceLevel(level: number | undefined): Salon['priceRange'] {
  if (!level || level <= 1) return 'budget'
  if (level === 2) return 'mid'
  return 'luxury'
}

// ── Derive tags from Google place types ──────────────────────
function deriveTags(types: string[], name: string): string[] {
  const tags = new Set<string>()
  const lower = name.toLowerCase()

  // From place types
  if (types.includes('beauty_salon') || types.includes('hair_salon')) tags.add('hair')
  if (types.includes('spa')) { tags.add('spa'); tags.add('massage') }
  if (types.includes('nail_salon')) { tags.add('nails'); tags.add('gel-nails'); tags.add('manicure') }
  if (types.includes('barber_shop')) { tags.add('grooming'); tags.add('haircut'); tags.add('beard') }

  // From name heuristics
  if (/hair/i.test(lower)) tags.add('hair')
  if (/nail|manicure|pedicure/i.test(lower)) { tags.add('nails'); tags.add('manicure') }
  if (/bridal|bride|wedding/i.test(lower)) tags.add('bridal')
  if (/spa|relax|massage/i.test(lower)) { tags.add('spa'); tags.add('massage') }
  if (/groom|barber|men/i.test(lower)) { tags.add('grooming'); tags.add('beard') }
  if (/skin|glow|glow|facial|derma/i.test(lower)) { tags.add('skin'); tags.add('facial') }
  if (/color|colour|highlight|balayage|keratin/i.test(lower)) tags.add('hair-color')
  if (/kids|child|junior/i.test(lower)) tags.add('kids-haircut')

  // Default to hair + skin if nothing derived
  if (tags.size === 0) { tags.add('hair'); tags.add('skin') }

  return Array.from(tags)
}

// ── Build a representative service list from tags ────────────
function buildServices(tags: string[], salonId: string): Service[] {
  const services: Service[] = []
  let idx = 1

  const add = (name: string, category: Service['category'], duration: number, price: number, desc: string) => {
    services.push({ id: `${salonId}-svc-${idx++}`, name, category, duration, price, description: desc })
  }

  if (tags.includes('hair')) add('Haircut & Styling', 'hair', 45, 500, 'Professional haircut and blow-dry')
  if (tags.includes('hair-color')) add('Hair Colouring', 'hair', 90, 2000, 'Global colour or highlights')
  if (tags.includes('balayage')) add('Balayage', 'hair', 120, 3500, 'Sun-kissed balayage technique')
  if (tags.includes('keratin')) add('Keratin Treatment', 'hair', 90, 3500, 'Smoothing keratin treatment')
  if (tags.includes('manicure')) add('Gel Manicure', 'nails', 45, 800, 'Long-lasting gel polish')
  if (tags.includes('nails')) add('Nail Art', 'nails', 60, 600, 'Custom nail art designs')
  if (tags.includes('facial')) add('Hydra Facial', 'skin', 60, 1500, 'Deep cleansing hydra facial')
  if (tags.includes('skin')) add('Cleanup', 'skin', 45, 500, 'Basic skin cleanup')
  if (tags.includes('bridal')) add('Bridal Makeup', 'bridal', 180, 8000, 'Complete bridal look')
  if (tags.includes('spa')) add('Swedish Massage', 'spa', 60, 2000, 'Relaxing full-body massage')
  if (tags.includes('grooming')) add("Men's Haircut", 'grooming', 30, 350, "Professional men's cut")
  if (tags.includes('beard')) add('Beard Styling', 'grooming', 20, 200, 'Precision beard shaping')
  if (tags.includes('kids-haircut')) add("Kids' Haircut", 'hair', 30, 300, 'Fun & gentle kids cut')

  // Minimum 1 service
  if (services.length === 0) add('Beauty Treatment', 'skin', 60, 800, 'Signature beauty service')

  return services
}

// ── Photo URL helper ──────────────────────────────────────────
function getPhotoUrl(photos: Array<{ name: string }> | undefined): string {
  const FALLBACKS = [
    'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800',
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800',
    'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800',
    'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800',
    'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800',
  ]

  if (!photos?.length || !PLACES_API_KEY) {
    return FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)]
  }

  // Google Places Photo API (New)
  return `https://places.googleapis.com/v1/${photos[0].name}/media?maxWidthPx=800&key=${PLACES_API_KEY}`
}

// ── Address → area name ───────────────────────────────────────
function extractArea(address: string): string {
  // Try to pull a Mumbai suburb from the formatted address
  const KNOWN_AREAS = [
    'Bandra West', 'Bandra East', 'Andheri West', 'Andheri East', 'Juhu', 'Colaba',
    'Powai', 'Malad West', 'Malad East', 'Khar West', 'Versova', 'Dadar West',
    'Dadar East', 'Santacruz West', 'Santacruz East', 'Worli', 'Borivali', 'Goregaon',
    'Chembur', 'Thane', 'Navi Mumbai', 'Lower Parel', 'Kurla', 'Mulund',
    'Vile Parle', 'Kandivali', 'Ghatkopar', 'Wadala', 'Fort', 'Nariman Point',
    'Churchgate', 'Matunga', 'Sion', 'Vikhroli', 'Jogeshwari',
  ]
  for (const area of KNOWN_AREAS) {
    if (address.toLowerCase().includes(area.toLowerCase())) return area
  }
  // Fallback: use second comma-separated segment
  const parts = address.split(',')
  return parts[1]?.trim() ?? parts[0]?.trim() ?? 'Mumbai'
}

// ── Map Places result → Salon ─────────────────────────────────
interface PlaceResult {
  id: string
  displayName: { text: string }
  formattedAddress: string
  location: { latitude: number; longitude: number }
  rating?: number
  userRatingCount?: number
  priceLevel?: number
  photos?: Array<{ name: string }>
  types?: string[]
  businessStatus?: string
}

function placeToSalon(place: PlaceResult): Salon {
  const name = place.displayName?.text ?? 'Beauty Salon'
  const tags = deriveTags(place.types ?? [], name)
  const area = extractArea(place.formattedAddress ?? '')
  const salonId = `places-${place.id}`
  const now = { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as unknown as Salon['createdAt']

  return {
    id: salonId,
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    city: 'Mumbai',
    area,
    coordinates: {
      latitude: place.location?.latitude ?? 19.076,
      longitude: place.location?.longitude ?? 72.877,
    },
    coverImage: getPhotoUrl(place.photos),
    gallery: [],
    priceRange: mapPriceLevel(place.priceLevel),
    rating: Math.min(5, Math.max(3.5, place.rating ?? 4.0)),
    reviewCount: place.userRatingCount ?? 0,
    tags,
    services: buildServices(tags, salonId),
    isVerified: true,
    ownerId: 'google-places',
    openingHours: {},
    createdAt: now,
  }
}

export async function POST(req: NextRequest) {
  try {
    const { query = 'beauty salon', location, radius = 5000 } = await req.json()

    if (!PLACES_API_KEY) {
      return NextResponse.json(
        { items: [], source: 'unavailable', reason: 'GOOGLE_PLACES_API_KEY not configured' },
        { status: 200 }
      )
    }

    // Build request body for Places Text Search (New)
    const body: Record<string, unknown> = {
      textQuery: `${query} salon Mumbai India`,
      maxResultCount: 20,
      languageCode: 'en',
    }

    // Bias results toward a specific location if provided
    if (location?.lat && location?.lng) {
      body.locationBias = {
        circle: {
          center: { latitude: location.lat, longitude: location.lng },
          radius,
        },
      }
    } else {
      // Default: Mumbai city centre
      body.locationBias = {
        circle: {
          center: { latitude: 19.076, longitude: 72.877 },
          radius: 25000,
        },
      }
    }

    const response = await fetch(PLACES_TEXT_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': PLACES_API_KEY,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Places API error:', response.status, errText)
      return NextResponse.json(
        { items: [], source: 'unavailable', reason: `Places API ${response.status}` },
        { status: 200 }
      )
    }

    const data = await response.json()
    const places: PlaceResult[] = data.places ?? []

    // Filter out permanently closed places
    const active = places.filter((p) => p.businessStatus !== 'CLOSED_PERMANENTLY')
    const items = active.map(placeToSalon)

    return NextResponse.json({ items, source: 'google', total: items.length })
  } catch (err) {
    console.error('Places salons route error:', err)
    return NextResponse.json({ items: [], source: 'unavailable' }, { status: 200 })
  }
}
