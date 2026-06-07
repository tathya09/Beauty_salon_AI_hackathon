'use client'

import { useEffect, useState } from 'react'
import { collection, query, where, getDocs, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sparkles, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import type { PromotionType } from '@/types'

const PROMO_TYPES: { value: PromotionType; label: string; icon: string }[] = [
  { value: 'instagram', label: 'Instagram', icon: '📸' },
  { value: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { value: 'website', label: 'Website', icon: '🌐' },
]

export default function AICopyPage() {
  const { firebaseUser } = useAuth()
  const [salonId, setSalonId] = useState<string | null>(null)
  const [activeType, setActiveType] = useState<PromotionType>('instagram')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Partial<Record<PromotionType, { copy: string; hashtags: string[] }>>>({})
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!firebaseUser) return
    getDocs(query(collection(db, 'salons'), where('ownerId', '==', firebaseUser.uid), limit(1)))
      .then((snap) => { if (!snap.empty) setSalonId(snap.docs[0].id) })
      .catch(() => {})
  }, [firebaseUser])

  async function generate() {
    if (!salonId || !firebaseUser) return
    setLoading(true)
    try {
      const idToken = await firebaseUser.getIdToken()
      const res = await fetch('/api/ai/generate-promo-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ salonId, promotionType: activeType }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setResults((prev) => ({ ...prev, [activeType]: data }))
    } catch {
      toast.error('Failed to generate copy. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  const current = results[activeType]

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Sparkles className="w-6 h-6 text-rose-500" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Promo Copy</h1>
          <p className="text-sm text-gray-500">Generate marketing copy for your salon instantly</p>
        </div>
      </div>

      <Tabs value={activeType} onValueChange={(v) => setActiveType(v as PromotionType)}>
        <TabsList className="w-full">
          {PROMO_TYPES.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="flex-1">
              {t.icon} {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {PROMO_TYPES.map((t) => (
          <TabsContent key={t.value} value={t.value} className="space-y-4">
            <Card className="border-rose-100 bg-rose-50/30">
              <CardContent className="p-4">
                <p className="text-sm text-gray-600">
                  {t.value === 'instagram' && 'Generate an engaging Instagram caption with emojis, hashtags, and a call-to-action.'}
                  {t.value === 'whatsapp' && 'Create a personal WhatsApp broadcast message to share with your clients.'}
                  {t.value === 'website' && 'Write a professional tagline and description for your salon website.'}
                </p>
              </CardContent>
            </Card>

            <Button
              onClick={generate}
              disabled={loading || !salonId}
              className="w-full bg-rose-500 hover:bg-rose-600"
            >
              {loading ? (
                <><span className="mr-2">✨</span> Generating with AI…</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> Generate {t.label} Copy</>
              )}
            </Button>

            {current && (
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="relative">
                    <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans leading-relaxed bg-gray-50 rounded-lg p-4 pr-12">
                      {current.copy}
                    </pre>
                    <button
                      onClick={() => copyToClipboard(current.copy)}
                      className="absolute top-3 right-3 text-gray-400 hover:text-rose-500 transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  {current.hashtags.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">Hashtags</p>
                      <div className="flex flex-wrap gap-1">
                        {current.hashtags.map((tag) => (
                          <span key={tag} className="text-xs bg-blue-50 text-blue-600 rounded-full px-2 py-0.5">{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-xs text-gray-400 border-t pt-2">
                    <span>{current.copy.length} characters</span>
                    <button
                      onClick={() => copyToClipboard(`${current.copy}\n\n${current.hashtags.join(' ')}`)}
                      className="text-rose-500 hover:underline"
                    >
                      Copy with hashtags
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
