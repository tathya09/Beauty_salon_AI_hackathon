import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')

// ── Prompts ────────────────────────────────────────────────────
function hairPrompt(colorName: string, hexColor: string) {
  return `You are an expert image editor. The user wants to preview "${colorName}" (hex ${hexColor}) hair color on the person in this photo.

Return a JSON object ONLY (no markdown, no extra text):
{
  "hairRegion": {
    "detected": true/false,
    "topPct": number 0-1 (top edge of hair as fraction of image height),
    "leftPct": number 0-1,
    "widthPct": number 0-1,
    "heightPct": number 0-1,
    "shape": "oval" | "irregular",
    "confidence": number 0-1
  },
  "colorBlend": {
    "mode": "multiply" | "overlay" | "screen",
    "alpha": number 0.3-0.7,
    "saturationBoost": number 0-0.5
  },
  "additionalStrands": [
    { "x": number 0-1, "y": number 0-1, "width": number 0-0.15, "height": number 0-0.3 }
  ],
  "note": "brief description of what was detected"
}

Analyse the actual photo carefully. Identify where the hair is (top and sides of head). Be precise with percentages based on what you see.`
}

function nailPrompt(colorName: string, hexColor: string) {
  return `You are an expert image editor. The user wants to preview "${colorName}" (hex ${hexColor}) nail color on the nails visible in this photo.

Return a JSON object ONLY (no markdown, no extra text):
{
  "nailsDetected": true/false,
  "hands": [
    {
      "side": "left" | "right" | "unknown",
      "nails": [
        {
          "finger": "thumb|index|middle|ring|pinky",
          "xPct": number 0-1,
          "yPct": number 0-1,
          "widthPct": number 0-0.15,
          "heightPct": number 0-0.1,
          "angleDeg": number -45 to 45
        }
      ]
    }
  ],
  "colorBlend": {
    "mode": "multiply" | "overlay",
    "alpha": number 0.5-0.85
  },
  "note": "brief description"
}

Analyse the actual photo carefully. Find any visible fingernails and return their precise positions as fractions of the image dimensions.`
}

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mode, colorName, hexColor } = await req.json()

    if (!imageBase64 || !mode || !hexColor) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!process.env.GEMINI_API_KEY) {
      // Return mock segmentation when no API key
      return NextResponse.json(getMockSegmentation(mode))
    }

    const model = genai.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const prompt = mode === 'hair' ? hairPrompt(colorName, hexColor) : nailPrompt(colorName, hexColor)

    const result = await model.generateContent([
      prompt,
      { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
    ])

    const text = result.response.text().trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Invalid response format')

    const segmentation = JSON.parse(jsonMatch[0])
    return NextResponse.json({ ok: true, segmentation })
  } catch (err) {
    console.error('Color try-on error:', err)
    return NextResponse.json({ ok: true, segmentation: getMockSegmentation('hair') })
  }
}

function getMockSegmentation(mode: string) {
  if (mode === 'hair') {
    return {
      hairRegion: {
        detected: true,
        topPct: 0.0,
        leftPct: 0.1,
        widthPct: 0.8,
        heightPct: 0.38,
        shape: 'oval',
        confidence: 0.75,
      },
      colorBlend: { mode: 'multiply', alpha: 0.5, saturationBoost: 0.2 },
      additionalStrands: [
        { x: 0.08, y: 0.2, width: 0.06, height: 0.3 },
        { x: 0.86, y: 0.2, width: 0.06, height: 0.3 },
      ],
      note: 'Mock hair region detected',
    }
  }
  return {
    nailsDetected: true,
    hands: [
      {
        side: 'right',
        nails: [
          { finger: 'index', xPct: 0.42, yPct: 0.72, widthPct: 0.04, heightPct: 0.05, angleDeg: 0 },
          { finger: 'middle', xPct: 0.48, yPct: 0.70, widthPct: 0.04, heightPct: 0.05, angleDeg: 0 },
          { finger: 'ring', xPct: 0.54, yPct: 0.72, widthPct: 0.04, heightPct: 0.05, angleDeg: 5 },
          { finger: 'pinky', xPct: 0.60, yPct: 0.74, widthPct: 0.03, heightPct: 0.04, angleDeg: 10 },
          { finger: 'thumb', xPct: 0.36, yPct: 0.76, widthPct: 0.04, heightPct: 0.05, angleDeg: -15 },
        ],
      },
    ],
    colorBlend: { mode: 'multiply', alpha: 0.75 },
    note: 'Mock nail positions detected',
  }
}
