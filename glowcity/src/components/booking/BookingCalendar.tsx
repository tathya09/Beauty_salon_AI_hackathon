'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatTime } from '@/utils/format'
import { getAvailableSlots } from '@/lib/repositories/slotRepository'
import type { TimeSlot } from '@/types'

interface BookingCalendarProps {
  salonId: string
  onSelectSlot: (slot: TimeSlot) => void
}

function getNext7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}

export function BookingCalendar({ salonId, onSelectSlot }: BookingCalendarProps) {
  const days = getNext7Days()
  const [selectedDate, setSelectedDate] = useState(days[0])
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    setSelectedSlot(null)
    getAvailableSlots(salonId, selectedDate)
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setLoading(false))
  }, [salonId, selectedDate])

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
        <p className="text-center text-gray-400 py-8">No available slots for this date</p>
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
