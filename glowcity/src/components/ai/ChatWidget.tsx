'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sparkles, X, Send, Star, MapPin } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import type { ChatMessage, SalonCard } from '@/types'

function SalonCardInline({ card }: { card: SalonCard }) {
  return (
    <Link href={`/salons/${card.salonId}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer mt-1">
        <CardContent className="p-3 flex gap-3 items-center">
          <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0">
            <Image src={card.coverImage || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=200'}
              alt={card.name} fill className="object-cover" sizes="48px" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-xs truncate">{card.name}</p>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <MapPin className="w-3 h-3" /><span>{card.area}</span>
              <Star className="w-3 h-3 fill-amber-400 stroke-amber-400 ml-1" />
              <span>{card.rating.toFixed(1)}</span>
            </div>
            <Badge variant="outline" className="text-xs mt-0.5 text-rose-600 border-rose-200">{card.relevantService}</Badge>
          </div>
          <span className="text-xs font-medium text-rose-500 shrink-0">View →</span>
        </CardContent>
      </Card>
    </Link>
  )
}

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Hi! I\'m Glow AI ✨ Tell me what beauty service you\'re looking for and I\'ll find the perfect Mumbai salon for you!', timestamp: Date.now() }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [salonResults, setSalonResults] = useState<Record<number, SalonCard[]>>({})
  const bottomRef = useRef<HTMLDivElement>(null)
  const sendTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')

    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: Date.now() }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionHistory: messages.slice(-10) }),
      })
      const data = await res.json()
      const assistantMsg: ChatMessage = { role: 'assistant', content: data.reply, timestamp: Date.now() }
      const newMessages = [...updatedMessages, assistantMsg]
      setMessages(newMessages)
      if (data.salonCards?.length > 0) {
        setSalonResults((prev) => ({ ...prev, [newMessages.length - 1]: data.salonCards }))
      }
      // Show AI badge if powered by Gemini
      if (data.poweredBy === 'gemini') {
        console.log('✨ Response powered by Gemini AI')
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again!', timestamp: Date.now() }])
    } finally {
      setLoading(false)
    }
  }

  function handleSend() {
    if (sendTimeoutRef.current) clearTimeout(sendTimeoutRef.current)
    sendTimeoutRef.current = setTimeout(send, 100)
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-rose-500 hover:bg-rose-600 rounded-full shadow-lg flex items-center justify-center text-white transition-all hover:scale-110"
        aria-label="Open Glow AI"
      >
        <Sparkles className="w-6 h-6" />
      </button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col"
            style={{ maxHeight: '70vh' }}
          >
            {/* Header */}
            <div className="bg-rose-500 rounded-t-2xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <Sparkles className="w-5 h-5" />
                <span className="font-semibold">Glow AI</span>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Mumbai Salons</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] ${msg.role === 'user' ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-800'} rounded-2xl px-3 py-2 text-sm`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {/* Salon cards below assistant messages */}
              {Object.entries(salonResults).map(([idx, cards]) => (
                <div key={idx} className="space-y-1">
                  {cards.map((c) => <SalonCardInline key={c.salonId} card={c} />)}
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl px-4 py-2 flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about salons, services…"
                className="flex-1 text-sm"
                disabled={loading}
              />
              <Button size="sm" onClick={handleSend} disabled={loading || !input.trim()} className="bg-rose-500 hover:bg-rose-600 shrink-0">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
