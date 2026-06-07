import { NextRequest, NextResponse } from 'next/server'
import Razorpay from 'razorpay'
import { adminAuth } from '@/lib/firebase/admin'
import { createBooking } from '@/lib/repositories/bookingRepository'
import { BookingError } from '@/utils/errors'
import { toPaise } from '@/utils/booking'
import type { TimeSlot } from '@/types'

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decoded = await adminAuth.verifyIdToken(idToken)
    const userId = decoded.uid

    const { salonId, salonName, serviceIds, slot, userEmail } = await req.json() as {
      salonId: string
      salonName: string
      serviceIds: string[]
      slot: TimeSlot
      userEmail: string
    }

    // Create atomic booking
    const { bookingId } = await createBooking(userId, salonId, serviceIds, slot, salonName, userEmail)

    // Fetch booking to get total
    const { getBookingById } = await import('@/lib/repositories/bookingRepository')
    const booking = await getBookingById(bookingId)
    if (!booking) throw new Error('Booking not found after creation')

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: toPaise(booking.totalAmount),
      currency: 'INR',
      receipt: bookingId,
    })

    return NextResponse.json({ orderId: order.id, amount: order.amount, bookingId })
  } catch (err) {
    if (err instanceof BookingError && err.code === 'SLOT_UNAVAILABLE') {
      return NextResponse.json({ error: 'Slot unavailable' }, { status: 409 })
    }
    console.error('create-order error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
