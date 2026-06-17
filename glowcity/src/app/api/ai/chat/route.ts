import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { searchSalonsByTags, getTopRatedSalons } from '@/lib/repositories/salonRepository'
import type { ChatMessage, SalonCard, BookingIntent } from '@/types'

const SYSTEM_PROMPT = `You are Glow AI, a friendly beauty booking assistant for GlowCity — Mumbai's premier salon marketplace.
Help users find salons and book appointments. Extract booking intent from messages.
Always respond in the same language as the user (English or Hindi/Hinglish).
Be warm, concise, and helpful. Suggest 2-3 specific salons when possible.

ALWAYS respond with valid JSON in this exact format (no markdown, no code blocks):
{"reply":"your friendly response here","intent":{"service":"service name or null","area":"Mumbai area or null","budget":null,"priceRange":"budget or mid or luxury or null"}}`

function extractJSON(text: string): { reply: string; intent: BookingIntent } | null {
  // Try direct parse first
  try { return JSON.parse(text) } catch { /* continue */ }
  // Try extracting JSON from markdown code blocks
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/)
  if (match) {
    try { return JSON.parse(match[1] || match[0]) } catch { /* continue */ }
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const { message, sessionHistory = [] } = await req.json() as {
      message: string
      sessionHistory: ChatMessage[]
    }

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 })
    }

    let reply = ''
    let intent: BookingIntent = {}
    let salonCards: SalonCard[] = []
    let geminiSuccess = false

    const apiKey = process.env.GEMINI_API_KEY
    console.log('[chat] GEMINI_API_KEY present:', !!apiKey, '| message:', message.slice(0, 50))
    if (apiKey) {
      try {
        const genai = new GoogleGenerativeAI(apiKey)
        const model = genai.getGenerativeModel({
          model: 'gemini-1.5-flash',
          systemInstruction: SYSTEM_PROMPT,
        })

        // Build conversation history
        const history = sessionHistory.slice(-6).map((m) => ({
          role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
          parts: [{ text: m.content }],
        }))

        const chat = model.startChat({ history })
        const result = await chat.sendMessage(message)
        const text = result.response.text().trim()

        const parsed = extractJSON(text)
        if (parsed) {
          reply = parsed.reply ?? ''
          intent = parsed.intent ?? {}
          geminiSuccess = true
        } else {
          // Gemini responded but not in JSON — use the text as the reply
          reply = text.replace(/```json|```/g, '').trim()
          geminiSuccess = true
        }
      } catch (err) {
        console.error('Gemini chat error:', err)
      }
    }

    if (!reply) {
      reply = geminiSuccess
        ? 'Let me find some great salons for you!'
        : 'Hi! I\'m Glow AI. Here are Mumbai\'s top salons right now:'
    }

    // Always fetch salons based on intent or query keywords
    const tags: string[] = []
    if (intent.service) {
      tags.push(intent.service.toLowerCase().replace(/\s+/g, '-'))
      // Add common variations
      const svc = intent.service.toLowerCase()
      if (svc.includes('hair color') || svc.includes('colour')) tags.push('hair-color')
      if (svc.includes('balayage')) tags.push('balayage')
      if (svc.includes('bridal')) tags.push('bridal')
      if (svc.includes('nail')) tags.push('nails')
      if (svc.includes('facial') || svc.includes('skin')) tags.push('facial')
      if (svc.includes('keratin')) tags.push('keratin')
    }

    // Also extract keywords from the raw message
    const msgLower = message.toLowerCase()
    const keywordMap: Record<string, string> = {
      'balayage': 'balayage', 'hair color': 'hair-color', 'haircut': 'haircut',
      'bridal': 'bridal', 'nail': 'nails', 'facial': 'facial', 'keratin': 'keratin',
      'makeup': 'makeup', 'waxing': 'waxing', 'threading': 'threading',
      'grooming': 'grooming', 'spa': 'spa', 'massage': 'massage',
    }
    for (const [kw, tag] of Object.entries(keywordMap)) {
      if (msgLower.includes(kw) && !tags.includes(tag)) tags.push(tag)
    }

    try {
      if (tags.length > 0) {
        const results = await searchSalonsByTags(tags, 'Mumbai')
        let filtered = results
        if (intent.area) {
          const areaLower = intent.area.toLowerCase()
          filtered = results.filter((s) =>
            s.area.toLowerCase().includes(areaLower) ||
            areaLower.includes(s.area.toLowerCase().split(' ')[0])
          )
        }
        if (intent.priceRange) {
          filtered = filtered.filter((s) => s.priceRange === intent.priceRange)
        }
        const salonsToUse = filtered.length > 0 ? filtered : results
        salonCards = salonsToUse.slice(0, 3).map((s) => ({
          salonId: s.id, name: s.name, area: s.area, rating: s.rating,
          priceRange: s.priceRange, matchScore: 0.9,
          coverImage: s.coverImage,
          relevantService: intent.service ?? s.services[0]?.name ?? tags[0] ?? '',
        }))
      }
    } catch (e) {
      console.error('Salon search error:', e)
    }

    // Fallback: always show top salons if nothing found
    if (salonCards.length === 0) {
      try {
        const top = await getTopRatedSalons('Mumbai', 3)
        salonCards = top.map((s) => ({
          salonId: s.id, name: s.name, area: s.area, rating: s.rating,
          priceRange: s.priceRange, matchScore: 0.7,
          coverImage: s.coverImage, relevantService: s.services[0]?.name ?? '',
        }))
      } catch { /* empty */ }
    }

    return NextResponse.json({ reply, salonCards, intent, poweredBy: geminiSuccess ? 'gemini' : 'fallback' })
  } catch (err) {
    console.error('AI chat error:', err)
    return NextResponse.json({
      reply: 'Hi! Here are Mumbai\'s top salons for you:',
      salonCards: [],
      intent: {},
    })
  }
}
