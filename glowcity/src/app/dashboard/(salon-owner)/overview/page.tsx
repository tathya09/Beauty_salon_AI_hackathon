'use client'

import { useEffect, useState } from 'react'
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatINR, formatDate, formatTime } from '@/utils/format'
import type { Booking } from '@/types'

interface Stats { todayCount: number; weekRevenue: number; pendingCount: number }

export default function OwnerOverviewPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats>({ todayCount: 0, weekRevenue: 0, pendingCount: 0 })
  const [recentBookings, setRecentBookings] = useState<Booking[]>([])
  const [salonId, setSalonId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.uid) return

    async function load() {
      // Find salon owned by this user
      const salonsSnap = await getDocs(query(collection(db, 'salons'), where('ownerId', '==', user!.uid), limit(1)))
      if (salonsSnap.empty) { setLoading(false); return }
      const sid = salonsSnap.docs[0].id
      setSalonId(sid)

      // Recent bookings
      const bookingsSnap = await getDocs(query(
        collection(db, 'bookings'),
        where('salonId', '==', sid),
        orderBy('createdAt', 'desc'),
        limit(10)
      ))
      const bookings = bookingsSnap.docs.map((d) => ({ ...d.data(), id: d.id } as Booking))
      setRecentBookings(bookings)

      // Stats
      const today = new Date().toISOString().split('T')[0]
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

      const todayCount = bookings.filter((b) => b.slot.date === today).length
      const weekRevenue = bookings
        .filter((b) => b.paymentStatus === 'paid' && new Date(b.slot.date) >= weekAgo)
        .reduce((sum, b) => sum + b.totalAmount, 0)
      const pendingCount = bookings.filter((b) => b.status === 'pending').length

      setStats({ todayCount, weekRevenue, pendingCount })
      setLoading(false)
    }

    load().catch(() => setLoading(false))
  }, [user])

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
      <div className="grid grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Salon Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Today's Bookings", value: stats.todayCount, icon: '📅' },
          { label: 'This Week Revenue', value: formatINR(stats.weekRevenue), icon: '💰' },
          { label: 'Pending Confirmations', value: stats.pendingCount, icon: '⏳' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <div className="text-2xl mb-1">{stat.icon}</div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Recent Bookings</h2>
          {recentBookings.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No bookings yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-gray-500 border-b">
                  <th className="pb-2">Customer</th><th className="pb-2">Service</th>
                  <th className="pb-2">Date</th><th className="pb-2">Time</th><th className="pb-2">Status</th>
                </tr></thead>
                <tbody className="divide-y">
                  {recentBookings.map((b) => (
                    <tr key={b.id} className="py-2">
                      <td className="py-2 text-gray-600">{(b as any).userEmail?.split('@')[0] ?? 'Customer'}</td>
                      <td className="py-2">{(b as any).serviceName ?? '—'}</td>
                      <td className="py-2">{formatDate(b.slot.date)}</td>
                      <td className="py-2">{formatTime(b.slot.startTime)}</td>
                      <td className="py-2">
                        <Badge className={b.status === 'confirmed' ? 'bg-green-100 text-green-700' : b.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}>
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
    </div>
  )
}
