'use client'

import { useAuthStore } from '@/store/authStore'
import { signInWithGoogle, signInWithEmail, registerWithEmail, signOut as firebaseSignOut } from '@/lib/firebase/auth'

export function useAuth() {
  const { user, firebaseUser, loading } = useAuthStore()

  async function signOut() {
    // Clear session cookie then sign out of Firebase
    await fetch('/api/auth/user', { method: 'DELETE' }).catch(() => {})
    await firebaseSignOut()
  }

  return {
    user,
    firebaseUser,
    loading,
    isAuthenticated: !!firebaseUser,
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    signOut,
  }
}
