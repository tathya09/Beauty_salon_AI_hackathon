/**
 * POST /api/reviews — Submit a review for a salon
 * GET  /api/reviews?salonId=xxx — Fetch reviews for a salon
 */
import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'

export async function GET(req: NextRequest) {
  const salonId = req.nextUrl.searchParams.get('salonId')
  if (!salonId) return NextResponse.json({ reviews: [] })

  try {
    const snap = await adminDb
      .collection('salons').doc(salonId)
      .collection('reviews')
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get()

    const reviews = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    return NextResponse.json({ reviews })
  } catch {
    return NextResponse.json({ reviews: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Sign in to leave a review' }, { status: 401 })
    }

    const decoded = await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1])
    const userId = decoded.uid
    const displayName = decoded.name ?? decoded.email?.split('@')[0] ?? 'User'

    const { salonId, rating, comment } = await req.json()
    if (!salonId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'salonId and rating (1-5) required' }, { status: 400 })
    }

    // Check for duplicate review from same user
    const existing = await adminDb
      .collection('salons').doc(salonId)
      .collection('reviews')
      .where('userId', '==', userId)
      .limit(1)
      .get()

    if (!existing.empty) {
      // Update existing review
      await existing.docs[0].ref.update({
        rating, comment: comment ?? '', updatedAt: FieldValue.serverTimestamp(),
      })
      return NextResponse.json({ success: true, updated: true })
    }

    // Create new review
    const reviewRef = adminDb.collection('salons').doc(salonId).collection('reviews').doc()
    await reviewRef.set({
      userId,
      displayName,
      rating,
      comment: comment ?? '',
      createdAt: FieldValue.serverTimestamp(),
    })

    // Update salon's aggregate rating
    const reviewsSnap = await adminDb
      .collection('salons').doc(salonId)
      .collection('reviews').get()

    const allRatings = reviewsSnap.docs.map((d) => d.data().rating as number)
    const avgRating = allRatings.reduce((s, r) => s + r, 0) / allRatings.length

    await adminDb.collection('salons').doc(salonId).update({
      rating: Math.round(avgRating * 10) / 10,
      reviewCount: allRatings.length,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Review POST error:', err)
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 })
  }
}
