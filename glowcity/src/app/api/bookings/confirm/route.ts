/**
 * POST /api/bookings/confirm
 * Creates a confirmed booking in Firestore.
 * Requires a valid Firebase ID token in the Authorization header.
 */
import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import type { TimeSlot } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')

    let userId: string | null = null
    let userEmail = ''

    // Verify Firebase ID token
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const decoded = await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1])
        userId = decoded.uid
        userEmail = decoded.email ?? ''
      } catch (err) {
        console.error('Token verification failed:', err)
        return NextResponse.json({ error: 'Unauthorized — please sign in to book' }, { status: 401 })
      }
    } else {
      return NextResponse.json({ error: 'Unauthorized — please sign in to book' }, { status: 401 })
    }

    const { salonId, salonName, serviceIds, serviceNames, slot, totalAmount } = await req.json() as {
      salonId: string
      salonName: string
      serviceIds: string[]
      serviceNames: string
      slot: TimeSlot
      totalAmount: number
    }

    if (!salonId || !slot || !serviceIds?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create booking document with all required fields
    const bookingRef = adminDb.collection('bookings').doc()
    const bookingData = {
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
    }

    await bookingRef.set(bookingData)

    // Update user's booking history array
    try {
      const userRef = adminDb.doc(`users/${userId}`)
      const userSnap = await userRef.get()
      if (userSnap.exists) {
        await userRef.update({
          bookingHistory: FieldValue.arrayUnion(bookingRef.id),
        })
      } else {
        // Create user doc if it doesn't exist (edge case)
        await userRef.set({
          uid: userId,
          email: userEmail,
          displayName: '',
          role: 'customer',
          favoritesSalonIds: [],
          bookingHistory: [bookingRef.id],
          createdAt: FieldValue.serverTimestamp(),
        })
      }
    } catch (userUpdateErr) {
      console.error('Failed to update user booking history:', userUpdateErr)
      // Don't fail the booking — the booking doc was created successfully
    }

    console.log(`✅ Booking ${bookingRef.id} created for user ${userId}`)
    return NextResponse.json({ bookingId: bookingRef.id, success: true })
  } catch (err) {
    console.error('Booking confirm error:', err)
    return NextResponse.json({ error: 'Failed to create booking', success: false }, { status: 500 })
  }
}
