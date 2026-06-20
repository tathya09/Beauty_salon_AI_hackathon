'use client'

import { useState, useEffect } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatTime } from '@/utils/format'
import { getAvailableSlots } from '@/lib/repositories/slotRepository'
import { generateSlots } from '@/utils/slots'
import type { TimeSlot, WeeklyHours } from '@/types'

interface BookingCalendarProps {
  salonId: string
  onSelectSlot: (slot: TimeSlot) => void
  serviceDuration?: number
}

const DEFAULT_HOURS: WeeklyHours = {
  monday: { open: '09:00', close: '20:00', closed: false },
  tuesday: { open: '09:00', close: '20:00', closed: false },
  wednesday: { open: '09:00', close: '20:00', closed: false },
  thursday: { open: '09:00', close: '20:00', closed: false },
  friday: { open: '09:00', close: '20:00', closed: false },
  saturday: { open: '09:00', close: '20:00', closed: false },
  sunday: { open: '10:00', close: '18:00', closed: false },
}

function getNext7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}

export function BookingCalendar({ salonId, onSelectSlot, serviceDuration = 60 }: BookingCalendarProps) {
  const days = getNext7Days()
  const [selectedDate, setSelectedDate] = useState(days[0])
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [loading, setLoading] = useState(false)
  const [openingHours, setOpeningHours] = useState<WeeklyHours | null>(null)

  // Load salon opening hours once
  useEffect(() => {
    getDoc(doc(db, 'salons', salonId))
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data()
          setOpeningHours(data.openingHours ?? DEFAULT_HOURS)
        } else {
          setOpeningHours(DEFAULT_HOURS)
        }
      })
      .catch(() => setOpeningHours(DEFAULT_HOURS))
  }, [salonId])

  // Load slots when date or opening hours change
  useEffect(() => {
    if (!openingHours) return
    setLoading(true)
    setSelectedSlot(null)

    async function loadSlots() {
      try {
        // First try Firestore pre-generated slots
        const firestoreSlots = await getAvailableSlots(salonId, selectedDate)

        if (firestoreSlots.length > 0) {
          setSlots(firestoreSlots)
          return
        }

        // Fallback: generate slots on-the-fly from opening hours
        // Filter out slots that already have bookings
        const generated = generateSlots(salonId, selectedDate, serviceDuration, openingHours ?? DEFAULT_HOURS)
        setSlots(generated.filter((s) => s.isAvailable))
      } catch {
        // Final fallback: generate from default hours
        const fallback = generateSlots(salonId, selectedDate, serviceDuration, DEFAULT_HOURS)
        setSlots(fallback.filter((s) => s.isAvailable))
      } finally {
        setLoading(false)
      }
    }

    loadSlots()
  }, [salonId, selectedDate, openingHours, serviceDuration])

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Choose Date &amp; Time</h2>

      {/* Date tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {days.map((day) => {
          const d = new Date(day + 'T00:00:00')
          const isToday = day === days[0]
          return (
            <button
              key={day}
              onClick={() => setSelectedDate(day)}
              className={`shrink-0 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                selectedDate === day
                  ? 'bg-rose-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-rose-50'
              }`}
            >
              <div className="text-xs">{isToday ? 'Today' : d.toLocaleDateString('en-IN', { weekday: 'short' })}</div>
              <div>{d.getDate()} {d.toLocaleDateString('en-IN', { month: 'short' })}</div>
            </button>
          )
        })}
      </div>

      {/* Time slots */}
      {loading ? (
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
        </div>
      ) : slots.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">No available slots for this date</p>
          <p className="text-xs text-gray-300 mt-1">The salon may be closed on this day</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {slots.map((slot) => (
            <button
              key={slot.startTime}
              onClick={() => setSelectedSlot(slot)}
              className={`py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                selectedSlot?.startTime === slot.startTime
                  ? 'bg-rose-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-rose-50 hover:text-rose-600'
              }`}
            >
              {formatTime(slot.startTime)}
            </button>
          ))}
        </div>
      )}

      <Button
        className="w-full bg-rose-500 hover:bg-rose-600"
        disabled={!selectedSlot}
        onClick={() => selectedSlot && onSelectSlot(selectedSlot)}
      >
        {selectedSlot ? `Confirm ${formatTime(selectedSlot.startTime)}` : 'Select a time slot'}
      </Button>
    </div>
  )
}
