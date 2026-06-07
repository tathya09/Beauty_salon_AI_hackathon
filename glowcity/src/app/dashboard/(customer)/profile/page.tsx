'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'

const schema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().regex(/^\+91[6-9]\d{9}$/, 'Enter valid Indian mobile (+91XXXXXXXXXX)').optional().or(z.literal('')),
})
type FormData = z.infer<typeof schema>

export default function ProfilePage() {
  const { user, firebaseUser } = useAuth()
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: '', phone: '' },
  })

  useEffect(() => {
    if (user) reset({ displayName: user.displayName, phone: user.phone ?? '' })
  }, [user, reset])

  async function onSubmit(data: FormData) {
    if (!firebaseUser) return
    try {
      await updateDoc(doc(db, 'users', firebaseUser.uid), {
        displayName: data.displayName,
        phone: data.phone ?? null,
      })
      toast.success('Profile updated!')
    } catch {
      toast.error('Failed to update profile')
    }
  }

  const styleTags = user?.stylePreferences?.extractedTags ?? []

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Display Name</label>
              <Input {...register('displayName')} />
              {errors.displayName && <p className="text-xs text-red-500 mt-1">{errors.displayName.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
              <Input value={user?.email ?? ''} disabled className="bg-gray-50" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Phone</label>
              <Input {...register('phone')} placeholder="+91 98765 43210" />
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>}
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full bg-rose-500 hover:bg-rose-600">
              {isSubmitting ? 'Saving…' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-rose-500" /> Style Profile
            </h2>
            <Link href="/style-match">
              <Button size="sm" variant="outline" className="text-xs border-rose-200 text-rose-500">Update</Button>
            </Link>
          </div>
          {styleTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {styleTags.map((tag) => (
                <Badge key={tag} className="bg-rose-100 text-rose-700 border-rose-200">{tag}</Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              No style preferences yet.{' '}
              <Link href="/style-match" className="text-rose-500 underline">Upload an inspiration photo</Link> to build your style profile.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
