/**
 * POST /api/bookings/confirm
 * Creates a confirmed booking in Firestore without payment.
 * Used for the demo flow — booking is marked confirmed immediately.
 */
import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import type { TimeSlot } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    let userId = 'guest'
    let userEmail = 'guest@glowcity.in'

    // Try to verify auth — but allow unauthenticated for demo
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const decoded = await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1])
        userId = decoded.uid
        userEmail = decoded.email ?? userEmail
      } catch { /* continue as guest */ }
    }

    const { salonId, salonName, serviceIds, serviceNames, slot, totalAmount } = await req.json() as {
      salonId: string
      salonName: string
      serviceIds: string[]
      serviceNames: string
      slot: TimeSlot
      totalAmount: number
    }

    // Create booking document
    const bookingRef = adminDb.collection('bookings').doc()
    await bookingRef.set({
      id: bookingRef.id,
      userId,
      userEmail,
      salonId,
      salonName,
      serviceIds,
      serviceName: serviceNames,
      slot,
      status: 'confirmed',
      totalAmount,
      paymentStatus: 'unpaid', // pay at salon
      aiRecommended: false,
      createdAt: FieldValue.serverTimestamp(),
    })

    // Add to user's booking history if authenticated
    if (userId !== 'guest') {
      try {
        await adminDb.doc(`users/${userId}`).update({
          bookingHistory: FieldValue.arrayUnion(bookingRef.id),
        })
      } catch { /* user doc may not exist yet */ }
    }

    return NextResponse.json({ bookingId: bookingRef.id, success: true })
  } catch (err) {
    console.error('Booking confirm error:', err)
    // Return a mock ID so the UI still works even if Firestore fails
    return NextResponse.json({
      bookingId: `GC-${Date.now().toString(36).toUpperCase()}`,
      success: false,
    })
  }
}
