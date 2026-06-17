import {
  collection,
  doc,
  getDocs,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import type { TimeSlot } from '@/types'

export async function getAvailableSlots(salonId: string, date: string): Promise<TimeSlot[]> {
  const slotsRef = collection(db, 'slots', `${salonId}_${date}`, 'slots')
  const snap = await getDocs(slotsRef)

  const now = Date.now()
  return snap.docs
    .map((d) => d.data() as TimeSlot & { lockedUntil?: Timestamp })
    .filter((slot) => {
      // Treat expired locks as available
      if (!slot.isAvailable && slot.lockedUntil) {
        return slot.lockedUntil.toMillis() < now
      }
      return slot.isAvailable
    })
    .map((slot) => ({
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      isAvailable: slot.isAvailable,
    }))
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
}

export async function getAllSlots(salonId: string, date: string): Promise<(TimeSlot & { lockedUntil?: Timestamp })[]> {
  const slotsRef = collection(db, 'slots', `${salonId}_${date}`, 'slots')
  const snap = await getDocs(slotsRef)
  return snap.docs
    .map((d) => d.data() as TimeSlot & { lockedUntil?: Timestamp })
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
}

export async function blockSlot(salonId: string, date: string, startTime: string): Promise<void> {
  const slotRef = doc(db, 'slots', `${salonId}_${date}`, 'slots', startTime.replace(':', ''))
  await updateDoc(slotRef, { isAvailable: false })
}

export async function unblockSlot(salonId: string, date: string, startTime: string): Promise<void> {
  const slotRef = doc(db, 'slots', `${salonId}_${date}`, 'slots', startTime.replace(':', ''))
  await updateDoc(slotRef, { isAvailable: true, lockedUntil: null, bookingId: null, bookedByUserId: null })
}
