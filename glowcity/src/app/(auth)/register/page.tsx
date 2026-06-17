'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v4'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { registerWithEmail, signInWithGoogle } from '@/lib/firebase/auth'
import type { UserRole } from '@/types'

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message
  return fallback
}

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type RegisterForm = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [role, setRole] = useState<UserRole>('customer')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) })

  async function onSubmit(data: RegisterForm) {
    setLoading(true)
    try {
      const user = await registerWithEmail(data.name, data.email, data.password)
      const idToken = await user.getIdToken()

      // Sync to backend — creates Firestore user doc with chosen role
      const res = await fetch('/api/auth/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, displayName: data.name, role }),
      })

      const resData = await res.json()
      if (!res.ok) {
        console.error('Backend sync error:', resData)
        // Firebase Auth succeeded — user exists. Still redirect.
        // The AuthProvider will create the Firestore doc as fallback.
      }

      toast.success(`Welcome to GlowCity, ${data.name}!`)
      router.push(role === 'salon_owner' ? '/dashboard/overview' : '/')
    } catch (error: unknown) {
      console.error('Registration error:', error)
      toast.error(getErrorMessage(error, 'Registration failed. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    try {
      const user = await signInWithGoogle()
      const idToken = await user.getIdToken()
      const res = await fetch('/api/auth/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, displayName: user.displayName, role }),
      })
      const data = await res.json()

      if (!data.isNewUser) {
        toast.success(`Welcome back, ${user.displayName || 'there'}!`)
        router.push('/')
      } else {
        toast.success(`Welcome to GlowCity, ${user.displayName || 'there'}!`)
        router.push(role === 'salon_owner' ? '/dashboard/overview' : '/')
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Google sign-up failed.'))
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-rose-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-1">
          <div className="text-3xl font-bold text-rose-500 mb-1">✨ GlowCity</div>
          <CardTitle className="text-2xl">Create an account</CardTitle>
          <CardDescription>Join Mumbai&apos;s beauty marketplace</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Role selector */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole('customer')}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                role === 'customer'
                  ? 'border-rose-400 bg-rose-50'
                  : 'border-gray-100 hover:border-rose-200'
              }`}
            >
              <div className="text-xl mb-0.5">💅</div>
              <div className="text-sm font-semibold text-gray-900">Customer</div>
              <div className="text-xs text-gray-400">Book salons</div>
            </button>
            <button
              type="button"
              onClick={() => setRole('salon_owner')}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                role === 'salon_owner'
                  ? 'border-rose-400 bg-rose-50'
                  : 'border-gray-100 hover:border-rose-200'
              }`}
            >
              <div className="text-xl mb-0.5">🏪</div>
              <div className="text-sm font-semibold text-gray-900">Salon Owner</div>
              <div className="text-xs text-gray-400">Manage bookings</div>
            </button>
          </div>

          {/* Google */}
          <Button
            className="w-full bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 h-11"
            variant="outline"
            onClick={handleGoogle}
            disabled={googleLoading || loading}
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Sign up with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-400">or sign up with email</span>
            </div>
          </div>

          {/* Registration form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div>
              <Input
                placeholder="Your full name"
                autoComplete="name"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Input
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a password (min. 6 chars)"
                autoComplete="new-password"
                className="pr-10"
                {...register('password')}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              {errors.password && (
                <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>
              )}
            </div>

            <div className="relative">
              <Input
                type={showConfirm ? 'text' : 'password'}
                placeholder="Confirm your password"
                autoComplete="new-password"
                className="pr-10"
                {...register('confirmPassword')}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowConfirm((v) => !v)}
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              {errors.confirmPassword && (
                <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-rose-500 hover:bg-rose-600 h-11 text-base font-medium"
              disabled={loading || googleLoading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="text-rose-500 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
