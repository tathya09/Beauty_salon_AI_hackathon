/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ServiceSelector } from '@/components/booking/ServiceSelector'
import { BookingCalendar } from '@/components/booking/BookingCalendar'
import { BookingConfirmation } from '@/components/booking/BookingConfirmation'
import { getSalonById } from '@/lib/repositories/salonRepository'
import { useAuth } from '@/hooks/useAuth'
import { formatINR } from '@/utils/format'
import { CheckCircle, Loader2 } from 'lucide-react'
import type { Service, TimeSlot, Salon } from '@/types'

type Step = 'services' | 'datetime' | 'confirm' | 'success'

interface Props { params: { salonId: string } }

export default function BookPage({ params }: Props) {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const [salon, setSalon] = useState<Salon | null>(null)
  const [step, setStep] = useState<Step>('services')
  const [selectedServices, setSelectedServices] = useState<Service[]>([])
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    getSalonById(params.salonId).then(setSalon).catch(() => router.push('/salons'))
  }, [params.salonId, router])

  useEffect(() => {
    if (!isAuthenticated) router.push('/login')
  }, [isAuthenticated, router])

  // Confirm booking — saves to Firestore
  async function handleConfirmBooking() {
    if (!salon || !selectedSlot) return
    setConfirming(true)
    try {
      // Get auth token — required for booking
      const { getAuth } = await import('firebase/auth')
      const currentUser = getAuth().currentUser
      if (!currentUser) {
        router.push('/login')
        return
      }
      const token = await currentUser.getIdToken(/* forceRefresh */ true)

      const res = await fetch('/api/bookings/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          salonId: salon.id,
          salonName: salon.name,
          serviceIds: selectedServices.map((s) => s.id),
          serviceNames: selectedServices.map((s) => s.name).join(', '),
          slot: selectedSlot,
          totalAmount: selectedServices.reduce((sum, s) => sum + s.price, 0),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? 'Booking failed. Please try again.')
      }

      setBookingId(data.bookingId)
      setStep('success')
    } catch (err: any) {
      console.error('Booking error:', err)
      // Show error — don't silently swallow it
      alert(err.message ?? 'Booking failed. Please try again.')
    } finally {
      setConfirming(false)
    }
  }

  if (!salon) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
      </div>
    )
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
  const stepLabels = ['Services', 'Date & Time', 'Confirm']

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">{salon.name}</h1>
          <p className="text-sm text-gray-500">{salon.area}, Mumbai</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-all ${
                i < stepIdx ? 'bg-rose-500 text-white' :
                i === stepIdx ? 'bg-rose-500 text-white ring-4 ring-rose-100' :
                'bg-gray-200 text-gray-400'
              }`}>
                {i < stepIdx ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${i === stepIdx ? 'text-rose-500' : 'text-gray-400'}`}>
                {stepLabels[i]}
              </span>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 rounded ${i < stepIdx ? 'bg-rose-400' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        <Card className="shadow-sm">
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
              <div className="space-y-5">
                <h2 className="text-lg font-semibold text-gray-900">Confirm Booking</h2>

                <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Salon</span>
                    <span className="font-medium text-gray-900">{salon.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Service{selectedServices.length > 1 ? 's' : ''}</span>
                    <span className="font-medium text-gray-900 text-right max-w-[60%]">
                      {selectedServices.map((s) => s.name).join(', ')}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Date</span>
                    <span className="font-medium text-gray-900">{selectedSlot.date}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Time</span>
                    <span className="font-medium text-gray-900">{selectedSlot.startTime}</span>
                  </div>
                  <div className="border-t border-rose-100 pt-3 flex justify-between font-semibold">
                    <span className="text-gray-800">Total</span>
                    <span className="text-rose-600 text-lg">
                      {formatINR(selectedServices.reduce((s, sv) => s + sv.price, 0))}
                    </span>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-700">
                  💳 Payment collected at salon · Free cancellation up to 2 hours before
                </div>

                <Button
                  className="w-full bg-rose-500 hover:bg-rose-600 h-12 text-base font-semibold"
                  onClick={handleConfirmBooking}
                  disabled={confirming}
                >
                  {confirming ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Confirming…</>
                  ) : (
                    '✅ Confirm Booking'
                  )}
                </Button>

                <Button
                  variant="ghost"
                  className="w-full text-gray-400 hover:text-gray-600"
                  onClick={() => setStep('datetime')}
                  disabled={confirming}
                >
                  ← Change time
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
