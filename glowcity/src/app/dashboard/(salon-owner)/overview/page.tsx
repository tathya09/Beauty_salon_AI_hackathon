'use client'

import { useEffect, useState } from 'react'
import { collection, query, where, getDocs, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatINR, formatDate, formatTime } from '@/utils/format'
import Link from 'next/link'
import { Sparkles, Clock, DollarSign, Calendar } from 'lucide-react'
import type { Booking, Salon, Service } from '@/types'

const STATUS_STYLES: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
}

export default function OwnerOverviewPage() {
  const { user } = useAuth()
  const [salon, setSalon] = useState<Salon | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [bookings, setBookings] = useState<(Booking & { salonName?: string; serviceName?: string; userEmail?: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [noSalon, setNoSalon] = useState(false)

  useEffect(() => {
    if (!user?.uid) return

    async function load() {
      try {
        // Find salon by ownerId
        const salonsSnap = await getDocs(
          query(collection(db, 'salons'), where('ownerId', '==', user!.uid), limit(1))
        )

        if (salonsSnap.empty) {
          setNoSalon(true)
          setLoading(false)
          return
        }

        const salonDoc = salonsSnap.docs[0]
        const salonData = { ...salonDoc.data(), id: salonDoc.id } as Salon
        setSalon(salonData)

        // Load services subcollection
        const svcSnap = await getDocs(collection(db, 'salons', salonDoc.id, 'services'))
        setServices(svcSnap.docs.map((d) => ({ ...d.data(), id: d.id } as Service)))

        // Load bookings for this salon
        const bookingsSnap = await getDocs(query(
          collection(db, 'bookings'),
          where('salonId', '==', salonDoc.id),
          limit(50)
        ))
        const rawBookings = bookingsSnap.docs.map((d) => ({
          ...d.data(), id: d.id,
        } as Booking & { salonName?: string; serviceName?: string; userEmail?: string; createdAt?: { seconds: number } }))
        rawBookings.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
        setBookings(rawBookings)
      } catch (err) {
        console.error('Owner dashboard load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )

  if (noSalon) return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="text-5xl mb-4">🏪</div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Set up your salon</h2>
      <p className="text-gray-500 mb-6 text-sm">You haven&apos;t created your salon profile yet. It only takes 2 minutes!</p>
      <Link href="/onboarding">
        <Button className="bg-rose-500 hover:bg-rose-600">
          <Sparkles className="w-4 h-4 mr-2" /> Create My Salon
        </Button>
      </Link>
    </div>
  )

  // Compute stats
  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const todayBookings = bookings.filter((b) => b.slot?.date === today)
  const weekRevenue = bookings.filter((b) =>
    b.status === 'confirmed' && b.slot?.date && new Date(b.slot.date) >= weekAgo
  ).reduce((sum, b) => sum + (b.totalAmount ?? 0), 0)
  const confirmedCount = bookings.filter((b) => b.status === 'confirmed').length

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Salon header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{salon?.name}</h1>
          <p className="text-gray-500 text-sm mt-0.5">📍 {salon?.area}, Mumbai</p>
        </div>
        <Link href={`/salons/${salon?.id}`}>
          <Button variant="outline" className="border-rose-200 text-rose-500 text-sm">View Public Page →</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{todayBookings.length}</p>
              <p className="text-sm text-gray-500">Today&apos;s Bookings</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatINR(weekRevenue)}</p>
              <p className="text-sm text-gray-500">This Week</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{confirmedCount}</p>
              <p className="text-sm text-gray-500">Confirmed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Bookings + Services */}
      <Tabs defaultValue="bookings">
        <TabsList>
          <TabsTrigger value="bookings">Bookings ({bookings.length})</TabsTrigger>
          <TabsTrigger value="services">Services ({services.length})</TabsTrigger>
          <TabsTrigger value="manage">Manage</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings">
          <Card>
            <CardContent className="p-5">
              {bookings.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-4xl mb-3">📭</p>
                  <p className="text-gray-500 font-medium">No bookings yet</p>
                  <p className="text-sm text-gray-400 mt-1">Share your salon link to start getting bookings!</p>
                  <p className="text-xs text-rose-500 mt-2 font-mono">
                    glowcity-two.vercel.app/salons/{salon?.id}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b text-xs uppercase tracking-wide">
                        <th className="pb-3">Customer</th>
                        <th className="pb-3">Service</th>
                        <th className="pb-3">Date</th>
                        <th className="pb-3">Time</th>
                        <th className="pb-3">Amount</th>
                        <th className="pb-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {bookings.map((b) => (
                        <tr key={b.id} className="hover:bg-gray-50">
                          <td className="py-3 text-gray-700">{(b.userEmail ?? 'Customer').split('@')[0]}</td>
                          <td className="py-3 text-gray-700">{b.serviceName ?? '—'}</td>
                          <td className="py-3 text-gray-600">{b.slot?.date ? formatDate(b.slot.date) : '—'}</td>
                          <td className="py-3 text-gray-600">{b.slot?.startTime ? formatTime(b.slot.startTime) : '—'}</td>
                          <td className="py-3 font-medium">{formatINR(b.totalAmount)}</td>
                          <td className="py-3">
                            <Badge className={`text-xs ${STATUS_STYLES[b.status] ?? 'bg-gray-100 text-gray-600'}`}>
                              {b.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services">
          <div className="space-y-3">
            {services.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-gray-400">No services added yet</CardContent></Card>
            ) : services.map((svc) => (
              <Card key={svc.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{svc.name}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{svc.duration} min</span>
                      <Badge variant="outline" className="text-xs capitalize">{svc.category}</Badge>
                    </div>
                    {svc.description && <p className="text-xs text-gray-400 mt-1">{svc.description}</p>}
                  </div>
                  <span className="font-semibold text-rose-600 text-lg">{formatINR(svc.price)}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="manage">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link href="/dashboard/slots">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-5">
                  <div className="text-2xl mb-2">🗓️</div>
                  <p className="font-semibold text-gray-900">Slot Management</p>
                  <p className="text-sm text-gray-500 mt-1">Block or open time slots</p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/dashboard/ai-copy">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-5">
                  <div className="text-2xl mb-2">✨</div>
                  <p className="font-semibold text-gray-900">AI Promo Copy</p>
                  <p className="text-sm text-gray-500 mt-1">Generate marketing content</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
