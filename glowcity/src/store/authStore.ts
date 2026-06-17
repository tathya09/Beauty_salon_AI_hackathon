import { create } from 'zustand'
import type { User } from '@/types'
import type { User as FirebaseUser } from 'firebase/auth'

interface AuthState {
  user: User | null
  firebaseUser: FirebaseUser | null
  loading: boolean
  setUser: (user: User | null) => void
  setFirebaseUser: (firebaseUser: FirebaseUser | null) => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  firebaseUser: null,
  loading: true,
  setUser: (user) => set({ user }),
  setFirebaseUser: (firebaseUser) => set({ firebaseUser }),
  setLoading: (loading) => set({ loading }),
}))
