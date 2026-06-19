import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { randomMockResult } from '@/lib/skinMockPool'

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')

const SYSTEM_PROMPT = `You are a professional beauty consultant AI with expertise in dermatology, ayurveda, and cosmetic treatments. 
Analyse the provided face/skin photo and return a JSON object ONLY (no markdown, no extra text) in exactly this format:

{
  "skinType": "string (e.g. Dry, Oily, Combination, Normal, Sensitive)",
  "concerns": ["array of visible concerns like acne, pigmentation, dullness, dark circles, uneven tone, etc."],
  "overallScore": number between 1-10,
  "confidence": number between 0 and 1,
  "analysisSummary": "short explanation of the visible findings and why the score is reasonable",
  "glowTip": "one personalized tip for glowing skin",
  "recommendations": [
    {
      "type": "natural",
      "label": "Natural Treatments",
      "reason": "why natural approach suits this skin",
      "services": ["3-4 specific services like 'Rose Water Facial', 'Aloe Vera Cleanup', 'Herbal Hair Mask'"]
    },
    {
      "type": "ayurvedic", 
      "label": "Ayurvedic Treatments",
      "reason": "why ayurvedic approach suits this skin",
      "services": ["3-4 services like 'Kumkumadi Facial', 'Neem Cleanup', 'Brahmi Hair Spa'"]
    },
    {
      "type": "chemical",
      "label": "Advanced Chemical Treatments",
      "reason": "which chemical treatments would help",
      "services": ["3-4 services like 'AHA/BHA Peel', 'Vitamin C Serum Treatment', 'Keratin Smoothing'"]
    },
    {
      "type": "dermat",
      "label": "Dermatologist-Recommended",
      "reason": "clinical treatments that would benefit this skin",
      "services": ["3-4 services like 'HydraFacial MD', 'Medical-Grade Chemical Peel', 'LED Light Therapy'"]
    }
  ]
}

Be specific, helpful, and accurate. Base analysis on visible skin characteristics only.
Each "services" array must contain EXACTLY 4 uniquely named services — never repeat the same service name.
If image quality is poor, lower confidence and mention it in analysisSummary.`

export async function POST(req: NextRequest) {
  let preferredType: string | undefined
  try {
    const body = await req.json()
    const imageBase64: string | undefined = body.imageBase64
    preferredType = body.preferredType

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    // No API key → random mock (different every call)
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(randomMockResult(preferredType))
    }

    const model = genai.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = preferredType
      ? `${SYSTEM_PROMPT}\n\nThe user prefers ${preferredType} treatments — emphasize that approach in your recommendations, but still provide all 4 types.`
      : SYSTEM_PROMPT

    const result = await model.generateContent([
      prompt,
      { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
    ])

    const text = result.response.text().trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Invalid response format from Gemini')

    const analysis = JSON.parse(jsonMatch[0])
    return NextResponse.json(analysis)

  } catch (err) {
    console.error('Face analyst error:', err)
    // Always return a fresh random result on error — never the same one twice
    return NextResponse.json(randomMockResult(preferredType))
  }
}
