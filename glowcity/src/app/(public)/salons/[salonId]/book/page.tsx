'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ServiceSelector } from '@/components/booking/ServiceSelector'
import { BookingCalendar } from '@/components/booking/BookingCalendar'
import { BookingConfirmation } from '@/components/booking/BookingConfirmation'
import { getSalonById } from '@/lib/repositories/salonRepository'
import { useAuth } from '@/hooks/useAuth'
import { formatINR } from '@/utils/format'
import type { Service, TimeSlot, Salon } from '@/types'

type Step = 'services' | 'datetime' | 'confirm' | 'success'

interface Props { params: { salonId: string } }

export default function BookPage({ params }: Props) {
  const router = useRouter()
  const { firebaseUser, isAuthenticated } = useAuth()
  const [salon, setSalon] = useState<Salon | null>(null)
  const [step, setStep] = useState<Step>('services')
  const [selectedServices, setSelectedServices] = useState<Service[]>([])
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    getSalonById(params.salonId).then(setSalon).catch(() => router.push('/salons'))
  }, [params.salonId, router])

  useEffect(() => {
    if (!isAuthenticated) router.push('/login')
  }, [isAuthenticated, router])

  async function handlePayment() {
    if (!salon || !selectedSlot || !firebaseUser) return
    setPaying(true)
    try {
      const idToken = await firebaseUser.getIdToken()
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          salonId: salon.id,
          salonName: salon.name,
          serviceIds: selectedServices.map((s) => s.id),
          slot: selectedSlot,
          userEmail: firebaseUser.email ?? '',
        }),
      })

      if (res.status === 409) {
        toast.error('This slot was just taken. Please pick another time.')
        setStep('datetime')
        return
      }

      if (!res.ok) throw new Error('Order creation failed')
      const { orderId, amount } = await res.json()

      // Load Razorpay script
      await loadRazorpay()

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount,
        currency: 'INR',
        name: 'GlowCity',
        description: selectedServices.map((s) => s.name).join(', '),
        order_id: orderId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handler: async (response: any) => {
          const verifyRes = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
            body: JSON.stringify(response),
          })
          if (verifyRes.ok) {
            const { bookingId: bid } = await verifyRes.json()
            setBookingId(bid)
            setStep('success')
          } else {
            toast.error('Payment verification failed. Please contact support.')
          }
        },
        prefill: { email: firebaseUser.email ?? '' },
        theme: { color: '#f43f5e' },
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rzp = new (window as any).Razorpay(options)
      rzp.open()
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setPaying(false)
    }
  }

  if (!salon) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>
  }

  if (step === 'success' && bookingId && selectedSlot && selectedServices.length > 0) {
    return (
      <BookingConfirmation
        bookingId={bookingId}
        salonName={salon.name}
        serviceName={selectedServices.map((s) => s.name).join(', ')}
        slot={selectedSlot}
        totalAmount={selectedServices.reduce((s, sv) => s + sv.price, 0)}
      />
    )
  }

  const STEPS: Step[] = ['services', 'datetime', 'confirm']
  const stepIdx = STEPS.indexOf(step)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${i <= stepIdx ? 'bg-rose-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                {i + 1}
              </div>
              {i < STEPS.length - 1 && <div className={`h-0.5 w-8 ${i < stepIdx ? 'bg-rose-500' : 'bg-gray-200'}`} />}
            </div>
          ))}
          <span className="text-sm text-gray-500 ml-2 capitalize">{step}</span>
        </div>

        <Card>
          <CardContent className="p-6">
            {step === 'services' && (
              <ServiceSelector
                services={salon.services}
                onConfirm={(svcs) => { setSelectedServices(svcs); setStep('datetime') }}
              />
            )}
            {step === 'datetime' && (
              <BookingCalendar
                salonId={salon.id}
                onSelectSlot={(slot) => { setSelectedSlot(slot); setStep('confirm') }}
              />
            )}
            {step === 'confirm' && selectedSlot && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Confirm Booking</h2>
                <div className="bg-rose-50 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Salon</span><span className="font-medium">{salon.name}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Services</span><span className="font-medium text-right">{selectedServices.map((s) => s.name).join(', ')}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Date</span><span className="font-medium">{selectedSlot.date}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Time</span><span className="font-medium">{selectedSlot.startTime}</span></div>
                  <div className="flex justify-between border-t pt-2 font-semibold"><span>Total</span><span className="text-rose-600">{formatINR(selectedServices.reduce((s, sv) => s + sv.price, 0))}</span></div>
                </div>
                <Button className="w-full bg-rose-500 hover:bg-rose-600" onClick={handlePayment} disabled={paying}>
                  {paying ? 'Processing…' : 'Pay & Confirm'}
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => setStep('datetime')}>← Change time</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function loadRazorpay(): Promise<void> {
  return new Promise((resolve) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).Razorpay) { resolve(); return }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve()
    document.body.appendChild(script)
  })
}
