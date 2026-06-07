'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { signInWithGoogle, signInWithPhoneOTP } from '@/lib/firebase/auth'
import type { ConfirmationResult } from 'firebase/auth'

const phoneSchema = z.object({
  phone: z.string().regex(/^\+91[6-9]\d{9}$/, 'Enter a valid Indian mobile number (+91XXXXXXXXXX)'),
})

const otpSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits'),
})

type PhoneForm = z.infer<typeof phoneSchema>
type OtpForm = z.infer<typeof otpSchema>

export default function LoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const recaptchaRef = useRef<HTMLDivElement>(null)

  const phoneForm = useForm<PhoneForm>({ resolver: zodResolver(phoneSchema) })
  const otpForm = useForm<OtpForm>({ resolver: zodResolver(otpSchema) })

  async function handleGoogleSignIn() {
    setLoading(true)
    try {
      await signInWithGoogle()
      toast.success('Signed in successfully!')
      router.push('/')
    } catch (err) {
      toast.error('Google sign-in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSendOTP(data: PhoneForm) {
    setLoading(true)
    try {
      const result = await signInWithPhoneOTP(data.phone, 'recaptcha-container')
      setConfirmationResult(result)
      setStep('otp')
      toast.success('OTP sent!')
    } catch (err) {
      toast.error('Failed to send OTP. Check the number and try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOTP(data: OtpForm) {
    if (!confirmationResult) return
    setLoading(true)
    try {
      await confirmationResult.confirm(data.otp)
      toast.success('Verified! Welcome to GlowCity.')
      router.push('/')
    } catch (err) {
      toast.error('Invalid OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-rose-50 p-4">
      <div id="recaptcha-container" ref={recaptchaRef} />
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="text-3xl font-bold text-rose-500 mb-1">✨ GlowCity</div>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>Sign in to book Mumbai&apos;s best salons</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            className="w-full bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-400">or</span>
            </div>
          </div>

          {step === 'phone' ? (
            <form onSubmit={phoneForm.handleSubmit(handleSendOTP)} className="space-y-3">
              <div>
                <Input
                  placeholder="+91 98765 43210"
                  {...phoneForm.register('phone')}
                />
                {phoneForm.formState.errors.phone && (
                  <p className="text-xs text-red-500 mt-1">{phoneForm.formState.errors.phone.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full bg-rose-500 hover:bg-rose-600" disabled={loading}>
                {loading ? 'Sending...' : 'Send OTP'}
              </Button>
            </form>
          ) : (
            <form onSubmit={otpForm.handleSubmit(handleVerifyOTP)} className="space-y-3">
              <p className="text-sm text-gray-500 text-center">Enter the 6-digit OTP sent to your phone</p>
              <Input
                placeholder="123456"
                maxLength={6}
                className="text-center text-lg tracking-widest"
                {...otpForm.register('otp')}
              />
              {otpForm.formState.errors.otp && (
                <p className="text-xs text-red-500 mt-1 text-center">{otpForm.formState.errors.otp.message}</p>
              )}
              <Button type="submit" className="w-full bg-rose-500 hover:bg-rose-600" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify OTP'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-xs text-gray-400"
                onClick={() => setStep('phone')}
              >
                ← Change number
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
