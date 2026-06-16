import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')

const SYSTEM_PROMPT = `You are a professional beauty consultant AI with expertise in dermatology, ayurveda, and cosmetic treatments. 
Analyse the provided face/skin photo and return a JSON object ONLY (no markdown, no extra text) in exactly this format:

{
  "skinType": "string (e.g. Dry, Oily, Combination, Normal, Sensitive)",
  "concerns": ["array of visible concerns like acne, pigmentation, dullness, dark circles, uneven tone, etc."],
  "overallScore": number between 1-10,
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

Be specific, helpful, and accurate. Base analysis on visible skin characteristics only.`

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, preferredType } = await req.json()

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    if (!process.env.GEMINI_API_KEY) {
      // Return mock result if no API key
      return NextResponse.json(getMockResult())
    }

    const model = genai.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = preferredType
      ? `${SYSTEM_PROMPT}\n\nThe user prefers ${preferredType} treatments — emphasize that approach in your recommendations, but still provide all 4 types.`
      : SYSTEM_PROMPT

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBase64,
        },
      },
    ])

    const text = result.response.text().trim()

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Invalid response format')

    const analysis = JSON.parse(jsonMatch[0])
    return NextResponse.json(analysis)
  } catch (err) {
    console.error('Face analyst error:', err)
    // Return graceful mock on error
    return NextResponse.json(getMockResult())
  }
}

function getMockResult() {
  return {
    skinType: 'Combination',
    concerns: ['Mild dehydration', 'Uneven skin tone', 'T-zone oiliness'],
    overallScore: 7,
    glowTip: 'Use a gentle hydrating serum daily and apply SPF 30+ every morning for a natural glow.',
    recommendations: [
      {
        type: 'natural',
        label: 'Natural Treatments',
        reason: 'Your combination skin will benefit from gentle plant-based ingredients that balance oil without stripping moisture.',
        services: ['Rose Water Facial', 'Aloe Vera Cleanup', 'Herbal Hair Mask', 'Cucumber Eye Treatment'],
      },
      {
        type: 'ayurvedic',
        label: 'Ayurvedic Treatments',
        reason: 'Ayurvedic herbs like turmeric and sandalwood can help balance your Pitta-Vata combination skin.',
        services: ['Kumkumadi Facial', 'Neem & Turmeric Cleanup', 'Brahmi Hair Spa', 'Ubtan Body Polish'],
      },
      {
        type: 'chemical',
        label: 'Advanced Chemical Treatments',
        reason: 'Mild AHA/BHA treatments can address uneven tone and T-zone oiliness effectively.',
        services: ['AHA Glow Facial', 'Salicylic Acid Cleanup', 'Vitamin C Brightening Treatment', 'Keratin Smoothing'],
      },
      {
        type: 'dermat',
        label: 'Dermatologist-Recommended',
        reason: 'Clinical treatments can provide long-lasting results for your combination skin concerns.',
        services: ['HydraFacial MD', 'Medical-Grade Chemical Peel', 'LED Light Therapy', 'Microdermabrasion'],
      },
    ],
  }
}
