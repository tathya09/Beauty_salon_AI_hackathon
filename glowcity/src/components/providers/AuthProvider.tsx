'use client'

import { useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/client'
import { useAuthStore } from '@/store/authStore'
import type { User } from '@/types'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setFirebaseUser, setLoading } = useAuthStore()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser)

      if (firebaseUser) {
        // Set session cookie so middleware can protect /dashboard routes
        try {
          const idToken = await firebaseUser.getIdToken()
          await fetch('/api/auth/user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken, displayName: firebaseUser.displayName }),
          })
        } catch { /* non-critical */ }

        // Check if user doc exists, create if not (handles cases where backend sync was skipped)
        const userRef = doc(db, 'users', firebaseUser.uid)
        try {
          const userSnap = await getDoc(userRef)
          if (!userSnap.exists()) {
            const newUser = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName ?? 'User',
              email: firebaseUser.email ?? '',
              phone: firebaseUser.phoneNumber ?? undefined,
              photoURL: firebaseUser.photoURL ?? undefined,
              role: 'customer' as const,
              favoritesSalonIds: [],
              bookingHistory: [],
              createdAt: serverTimestamp(),
            }
            await setDoc(userRef, newUser)
            setUser({
              ...newUser,
              createdAt: null as unknown as User['createdAt'],
            })
          } else {
            setUser(userSnap.data() as User)
          }
        } catch {
          // Firestore unavailable — still set firebase user so UI works
        }
      } else {
        setUser(null)
        // Clear session cookie on sign-out
        fetch('/api/auth/user', { method: 'DELETE' }).catch(() => {})
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [setUser, setFirebaseUser, setLoading])

  return <>{children}</>
}
