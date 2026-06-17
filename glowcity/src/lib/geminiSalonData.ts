/**
 * Gemini-powered salon data generator.
 * Called when Firestore is empty — generates realistic Mumbai salon data via LLM.
 * Results are cached in memory for the process lifetime to avoid repeated API calls.
 */
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { Salon } from '@/types'

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')

let cachedSalons: Salon[] | null = null

const GEMINI_PROMPT = `Generate a dataset of 20 realistic beauty salons in Mumbai, India for a salon booking app called GlowCity.
Return a valid JSON array. Each salon object must follow this exact structure:

{
  "id": "salon-g-001",
  "name": "Salon name (creative, realistic Mumbai salon name)",
  "slug": "url-friendly-slug",
  "city": "Mumbai",
  "area": "One of: Bandra West, Andheri West, Juhu, Colaba, Powai, Bandra East, Versova, Malad West, Khar West, Dadar West, Santacruz West, Worli, Borivali, Goregaon, Chembur, Thane, Navi Mumbai, Lower Parel, Kurla, Mulund",
  "coordinates": { "latitude": <realistic lat for that area>, "longitude": <realistic lng for that area> },
  "coverImage": "https://images.unsplash.com/photo-<one of these IDs>?w=800",
  "gallery": [],
  "priceRange": "budget|mid|luxury",
  "rating": <4.0 to 5.0>,
  "reviewCount": <50 to 800>,
  "tags": ["2-6 relevant tags from: hair, hair-color, balayage, keratin, bridal, makeup, nails, gel-nails, soft-gel, hard-gel, acrylic-nails, nail-art, skin, facial, waxing, threading, grooming, beard, haircut, spa, massage, extensions, ombre, highlights, mehendi, cleanup, manicure, pedicure, chrome-nails, curly-hair, luxury, mens, womens"],
  "isVerified": true,
  "ownerId": "owner-001",
  "openingHours": {},
  "services": [
    {
      "id": "svc-g-001-1",
      "name": "Service name",
      "category": "hair|skin|nails|bridal|grooming|spa",
      "duration": <30 to 300 minutes>,
      "price": <realistic INR price>,
      "description": "Brief description"
    }
  ]
}

For coverImage use one of these Unsplash photo IDs (pick varied ones):
- 1560066984-138dadb4c035 (salon interior)
- 1522337360788-8b13dee7a37e (hair salon)
- 1487412947147-5cebf100ffc2 (beauty salon)
- 1604654894610-df63bc536371 (nail salon)
- 1503951914875-452162b0f3f1 (barber/grooming)
- 1519741497674-611481863552 (bridal)
- 1521590832167-7bcbfaa6381f (hair styling)
- 1540555700478-4be289fbecef (spa)
- 1562322140-8baeececf3df (hair color)
- 1559599101-f09722fb4948 (beauty treatment)

Each salon should have 3-5 services. Make the salons diverse — mix of hair, nail, skin, bridal, grooming, spa specialities. 
Include salons from different areas of Mumbai. Make names feel authentic and creative.
Return ONLY the JSON array, no markdown, no explanation.`

export async function getGeminiGeneratedSalons(): Promise<Salon[]> {
  // Return cached result if available
  if (cachedSalons && cachedSalons.length > 0) {
    return cachedSalons
  }

  if (!process.env.GEMINI_API_KEY) {
    return []
  }

  try {
    const model = genai.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: 8192,
      },
    })

    const result = await model.generateContent(GEMINI_PROMPT)
    const text = result.response.text().trim()

    // Parse JSON — handle potential markdown wrapping
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      console.error('Gemini response did not contain a JSON array')
      return []
    }

    const raw: Omit<Salon, 'createdAt'>[] = JSON.parse(jsonMatch[0])

    // Normalise: add a plain createdAt and ensure required fields
    // Using a plain object instead of Firestore Timestamp so this works server-side
    const now = { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as unknown as import('@/types').Salon['createdAt']
    const salons: Salon[] = raw.map((s, i) => ({
      ...s,
      id: s.id || `salon-g-${String(i + 1).padStart(3, '0')}`,
      city: 'Mumbai',
      isVerified: true,
      ownerId: s.ownerId || 'owner-001',
      openingHours: s.openingHours || {},
      gallery: s.gallery || [],
      createdAt: now,
    }))

    cachedSalons = salons
    console.log(`✅ Gemini generated ${salons.length} salons`)
    return salons
  } catch (err) {
    console.error('Gemini salon generation failed:', err)
    return []
  }
}

/** Invalidate cache (useful for development) */
export function clearSalonCache() {
  cachedSalons = null
}
