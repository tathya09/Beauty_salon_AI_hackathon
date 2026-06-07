'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, Calendar, Clock, Sparkles } from 'lucide-react'
import { formatINR, formatDate, formatTime } from '@/utils/format'
import type { TimeSlot } from '@/types'

interface BookingConfirmationProps {
  bookingId: string
  salonName: string
  serviceName: string
  slot: TimeSlot
  totalAmount: number
}

export function BookingConfirmation({ bookingId, salonName, serviceName, slot, totalAmount }: BookingConfirmationProps) {
  function addToCalendar() {
    const [year, month, day] = slot.date.split('-').map(Number)
    const [hour, min] = slot.startTime.split(':').map(Number)
    const start = new Date(year, month - 1, day, hour, min)
    const end = new Date(start.getTime() + 60 * 60 * 1000)

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `SUMMARY:${serviceName} at ${salonName}`,
      `DTSTART:${start.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTEND:${end.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DESCRIPTION:Booking ID: ${bookingId}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')

    const blob = new Blob([icsContent], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'glowcity-appointment.ics'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center space-y-5">
          <div className="flex justify-center">
            <CheckCircle className="w-16 h-16 text-rose-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Booking Confirmed! 🎉</h1>
            <p className="text-gray-500 text-sm mt-1">We&apos;ve sent details to your email</p>
          </div>

          <div className="bg-rose-50 rounded-xl p-4 text-left space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-rose-400 shrink-0" />
              <div>
                <p className="font-medium">{salonName}</p>
                <p className="text-gray-500 text-xs">{serviceName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{formatDate(slot.date)}</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{formatTime(slot.startTime)} – {formatTime(slot.endTime)}</span>
            </div>
            <div className="border-t pt-3 flex justify-between font-semibold">
              <span>Total Paid</span>
              <span className="text-rose-600">{formatINR(totalAmount)}</span>
            </div>
          </div>

          <p className="text-xs text-gray-400">Booking ID: {bookingId}</p>

          <div className="flex flex-col gap-2">
            <Button variant="outline" className="w-full border-rose-200" onClick={addToCalendar}>
              📅 Add to Calendar
            </Button>
            <Link href="/dashboard/bookings">
              <Button variant="outline" className="w-full">View My Bookings</Button>
            </Link>
            <Link href="/">
              <Button className="w-full bg-rose-500 hover:bg-rose-600">Back to Home</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
