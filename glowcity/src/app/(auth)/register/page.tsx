'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { UserRole } from '@/types'

export default function RegisterPage() {
  const router = useRouter()
  const { firebaseUser } = useAuth()
  const [loading, setLoading] = useState(false)

  async function selectRole(role: UserRole) {
    if (!firebaseUser) {
      router.push('/login')
      return
    }
    setLoading(true)
    try {
      await updateDoc(doc(db, 'users', firebaseUser.uid), { role })
      toast.success(role === 'salon_owner' ? 'Welcome, salon owner!' : 'Welcome to GlowCity!')
      router.push(role === 'salon_owner' ? '/dashboard/overview' : '/')
    } catch (err) {
      toast.error('Failed to save your role. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-rose-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="text-3xl font-bold text-rose-500 mb-1">✨ GlowCity</div>
          <CardTitle>How will you use GlowCity?</CardTitle>
          <CardDescription>Choose your account type to get started</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <button
            onClick={() => selectRole('customer')}
            disabled={loading}
            className="w-full p-4 rounded-xl border-2 border-rose-100 hover:border-rose-400 hover:bg-rose-50 text-left transition-all"
          >
            <div className="text-2xl mb-1">💅</div>
            <div className="font-semibold text-gray-900">I&apos;m a customer</div>
            <div className="text-sm text-gray-500">Discover &amp; book beauty salons</div>
          </button>
          <button
            onClick={() => selectRole('salon_owner')}
            disabled={loading}
            className="w-full p-4 rounded-xl border-2 border-rose-100 hover:border-rose-400 hover:bg-rose-50 text-left transition-all"
          >
            <div className="text-2xl mb-1">🏪</div>
            <div className="font-semibold text-gray-900">I own a salon</div>
            <div className="text-sm text-gray-500">Manage bookings &amp; grow your business</div>
          </button>
        </CardContent>
      </Card>
    </div>
  )
}
