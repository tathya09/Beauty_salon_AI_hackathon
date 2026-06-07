import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { adminAuth, adminDb } from '@/lib/firebase/admin'

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1])

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json()

    // HMAC-SHA256 verification
    const body = razorpay_order_id + '|' + razorpay_payment_id
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest('hex')

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // Find booking by Razorpay order receipt and update status
    const bookingsSnap = await adminDb
      .collection('bookings')
      .where('paymentOrderId', '==', razorpay_order_id)
      .limit(1)
      .get()

    if (bookingsSnap.empty) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const bookingRef = bookingsSnap.docs[0].ref
    const bookingId = bookingsSnap.docs[0].id
    await bookingRef.update({ status: 'confirmed', paymentStatus: 'paid' })

    return NextResponse.json({ success: true, bookingId })
  } catch (err) {
    console.error('verify-payment error:', err)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
