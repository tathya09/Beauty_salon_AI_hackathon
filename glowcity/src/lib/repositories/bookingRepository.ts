import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { BookingError } from '@/utils/errors'
import type { Booking, BookingDoc, BookingStatus, TimeSlot, PaginatedResult, PaginationParams } from '@/types'
import { computeTotal } from '@/utils/booking'

export async function createBooking(
  userId: string,
  salonId: string,
  serviceIds: string[],
  slot: TimeSlot,
  salonName: string,
  userEmail: string
): Promise<{ bookingId: string }> {
  // Validate preconditions
  if (!userId) throw new BookingError('UNAUTHORIZED', 'User not authenticated')
  if (serviceIds.length === 0) throw new BookingError('SERVICES_NOT_FOUND', 'No services selected')

  // Fetch services to compute total
  const serviceDocs = await Promise.all(
    serviceIds.map((id) => getDoc(doc(db, 'salons', salonId, 'services', id)))
  )
  const services = serviceDocs.map((d) => {
    if (!d.exists()) throw new BookingError('SERVICES_NOT_FOUND', `Service ${d.id} not found`)
    return d.data() as { price: number; name: string }
  })
  const totalAmount = computeTotal(services)
  const serviceName = services[0]?.name ?? ''

  // Atomic transaction: lock slot + create booking
  const bookingId = await runTransaction(db, async (txn) => {
    const slotRef = doc(
      db,
      'slots',
      `${salonId}_${slot.date}`,
      'slots',
      slot.startTime.replace(':', '')
    )
    const slotDoc = await txn.get(slotRef)

    if (!slotDoc.exists() || slotDoc.data().isAvailable === false) {
      throw new BookingError('SLOT_UNAVAILABLE', 'This slot is no longer available')
    }

    const bookingRef = doc(collection(db, 'bookings'))

    // Lock the slot
    txn.update(slotRef, {
      isAvailable: false,
      lockedUntil: Timestamp.fromMillis(Date.now() + 10 * 60 * 1000), // 10 min lock
      bookingId: bookingRef.id,
      bookedByUserId: userId,
    })

    // Create booking doc
    const bookingDoc: Omit<BookingDoc, 'id'> = {
      userId,
      salonId,
      serviceIds,
      slot,
      status: 'pending',
      totalAmount,
      paymentStatus: 'unpaid',
      aiRecommended: false,
      salonName,
      serviceName,
      userEmail,
      createdAt: serverTimestamp() as unknown as Timestamp,
    }
    txn.set(bookingRef, bookingDoc)

    return bookingRef.id
  })

  return { bookingId }
}

export async function getBookingsByUser(
  userId: string,
  status?: BookingStatus,
  pagination: PaginationParams = { limit: 20 }
): Promise<PaginatedResult<Booking>> {
  let q = query(
    collection(db, 'bookings'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(pagination.limit)
  )

  if (status) {
    q = query(
      collection(db, 'bookings'),
      where('userId', '==', userId),
      where('status', '==', status),
      orderBy('createdAt', 'desc'),
      limit(pagination.limit)
    )
  }

  if (pagination.lastVisible) {
    q = query(q, startAfter(pagination.lastVisible))
  }

  const snap = await getDocs(q)
  const items = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Booking))

  return {
    items,
    total: items.length,
    hasMore: items.length === pagination.limit,
    lastVisible: snap.docs[snap.docs.length - 1],
  }
}

export async function getBookingsBySalon(salonId: string, date?: string): Promise<Booking[]> {
  let q = query(
    collection(db, 'bookings'),
    where('salonId', '==', salonId),
    orderBy('createdAt', 'desc'),
    limit(50)
  )

  if (date) {
    q = query(
      collection(db, 'bookings'),
      where('salonId', '==', salonId),
      where('slot.date', '==', date),
      limit(50)
    )
  }

  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ ...d.data(), id: d.id } as Booking))
}

export async function getBookingById(bookingId: string): Promise<Booking | null> {
  const docSnap = await getDoc(doc(db, 'bookings', bookingId))
  if (!docSnap.exists()) return null
  return { ...docSnap.data(), id: docSnap.id } as Booking
}

export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus,
  paymentStatus?: 'unpaid' | 'paid' | 'refunded'
): Promise<void> {
  const updates: Record<string, unknown> = { status }
  if (paymentStatus) updates.paymentStatus = paymentStatus
  const { updateDoc } = await import('firebase/firestore')
  await updateDoc(doc(db, 'bookings', bookingId), updates)
}
