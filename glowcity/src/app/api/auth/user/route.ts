/**
 * POST /api/auth/user
 * Called after Firebase Auth sign-in/sign-up to:
 *  1. Create or fetch the user's Firestore doc
 *  2. Set a session cookie so middleware can protect /dashboard routes
 *
 * Body: { idToken: string, displayName?: string, role?: UserRole }
 */
import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import type { UserRole } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const { idToken, displayName, role = 'customer' } = await req.json() as {
      idToken: string
      displayName?: string
      role?: UserRole
    }

    if (!idToken) {
      return NextResponse.json({ error: 'idToken required' }, { status: 400 })
    }

    // Verify the Firebase ID token server-side
    let decodedToken
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken)
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    const { uid, email, name: tokenName, picture } = decodedToken
    const userRef = adminDb.collection('users').doc(uid)
    const userSnap = await userRef.get()

    let isNewUser = false

    if (!userSnap.exists) {
      // New user — create Firestore doc
      isNewUser = true
      await userRef.set({
        uid,
        displayName: displayName ?? tokenName ?? 'User',
        email: email ?? '',
        photoURL: picture ?? null,
        role,
        favoritesSalonIds: [],
        bookingHistory: [],
        createdAt: FieldValue.serverTimestamp(),
      })
    }

    const userData = isNewUser
      ? { uid, displayName: displayName ?? tokenName ?? 'User', email, role }
      : { ...userSnap.data(), uid }

    // Set session cookie
    const response = NextResponse.json({ user: userData, isNewUser })
    response.cookies.set('session', idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return response
  } catch (err) {
    console.error('POST /api/auth/user error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/auth/user — sign out: clears session cookie
 */
export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set('session', '', { maxAge: 0, path: '/' })
  return response
}
