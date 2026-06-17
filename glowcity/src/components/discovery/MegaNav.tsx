'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronDown, Mic, MicOff, Sparkles, Camera, Brain, Leaf } from 'lucide-react'
import { useDiscoveryStore } from '@/store/discoveryStore'
import type { ServiceCategory } from '@/types'

type SpeechRecognizerInstance = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onstart: (() => void) | null
  onend: (() => void) | null
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  start: () => void
  stop: () => void
}

type SpeechRecognizerConstructor = new () => SpeechRecognizerInstance

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognizerConstructor
    SpeechRecognition?: SpeechRecognizerConstructor
  }
}

// ── Service mega-menu data ──────────────────────────────────────
const SERVICES_MENU = [
  {
    category: 'hair' as ServiceCategory,
    label: '💇 Hair',
    color: 'from-amber-50 to-orange-50',
    accent: 'text-amber-700',
    subTypes: [
      { label: 'Balayage & Highlights', tag: 'balayage' },
      { label: 'Keratin Treatment', tag: 'keratin' },
      { label: 'Hair Extensions', tag: 'extensions' },
      { label: 'Global Hair Color', tag: 'hair-color' },
      { label: 'Haircut & Styling', tag: 'haircut' },
      { label: 'Ombre', tag: 'ombre' },
      { label: 'Hair Spa', tag: 'hair-spa' },
      { label: 'Curly Hair Care', tag: 'curly-hair' },
    ],
  },
  {
    category: 'nails' as ServiceCategory,
    label: '💅 Nails',
    color: 'from-rose-50 to-pink-50',
    accent: 'text-rose-700',
    subTypes: [
      { label: 'Gel Nails', tag: 'gel-nails' },
      { label: 'Soft Gel Extensions', tag: 'soft-gel' },
      { label: 'Hard Gel', tag: 'hard-gel' },
      { label: 'Acrylic Nails', tag: 'acrylic-nails' },
      { label: 'Nail Art & Designs', tag: 'nail-art' },
      { label: 'Chrome Nails', tag: 'chrome-nails' },
      { label: 'Ombre Nails', tag: 'ombre-nails' },
      { label: 'Manicure & Pedicure', tag: 'manicure' },
    ],
  },
  {
    category: 'skin' as ServiceCategory,
    label: '🧴 Skin',
    color: 'from-green-50 to-emerald-50',
    accent: 'text-green-700',
    subTypes: [
      { label: 'Hydra Facial', tag: 'facial' },
      { label: 'Gold Facial', tag: 'gold-facial' },
      { label: 'Cleanup', tag: 'cleanup' },
      { label: 'Waxing & Threading', tag: 'waxing' },
      { label: 'Anti-Aging Treatment', tag: 'anti-aging' },
      { label: 'Pigmentation Treatment', tag: 'pigmentation' },
      { label: 'Acne Treatment', tag: 'acne' },
      { label: 'Tan Removal', tag: 'tan-removal' },
    ],
  },
  {
    category: 'bridal' as ServiceCategory,
    label: '👰 Bridal',
    color: 'from-purple-50 to-fuchsia-50',
    accent: 'text-purple-700',
    subTypes: [
      { label: 'Bridal Makeup', tag: 'bridal' },
      { label: 'Mehendi Design', tag: 'mehendi' },
      { label: 'Pre-Bridal Package', tag: 'pre-bridal' },
      { label: 'Saree Draping', tag: 'draping' },
      { label: 'Engagement Makeup', tag: 'engagement' },
      { label: 'Airbrush Makeup', tag: 'airbrush' },
    ],
  },
  {
    category: 'spa' as ServiceCategory,
    label: '🛁 Spa',
    color: 'from-blue-50 to-cyan-50',
    accent: 'text-blue-700',
    subTypes: [
      { label: 'Swedish Massage', tag: 'massage' },
      { label: 'Deep Tissue Massage', tag: 'deep-tissue' },
      { label: 'Aromatherapy', tag: 'aromatherapy' },
      { label: 'Hot Stone Therapy', tag: 'hot-stone' },
      { label: 'Body Wrap', tag: 'body-wrap' },
      { label: 'Reflexology', tag: 'reflexology' },
    ],
  },
  {
    category: 'grooming' as ServiceCategory,
    label: '🪒 Grooming',
    color: 'from-slate-50 to-gray-50',
    accent: 'text-slate-700',
    subTypes: [
      { label: "Men's Haircut", tag: 'haircut' },
      { label: 'Beard Styling', tag: 'beard' },
      { label: 'Clean Shave', tag: 'shave' },
      { label: 'Scalp Treatment', tag: 'scalp' },
      { label: 'Detan Facial', tag: 'detan' },
    ],
  },
]

const AI_MENU = [
  { label: '🧠 AI Face Analyst', href: '/ai-face-analyst', desc: 'Camera-based skin & face analysis' },
  { label: '💄 Virtual Try-On', href: '/virtual-tryon', desc: 'Preview hair & makeup with your camera' },
  { label: '✨ Style Match', href: '/style-match', desc: 'Upload inspo, find your salon' },
  { label: '🤖 AI Assistant', href: '/ai-assistant', desc: 'Chat to find the perfect salon' },
]

export function MegaNav() {
  const router = useRouter()
  const { setFilters, setQuery } = useDiscoveryStore()
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [listening, setListening] = useState(false)
  const [voiceText, setVoiceText] = useState('')
  const navRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognizerInstance | null>(null)

  // Close on outside click
  useEffect(() => {
    if (typeof document === 'undefined') return
    function handler(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setActiveMenu(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Voice navigation ──────────────────────────────────────────
  function toggleVoice() {
    if (typeof window === 'undefined') return

    const hasSpeechApi =
      'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
    if (!hasSpeechApi) {
      alert('Voice search is not supported in this browser. Try Chrome.')
      return
    }

    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }

    const SpeechRecognitionAPI =
      (window as typeof window & {
        webkitSpeechRecognition?: SpeechRecognizerConstructor
        SpeechRecognition?: SpeechRecognizerConstructor
      }).webkitSpeechRecognition ||
      window.SpeechRecognition

    if (!SpeechRecognitionAPI) {
      alert('Voice search is not supported in this browser. Try Chrome.')
      return
    }

    const recognition = new SpeechRecognitionAPI()
    recognition.lang = 'en-IN'
    recognition.continuous = false
    recognition.interimResults = true

    recognition.onstart = () => setListening(true)
    recognition.onend = () => setListening(false)

    recognition.onresult = (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join('')
      setVoiceText(transcript)

      const lastResult = event.results[event.results.length - 1]
      if (lastResult && lastResult[0] && 'isFinal' in lastResult[0]) {
        const finalResult = lastResult as ArrayLike<{ transcript: string; isFinal?: boolean }>
        if (finalResult[0]?.isFinal) {
          handleVoiceCommand(transcript.toLowerCase())
          setVoiceText('')
        }
      }
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  function handleVoiceCommand(text: string) {
    // Navigation commands
    if (text.includes('salon') || text.includes('find') || text.includes('search')) {
      setQuery(text.replace(/(find|search|show|look for|i want)/g, '').trim())
      router.push('/salons')
      return
    }
    if (text.includes('face') || text.includes('skin analysis') || text.includes('analyse')) {
      router.push('/ai-face-analyst')
      return
    }
    if (text.includes('try on') || text.includes('virtual')) {
      router.push('/virtual-tryon')
      return
    }
    if (text.includes('style') || text.includes('inspiration')) {
      router.push('/style-match')
      return
    }
    if (text.includes('book') || text.includes('appointment')) {
      router.push('/salons')
      return
    }
    // Category shortcuts
    const catMap: Record<string, ServiceCategory> = {
      hair: 'hair', nails: 'nails', nail: 'nails', skin: 'skin',
      bridal: 'bridal', spa: 'spa', grooming: 'grooming',
    }
    for (const [word, cat] of Object.entries(catMap)) {
      if (text.includes(word)) {
        setFilters({ categories: [cat] })
        router.push('/salons')
        return
      }
    }
    // Fallback: use as search query
    setQuery(text)
    router.push('/salons')
  }

  function selectSubType(category: ServiceCategory, tag: string) {
    setFilters({ categories: [category], tags: [tag] })
    setActiveMenu(null)
    router.push('/salons')
  }

  return (
    <nav ref={navRef} className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center h-14 gap-2">
          {/* Logo */}
          <Link href="/" className="text-rose-500 font-bold text-lg shrink-0 mr-4 flex items-center gap-1">
            <Sparkles className="w-4 h-4" />
            GlowCity
          </Link>

          {/* Service dropdowns */}
          <div className="hidden md:flex items-center gap-1 flex-1">
            {SERVICES_MENU.map((item) => (
              <div key={item.category} className="relative">
                <button
                  onMouseEnter={() => setActiveMenu(item.category)}
                  onClick={() => setActiveMenu(activeMenu === item.category ? null : item.category)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                    ${activeMenu === item.category ? 'bg-rose-50 text-rose-600' : 'text-gray-600 hover:text-rose-500 hover:bg-rose-50'}`}
                >
                  {item.label}
                  <ChevronDown className={`w-3 h-3 transition-transform ${activeMenu === item.category ? 'rotate-180' : ''}`} />
                </button>

                {activeMenu === item.category && (
                  <div
                    onMouseLeave={() => setActiveMenu(null)}
                    className={`absolute top-full left-0 mt-1 w-56 bg-gradient-to-br ${item.color} border border-gray-100 rounded-xl shadow-xl p-3 z-50`}
                  >
                    <p className={`text-xs font-semibold uppercase tracking-wide ${item.accent} mb-2 px-1`}>
                      {item.label} Services
                    </p>
                    {item.subTypes.map((sub) => (
                      <button
                        key={sub.tag}
                        onClick={() => selectSubType(item.category, sub.tag)}
                        className="block w-full text-left px-2 py-1.5 text-sm text-gray-700 hover:text-rose-600 hover:bg-white/70 rounded-lg transition-colors"
                      >
                        {sub.label}
                      </button>
                    ))}
                    <div className="border-t border-gray-200 mt-2 pt-2">
                      <button
                        onClick={() => { setFilters({ categories: [item.category] }); setActiveMenu(null); router.push('/salons') }}
                        className={`text-xs font-medium ${item.accent} hover:underline px-2`}
                      >
                        View all {item.label.split(' ')[1]} salons →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* AI Features dropdown */}
            <div className="relative ml-2">
              <button
                onMouseEnter={() => setActiveMenu('ai')}
                onClick={() => setActiveMenu(activeMenu === 'ai' ? null : 'ai')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border
                  ${activeMenu === 'ai'
                    ? 'bg-gradient-to-r from-violet-500 to-rose-500 text-white border-transparent'
                    : 'text-violet-600 border-violet-200 hover:bg-violet-50'}`}
              >
                <Brain className="w-3.5 h-3.5" />
                AI Tools
                <ChevronDown className={`w-3 h-3 transition-transform ${activeMenu === 'ai' ? 'rotate-180' : ''}`} />
              </button>

              {activeMenu === 'ai' && (
                <div
                  onMouseLeave={() => setActiveMenu(null)}
                  className="absolute top-full right-0 mt-1 w-72 bg-gradient-to-br from-violet-50 to-rose-50 border border-violet-100 rounded-xl shadow-xl p-3 z-50"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-violet-600 mb-2 px-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> AI-Powered Features
                  </p>
                  {AI_MENU.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setActiveMenu(null)}
                      className="flex flex-col px-2 py-2 rounded-lg hover:bg-white/70 transition-colors group"
                    >
                      <span className="text-sm font-medium text-gray-800 group-hover:text-violet-600">{item.label}</span>
                      <span className="text-xs text-gray-500">{item.desc}</span>
                    </Link>
                  ))}
                  <div className="border-t border-violet-100 mt-2 pt-2">
                    <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-violet-500">
                      <Leaf className="w-3 h-3" />
                      <span>Natural · Ayurvedic · Chemical · Dermat filters available</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Voice button */}
            <div className="relative">
              <button
                onClick={toggleVoice}
                title="Voice search (say 'find gel nails in Bandra')"
                className={`relative p-2 rounded-full transition-all duration-200 ${
                  listening
                    ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-rose-50 hover:text-rose-500'
                }`}
              >
                {listening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </button>
              {voiceText && (
                <div className="absolute top-full right-0 mt-2 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
                  🎤 &ldquo;{voiceText}&rdquo;
                </div>
              )}
            </div>

            {/* AI Face Analyst CTA */}
            <Link
              href="/ai-face-analyst"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-500 to-rose-500 text-white text-xs font-semibold rounded-full hover:opacity-90 transition-opacity shadow-sm"
            >
              <Camera className="w-3.5 h-3.5" />
              Analyse My Skin
            </Link>

            <Link href="/salons" className="hidden sm:block text-sm text-gray-600 hover:text-rose-500 px-2">
              Salons
            </Link>
            <Link
              href="/dashboard/bookings"
              className="text-sm bg-rose-500 hover:bg-rose-600 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
            >
              My Bookings
            </Link>
          </div>
        </div>

        {/* Voice listening banner */}
        {listening && (
          <div className="pb-2 flex items-center gap-2 text-sm text-rose-600 animate-pulse">
            <Mic className="w-4 h-4" />
            <span>Listening… say &quot;find gel nails in Bandra&quot; or &quot;analyse my skin&quot;</span>
          </div>
        )}
      </div>
    </nav>
  )
}
