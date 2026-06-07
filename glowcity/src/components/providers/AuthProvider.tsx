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
        // Check if user doc exists, create if not
        const userRef = doc(db, 'users', firebaseUser.uid)
        const userSnap = await getDoc(userRef)

        if (!userSnap.exists()) {
          const newUser: Omit<User, 'createdAt' | 'stylePreferences'> & { createdAt: any } = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName ?? 'User',
            email: firebaseUser.email ?? '',
            phone: firebaseUser.phoneNumber ?? undefined,
            photoURL: firebaseUser.photoURL ?? undefined,
            role: 'customer',
            favoritesSalonIds: [],
            bookingHistory: [],
            createdAt: serverTimestamp(),
          }
          await setDoc(userRef, newUser)
          setUser({ ...newUser, createdAt: null as any })
        } else {
          setUser(userSnap.data() as User)
        }
      } else {
        setUser(null)
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [setUser, setFirebaseUser, setLoading])

  return <>{children}</>
}
