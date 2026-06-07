'use client'

import { useEffect, useState } from 'react'
import { collection, query, where, getDocs, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { useAuth } from '@/hooks/useAuth'
import { blockSlot, unblockSlot, getAllSlots } from '@/lib/repositories/slotRepository'
import { formatTime } from '@/utils/format'
import { toast } from 'sonner'
import type { TimeSlot } from '@/types'
import { Timestamp } from 'firebase/firestore'

function getNext7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}

type SlotWithMeta = TimeSlot & { lockedUntil?: Timestamp; bookingId?: string }

export default function SlotsPage() {
  const { user } = useAuth()
  const [salonId, setSalonId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(getNext7Days()[0])
  const [slots, setSlots] = useState<SlotWithMeta[]>([])
  const [loading, setLoading] = useState(false)
  const days = getNext7Days()

  useEffect(() => {
    if (!user?.uid) return
    getDocs(query(collection(db, 'salons'), where('ownerId', '==', user.uid), limit(1)))
      .then((snap) => { if (!snap.empty) setSalonId(snap.docs[0].id) })
      .catch(() => {})
  }, [user])

  useEffect(() => {
    if (!salonId) return
    setLoading(true)
    getAllSlots(salonId, selectedDate)
      .then((s) => setSlots(s as SlotWithMeta[]))
      .catch(() => setSlots([]))
      .finally(() => setLoading(false))
  }, [salonId, selectedDate])

  async function toggleSlot(slot: SlotWithMeta) {
    if (!salonId) return
    try {
      if (slot.isAvailable) {
        await blockSlot(salonId, selectedDate, slot.startTime)
        toast.success('Slot blocked')
      } else if (!slot.bookingId) {
        await unblockSlot(salonId, selectedDate, slot.startTime)
        toast.success('Slot unblocked')
      } else {
        toast.info('This slot has a booking and cannot be unblocked')
        return
      }
      setSlots((prev) => prev.map((s) => s.startTime === slot.startTime ? { ...s, isAvailable: !s.isAvailable } : s))
    } catch {
      toast.error('Failed to update slot')
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Slot Management</h1>

      {/* Date tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {days.map((day) => {
          const d = new Date(day + 'T00:00:00')
          const isToday = day === days[0]
          return (
            <button key={day} onClick={() => setSelectedDate(day)}
              className={`shrink-0 px-3 py-2 rounded-xl text-sm font-medium transition-all ${selectedDate === day ? 'bg-rose-500 text-white' : 'bg-white border text-gray-600 hover:bg-rose-50'}`}>
              <div className="text-xs">{isToday ? 'Today' : d.toLocaleDateString('en-IN', { weekday: 'short' })}</div>
              <div>{d.getDate()} {d.toLocaleDateString('en-IN', { month: 'short' })}</div>
            </button>
          )
        })}
      </div>

      <div className="flex gap-4 text-xs mb-4">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-400" /> Available</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-400" /> Booked</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-300" /> Blocked</span>
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-8">Loading slots…</p>
      ) : slots.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No slots generated for this date</p>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {slots.map((slot) => {
            const hasBooking = !!slot.bookingId
            const color = hasBooking ? 'bg-orange-100 text-orange-700 cursor-not-allowed' : slot.isAvailable ? 'bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 cursor-pointer'
            return (
              <button key={slot.startTime} onClick={() => !hasBooking && toggleSlot(slot)}
                className={`py-2 px-2 rounded-xl text-xs font-medium transition-all text-center ${color}`}
                title={hasBooking ? 'Has booking' : slot.isAvailable ? 'Click to block' : 'Click to unblock'}>
                {formatTime(slot.startTime)}
                {hasBooking && <div className="text-xs opacity-60">booked</div>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
