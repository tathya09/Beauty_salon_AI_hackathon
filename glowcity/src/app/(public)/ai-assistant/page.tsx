'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Send, Star, MapPin, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import type { ChatMessage, SalonCard } from '@/types'

function SalonCardInline({ card }: { card: SalonCard }) {
  return (
    <Link href={`/salons/${card.salonId}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-3 flex gap-3 items-center">
          <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0">
            <Image src={card.coverImage || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=200'}
              alt={card.name} fill className="object-cover" sizes="56px" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{card.name}</p>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
              <MapPin className="w-3 h-3" /><span>{card.area}</span>
              <Star className="w-3 h-3 fill-amber-400 stroke-amber-400 ml-1" />
              <span>{card.rating.toFixed(1)}</span>
            </div>
            <Badge variant="outline" className="text-xs mt-1 text-rose-600 border-rose-200">{card.relevantService}</Badge>
          </div>
          <Button size="sm" className="bg-rose-500 hover:bg-rose-600 text-xs shrink-0">Book</Button>
        </CardContent>
      </Card>
    </Link>
  )
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Hi! I\'m Glow AI ✨\n\nTell me what you\'re looking for — a bridal makeup artist in Andheri, balayage near Bandra, or a quick cleanup under ₹500 — and I\'ll find the perfect Mumbai salon for you!', timestamp: Date.now() }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [salonResults, setSalonResults] = useState<Record<number, SalonCard[]>>({})
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: Date.now() }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setLoading(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionHistory: messages.slice(-10) }),
      })
      const data = await res.json()
      const aMsg: ChatMessage = { role: 'assistant', content: data.reply, timestamp: Date.now() }
      const newMsgs = [...updated, aMsg]
      setMessages(newMsgs)
      if (data.salonCards?.length > 0) {
        setSalonResults((prev) => ({ ...prev, [newMsgs.length - 1]: data.salonCards }))
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again!', timestamp: Date.now() }])
    } finally {
      setLoading(false)
    }
  }

  const SUGGESTIONS = ['Bridal makeup in Andheri', 'Balayage under ₹4000', 'Keratin near Bandra', 'Nail art Colaba']

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 flex flex-col">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-gray-500 hover:text-gray-700"><ArrowLeft className="w-5 h-5" /></Link>
        <Sparkles className="w-5 h-5 text-rose-500" />
        <div>
          <h1 className="font-bold text-gray-900">Glow AI</h1>
          <p className="text-xs text-gray-500">Your Mumbai beauty assistant</p>
        </div>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 flex flex-col gap-4 overflow-y-auto">
        {messages.map((msg, i) => (
          <div key={i}>
            <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-line ${msg.role === 'user' ? 'bg-rose-500 text-white' : 'bg-white text-gray-800 shadow-sm border'}`}>
                {msg.content}
              </div>
            </div>
            {salonResults[i] && (
              <div className="mt-2 space-y-2 max-w-[85%]">
                {salonResults[i].map((c) => <SalonCardInline key={c.salonId} card={c} />)}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl px-4 py-3 flex gap-1 shadow-sm border">
              <span className="w-2 h-2 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="bg-white border-t px-4 py-3 max-w-2xl mx-auto w-full">
        <div className="flex flex-wrap gap-2 mb-3">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => { setInput(s) }} className="text-xs bg-rose-50 text-rose-600 border border-rose-200 rounded-full px-3 py-1 hover:bg-rose-100">{s}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Ask me anything about Mumbai salons…" disabled={loading} className="flex-1" />
          <Button onClick={send} disabled={loading || !input.trim()} className="bg-rose-500 hover:bg-rose-600">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
