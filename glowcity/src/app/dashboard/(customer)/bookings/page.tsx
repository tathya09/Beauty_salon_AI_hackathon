'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/useAuth'
import { getBookingsByUser, updateBookingStatus } from '@/lib/repositories/bookingRepository'
import { formatINR, formatDate, formatTime } from '@/utils/format'
import { toast } from 'sonner'
import type { Booking, BookingStatus } from '@/types'

type BookingWithMeta = Booking & {
  salonName?: string
  serviceName?: string
}

const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
}

function BookingCard({ booking, onCancel }: { booking: Booking; onCancel: (id: string) => void }) {
  const bookingWithMeta = booking as BookingWithMeta
  const isUpcoming = ['pending', 'confirmed'].includes(booking.status)
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">{bookingWithMeta.salonName ?? 'Salon'}</p>
            <p className="text-sm text-gray-500 mt-0.5 truncate">{bookingWithMeta.serviceName ?? booking.serviceIds.join(', ')}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              <span>📅 {formatDate(booking.slot.date)}</span>
              <span>🕐 {formatTime(booking.slot.startTime)}</span>
            </div>
          </div>
          <div className="text-right shrink-0 space-y-2">
            <Badge className={STATUS_COLORS[booking.status]}>{booking.status}</Badge>
            <p className="text-sm font-semibold text-gray-800">{formatINR(booking.totalAmount)}</p>
            {isUpcoming && (
              <Button size="sm" variant="outline" className="text-xs border-red-200 text-red-500 hover:bg-red-50"
                onClick={() => onCancel(booking.id)}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function BookingsPage() {
  const { firebaseUser } = useAuth()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!firebaseUser) return
    getBookingsByUser(firebaseUser.uid)
      .then((r) => setBookings(r.items))
      .catch(() => { })
      .finally(() => setLoading(false))
  }, [firebaseUser])

  async function handleCancel(bookingId: string) {
    try {
      await updateBookingStatus(bookingId, 'cancelled')
      setBookings((prev) => prev.map((b) => b.id === bookingId ? { ...b, status: 'cancelled' as BookingStatus } : b))
      toast.success('Booking cancelled')
    } catch {
      toast.error('Failed to cancel booking')
    }
  }

  const filterBookings = (tab: string) => {
    if (!tab || tab === 'all') return bookings
    if (tab === 'upcoming') return bookings.filter((b) => ['pending', 'confirmed'].includes(b.status))
    if (tab === 'past') return bookings.filter((b) => b.status === 'completed')
    if (tab === 'cancelled') return bookings.filter((b) => b.status === 'cancelled')
    return bookings
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Bookings</h1>
      <Tabs defaultValue="all">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>
        {['all', 'upcoming', 'past', 'cancelled'].map((tab) => (
          <TabsContent key={tab} value={tab}>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
              </div>
            ) : filterBookings(tab).length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-3xl mb-2">📋</p>
                <p>No {tab} bookings</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filterBookings(tab).map((b) => (
                  <BookingCard key={b.id} booking={b} onCancel={handleCancel} />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
