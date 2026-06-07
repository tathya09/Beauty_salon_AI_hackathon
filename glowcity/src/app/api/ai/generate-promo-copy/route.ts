import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import type { PromotionType } from '@/types'

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const decoded = await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1])

    const { salonId, promotionType } = await req.json() as {
      salonId: string
      promotionType: PromotionType
    }

    // Verify caller is the salon owner
    const salonDoc = await adminDb.collection('salons').doc(salonId).get()
    if (!salonDoc.exists) {
      return NextResponse.json({ error: 'Salon not found' }, { status: 404 })
    }
    if (salonDoc.data()?.ownerId !== decoded.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const salon = salonDoc.data()!
    const servicesSnap = await adminDb.collection('salons').doc(salonId).collection('services').limit(5).get()
    const serviceNames = servicesSnap.docs.map((d) => d.data().name).join(', ')

    const platformInstructions: Record<PromotionType, string> = {
      instagram: 'Write an engaging Instagram caption (max 150 words) with emojis, line breaks, and a call-to-action. Include a "Book Now" message.',
      whatsapp: 'Write a friendly WhatsApp broadcast message (max 100 words) that feels personal and conversational. Include the salon name and a booking prompt.',
      website: 'Write a professional website hero tagline and description (max 80 words total) that highlights the salon\'s unique offerings.',
    }

    let copy = ''
    let hashtags: string[] = []

    if (process.env.GEMINI_API_KEY) {
      const model = genai.getGenerativeModel({ model: 'gemini-1.5-flash' })
      const prompt = `You are a marketing copywriter for Indian beauty salons.

Salon: ${salon.name}
Location: ${salon.area}, Mumbai
Services: ${serviceNames}
Rating: ${salon.rating}/5
Price Range: ${salon.priceRange}

${platformInstructions[promotionType]}

Return a JSON object: { "copy": "...", "hashtags": ["tag1", "tag2", ...] }
For instagram/whatsapp include 8-10 relevant hashtags. For website include 3-5.
Only return valid JSON.`

      try {
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 512 },
        })
        const parsed = JSON.parse(result.response.text())
        copy = parsed.copy ?? ''
        hashtags = parsed.hashtags ?? []
      } catch {
        copy = `✨ Visit ${salon.name} in ${salon.area}, Mumbai!\nExpert ${serviceNames}.\nBook your appointment today!`
        hashtags = ['#Mumbai', '#BeautySalon', '#GlowCity', `#${salon.area.replace(/\s/g, '')}`]
      }
    } else {
      copy = `✨ ${salon.name} — ${salon.area}'s top-rated beauty destination.\nServices: ${serviceNames}.\nBook now on GlowCity!`
      hashtags = ['#MumbaiSalon', '#GlowCity', '#BeautyMumbai']
    }

    return NextResponse.json({ copy, hashtags })
  } catch (err) {
    console.error('generate-promo-copy error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
