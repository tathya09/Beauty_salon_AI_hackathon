'use client'

import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { formatINR } from '@/utils/format'
import Link from 'next/link'
import { CalendarDays, Clock, Sparkles } from 'lucide-react'
import type { Booking } from '@/types'

const STATUS_STYLES: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-700 border-green-200',
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  completed: 'bg-blue-100 text-blue-700 border-blue-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
}

function BookingCard({ booking }: { booking: Booking }) {
  const b = booking as Booking & { salonName?: string; serviceName?: string }
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate text-base">
              {b.salonName || 'Salon'}
            </p>
            <p className="text-sm text-gray-500 mt-0.5 truncate">
              {b.serviceName || booking.serviceIds?.join(', ') || 'Service'}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <CalendarDays className="w-3 h-3" />
                {booking.slot?.date}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {booking.slot?.startTime}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Badge className={`text-xs border capitalize ${STATUS_STYLES[booking.status] ?? 'bg-gray-100 text-gray-600'}`}>
              {booking.status}
            </Badge>
            <span className="font-semibold text-gray-800 text-sm">
              {formatINR(booking.totalAmount)}
            </span>
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              Pay at salon
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3 font-mono">ID: {booking.id}</p>
      </CardContent>
    </Card>
  )
}

export default function BookingsPage() {
  const { firebaseUser, loading: authLoading } = useAuth()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')

  useEffect(() => {
    if (authLoading) return
    if (!firebaseUser) { setLoading(false); return }

    async function load() {
      try {
        const q = query(
          collection(db, 'bookings'),
          where('userId', '==', firebaseUser!.uid),
          orderBy('createdAt', 'desc'),
          limit(50)
        )
        const snap = await getDocs(q)
        setBookings(snap.docs.map((d) => ({ ...d.data(), id: d.id } as Booking)))
      } catch (err) {
        console.error('Bookings fetch error:', err)
        setBookings([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [firebaseUser, authLoading])

  const filterBookings = (t: string) => {
    if (t === 'all') return bookings
    if (t === 'upcoming') return bookings.filter((b) => ['confirmed', 'pending'].includes(b.status))
    if (t === 'past') return bookings.filter((b) => b.status === 'completed')
    if (t === 'cancelled') return bookings.filter((b) => b.status === 'cancelled')
    return bookings
  }

  const filtered = filterBookings(tab)

  if (!authLoading && !firebaseUser) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">🔐</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Sign in to see your bookings</h2>
        <p className="text-gray-500 mb-6 text-sm">Your appointment history lives here once you&apos;re logged in.</p>
        <Link href="/login">
          <Button className="bg-rose-500 hover:bg-rose-600">Sign In</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
        <Link href="/salons">
          <Button variant="outline" className="border-rose-200 text-rose-500 hover:bg-rose-50 text-sm">
            + Book Again
          </Button>
        </Link>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4 w-full">
          <TabsTrigger value="all" className="flex-1">All ({bookings.length})</TabsTrigger>
          <TabsTrigger value="upcoming" className="flex-1">
            Upcoming ({filterBookings('upcoming').length})
          </TabsTrigger>
          <TabsTrigger value="past" className="flex-1">Past</TabsTrigger>
          <TabsTrigger value="cancelled" className="flex-1">Cancelled</TabsTrigger>
        </TabsList>

        <TabsContent value={tab}>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">📋</div>
              <p className="font-medium text-gray-600 mb-1">No {tab === 'all' ? '' : tab} bookings yet</p>
              <p className="text-sm text-gray-400 mb-6">
                {tab === 'all' ? 'Book your first salon appointment to get started!' : ''}
              </p>
              {tab === 'all' && (
                <Link href="/salons">
                  <Button className="bg-rose-500 hover:bg-rose-600">
                    <Sparkles className="w-4 h-4 mr-2" /> Discover Salons
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((b) => <BookingCard key={b.id} booking={b} />)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
