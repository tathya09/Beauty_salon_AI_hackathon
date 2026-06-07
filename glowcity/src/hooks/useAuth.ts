'use client'

import { useAuthStore } from '@/store/authStore'
import { signInWithGoogle, signInWithPhoneOTP, signOut } from '@/lib/firebase/auth'

export function useAuth() {
  const { user, firebaseUser, loading } = useAuthStore()

  return {
    user,
    firebaseUser,
    loading,
    isAuthenticated: !!firebaseUser,
    signInWithGoogle,
    signInWithPhone: signInWithPhoneOTP,
    signOut,
  }
}
