import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import type { StyleMatchResult, SalonCard } from '@/types'

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')

async function fetchImageAsBase64(url: string): Promise<{ data: string; mimeType: string }> {
  const res = await fetch(url)
  const buffer = await res.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')
  const mimeType = res.headers.get('content-type') ?? 'image/jpeg'
  return { data: base64, mimeType }
}

export async function POST(req: NextRequest) {
  try {
    const { imageUrl } = await req.json()
    if (!imageUrl) return NextResponse.json({ error: 'imageUrl required' }, { status: 400 })

    // Get optional auth
    let userId: string | undefined
    const authHeader = req.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const decoded = await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1])
        userId = decoded.uid
      } catch { /* anonymous */ }
    }

    let tags: string[] = []
    let description = 'A beautiful style'
    let confidence = 0.7

    if (process.env.GEMINI_API_KEY) {
      try {
        const model = genai.getGenerativeModel({ model: 'gemini-1.5-flash' })
        const imageData = await fetchImageAsBase64(imageUrl)
        const prompt = `Analyze this hair or beauty inspiration image and return a JSON object with:
{
  "tags": ["up to 8 specific style descriptors like balayage, curtain-bangs, warm-tones, soft-waves, ombre, keratin, bridal"],
  "description": "one friendly sentence describing the look",
  "confidence": 0.0 to 1.0
}
Only return valid JSON.`
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData: { data: imageData.data, mimeType: imageData.mimeType } }] }],
          generationConfig: { responseMimeType: 'application/json' },
        })
        const parsed = JSON.parse(result.response.text())
        tags = parsed.tags ?? []
        description = parsed.description ?? description
        confidence = parsed.confidence ?? confidence
      } catch { tags = ['hair', 'styling'] }
    } else {
      tags = ['hair-color', 'balayage']
    }

    // Query Firestore salons by tags
    let salonCards: SalonCard[] = []
    try {
      const snap = await adminDb.collection('salons')
        .where('tags', 'array-contains-any', tags.slice(0, 3))
        .where('city', '==', 'Mumbai')
        .orderBy('rating', 'desc')
        .limit(5)
        .get()

      salonCards = snap.docs.map((doc) => {
        const d = doc.data()
        const overlap = (d.tags as string[]).filter((t: string) => tags.includes(t)).length
        return {
          salonId: doc.id,
          name: d.name,
          area: d.area,
          rating: d.rating,
          priceRange: d.priceRange,
          matchScore: tags.length > 0 ? overlap / tags.length : 0.5,
          coverImage: d.coverImage,
          relevantService: tags[0] ?? 'styling',
        } as SalonCard
      }).sort((a, b) => b.matchScore - a.matchScore)
    } catch { /* empty */ }

    // Persist to user profile if authenticated
    if (userId) {
      try {
        const { FieldValue } = await import('firebase-admin/firestore')
        await adminDb.doc(`users/${userId}`).update({
          'stylePreferences.extractedTags': tags,
          'stylePreferences.inspirationImageUrls': FieldValue.arrayUnion(imageUrl),
          'stylePreferences.lastUpdated': new Date(),
        })
      } catch { /* ignore */ }
    }

    const result: StyleMatchResult = { extractedTags: tags, recommendedSalons: salonCards, confidenceScore: confidence, description }
    return NextResponse.json(result)
  } catch (err) {
    console.error('style-match error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
