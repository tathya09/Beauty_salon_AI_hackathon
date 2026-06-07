import { create } from 'zustand'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  firebaseUser: any | null
  loading: boolean
  setUser: (user: User | null) => void
  setFirebaseUser: (firebaseUser: any | null) => void
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
