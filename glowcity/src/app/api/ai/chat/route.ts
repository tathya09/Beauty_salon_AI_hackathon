import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { searchSalonsByTags, getTopRatedSalons } from '@/lib/repositories/salonRepository'
import type { ChatMessage, SalonCard, BookingIntent } from '@/types'

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')

const SYSTEM_PROMPT = `You are Glow AI, a friendly beauty booking assistant for GlowCity — Mumbai's premier salon marketplace.
Help users find salons and book appointments. Extract booking intent from messages.
Always respond in the same language as the user (English or Hindi/Hinglish).
Be warm, concise, and helpful. Suggest specific salons when possible.

Return a JSON object with this exact shape:
{
  "reply": "your friendly response here",
  "intent": {
    "service": "service name or null",
    "area": "Mumbai area or null",
    "budget": number or null,
    "priceRange": "budget|mid|luxury or null"
  }
}`

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

    if (process.env.GEMINI_API_KEY) {
      try {
        const model = genai.getGenerativeModel({ model: 'gemini-1.5-flash' })
        const history = sessionHistory.slice(-10).map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }))

        const chat = model.startChat({
          history,
          systemInstruction: SYSTEM_PROMPT,
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 1024 },
        })

        const result = await chat.sendMessage(message)
        const text = result.response.text()
        const parsed = JSON.parse(text)
        reply = parsed.reply ?? 'Let me help you find the perfect salon!'
        intent = parsed.intent ?? {}
      } catch {
        reply = "I'm having a moment — let me show you our top salons instead!"
      }
    } else {
      reply = 'Hi! Here are some top-rated Mumbai salons for you:'
    }

    // Fetch salons based on intent
    const tags: string[] = []
    if (intent.service) tags.push(intent.service.toLowerCase().replace(/\s+/g, '-'))
    if (intent.area) {
      try {
        const results = await searchSalonsByTags(tags.length ? tags : ['hair'], 'Mumbai')
        const filtered = intent.area
          ? results.filter((s) => s.area.toLowerCase().includes(intent.area!.toLowerCase()))
          : results
        salonCards = (filtered.length ? filtered : results).slice(0, 3).map((s) => ({
          salonId: s.id,
          name: s.name,
          area: s.area,
          rating: s.rating,
          priceRange: s.priceRange,
          matchScore: 0.9,
          coverImage: s.coverImage,
          relevantService: intent.service ?? s.services[0]?.name ?? '',
        }))
      } catch { /* fallback below */ }
    } else if (tags.length > 0) {
      try {
        const results = await searchSalonsByTags(tags, 'Mumbai')
        salonCards = results.slice(0, 3).map((s) => ({
          salonId: s.id, name: s.name, area: s.area, rating: s.rating,
          priceRange: s.priceRange, matchScore: 0.85,
          coverImage: s.coverImage, relevantService: intent.service ?? s.services[0]?.name ?? '',
        }))
      } catch { /* fallback below */ }
    }

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

    return NextResponse.json({ reply, salonCards, intent })
  } catch (err) {
    console.error('AI chat error:', err)
    return NextResponse.json({ reply: 'Sorry, something went wrong. Please try again!', salonCards: [], intent: {} })
  }
}
