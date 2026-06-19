'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Plus, Trash2, Loader2, ChevronRight } from 'lucide-react'
import type { ServiceCategory, PriceRange } from '@/types'

const MUMBAI_AREAS = [
  'Bandra West', 'Bandra East', 'Andheri West', 'Andheri East', 'Juhu', 'Colaba',
  'Powai', 'Malad West', 'Khar West', 'Versova', 'Dadar West', 'Borivali West',
  'Chembur', 'Worli', 'Santacruz West', 'Goregaon West', 'Thane West',
  'Lokhandwala', 'Vile Parle West', 'Kandivali West', 'Mulund West',
]

const CATEGORIES: { label: string; value: ServiceCategory }[] = [
  { label: '💇 Hair', value: 'hair' },
  { label: '💅 Nails', value: 'nails' },
  { label: '🧴 Skin', value: 'skin' },
  { label: '👰 Bridal', value: 'bridal' },
  { label: '🪒 Grooming', value: 'grooming' },
  { label: '🛁 Spa', value: 'spa' },
]

interface ServiceInput {
  name: string
  category: ServiceCategory
  duration: number
  price: number
  description: string
}

const emptyService = (): ServiceInput => ({
  name: '', category: 'hair', duration: 60, price: 500, description: ''
})

export default function OnboardingPage() {
  const router = useRouter()
  const { firebaseUser } = useAuth()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // Step 1 — Salon info
  const [salonName, setSalonName] = useState('')
  const [area, setArea] = useState('')
  const [priceRange, setPriceRange] = useState<PriceRange>('mid')
  const [phone, setPhone] = useState('')

  // Step 2 — Services
  const [services, setServices] = useState<ServiceInput[]>([emptyService()])

  function addService() { setServices((p) => [...p, emptyService()]) }
  function removeService(i: number) { setServices((p) => p.filter((_, idx) => idx !== i)) }
  function updateService(i: number, field: keyof ServiceInput, value: string | number) {
    setServices((p) => p.map((s, idx) => idx === i ? { ...s, [field]: value } : s))
  }

  async function handleSubmit() {
    if (!salonName.trim() || !area) { toast.error('Please fill in salon name and area'); return }
    const validServices = services.filter((s) => s.name.trim())
    if (validServices.length === 0) { toast.error('Please add at least one service'); return }
    if (!firebaseUser) { router.push('/login'); return }

    setLoading(true)
    try {
      const idToken = await firebaseUser.getIdToken()
      const res = await fetch('/api/salon/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ name: salonName, area, priceRange, phone, services: validServices }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Your salon is live! 🎉')
      router.push('/dashboard/overview')
    } catch (err) {
      toast.error('Failed to create salon. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 py-8 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-3xl font-bold text-rose-500 mb-1">✨ GlowCity</div>
          <h1 className="text-2xl font-bold text-gray-900">Set up your salon</h1>
          <p className="text-gray-500 mt-1">Get listed and start accepting bookings today</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                step >= s ? 'bg-rose-500 text-white' : 'bg-gray-200 text-gray-400'
              }`}>{s}</div>
              {s < 2 && <div className={`w-12 h-0.5 ${step > s ? 'bg-rose-400' : 'bg-gray-200'}`} />}
            </div>
          ))}
          <span className="text-sm text-gray-500 ml-2">{step === 1 ? 'Salon Info' : 'Services'}</span>
        </div>

        {step === 1 && (
          <Card>
            <CardHeader><CardTitle>Salon Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Salon Name *</label>
                <Input value={salonName} onChange={(e) => setSalonName(e.target.value)} placeholder="e.g. Glow Studio" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Area in Mumbai *</label>
                <select
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full border border-input rounded-md h-10 px-3 text-sm bg-background"
                >
                  <option value="">Select area…</option>
                  {MUMBAI_AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Price Range</label>
                <div className="flex gap-3">
                  {[
                    { value: 'budget', label: '💰 Budget', sub: 'Under ₹1000' },
                    { value: 'mid', label: '💎 Mid', sub: '₹1000–5000' },
                    { value: 'luxury', label: '✨ Luxury', sub: '₹5000+' },
                  ].map(({ value, label, sub }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPriceRange(value as PriceRange)}
                      className={`flex-1 p-3 rounded-xl border-2 text-left transition-all ${
                        priceRange === value ? 'border-rose-400 bg-rose-50' : 'border-gray-100 hover:border-rose-200'
                      }`}
                    >
                      <div className="font-medium text-sm">{label}</div>
                      <div className="text-xs text-gray-400">{sub}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Phone Number (optional)</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
              </div>
              <Button
                className="w-full bg-rose-500 hover:bg-rose-600 h-11"
                onClick={() => {
                  if (!salonName.trim() || !area) { toast.error('Please fill salon name and area'); return }
                  setStep(2)
                }}
              >
                Next: Add Services <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Your Services</CardTitle>
              <p className="text-sm text-gray-500">Add the services you offer with pricing</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {services.map((svc, i) => (
                <div key={i} className="border border-gray-100 rounded-xl p-4 space-y-3 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Service {i + 1}</span>
                    {services.length > 1 && (
                      <button onClick={() => removeService(i)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <Input
                    placeholder="Service name (e.g. Balayage, Gel Nails)"
                    value={svc.name}
                    onChange={(e) => updateService(i, 'name', e.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(({ label, value }) => (
                      <Badge
                        key={value}
                        onClick={() => updateService(i, 'category', value)}
                        className={`cursor-pointer text-xs ${svc.category === value ? 'bg-rose-500 text-white' : 'bg-white text-gray-600 border hover:bg-rose-50'}`}
                      >
                        {label}
                      </Badge>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Price (₹)</label>
                      <Input
                        type="number"
                        value={svc.price}
                        min={0}
                        onChange={(e) => updateService(i, 'price', Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Duration (min)</label>
                      <Input
                        type="number"
                        value={svc.duration}
                        min={15}
                        step={15}
                        onChange={(e) => updateService(i, 'duration', Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <Button variant="outline" className="w-full border-dashed border-rose-200 text-rose-500 hover:bg-rose-50" onClick={addService}>
                <Plus className="w-4 h-4 mr-2" /> Add Another Service
              </Button>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>← Back</Button>
                <Button className="flex-1 bg-rose-500 hover:bg-rose-600 h-11" onClick={handleSubmit} disabled={loading}>
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Creating…</> : '🚀 Go Live!'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
