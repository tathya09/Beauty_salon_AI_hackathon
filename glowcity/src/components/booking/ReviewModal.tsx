'use client'

import { useState } from 'react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Star, X, Loader2 } from 'lucide-react'
import type { Booking } from '@/types'

type BookingWithMeta = Booking & { salonName?: string; serviceName?: string }

interface ReviewModalProps {
  booking: BookingWithMeta
  onClose: () => void
  onSuccess: () => void
}

export function ReviewModal({ booking, onClose, onSuccess }: ReviewModalProps) {
  const { user, firebaseUser } = useAuth()
  const [rating, setRating] = useState(5)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!firebaseUser) { toast.error('Please sign in'); return }
    if (!comment.trim()) { toast.error('Please write a review'); return }

    setLoading(true)
    try {
      await addDoc(collection(db, 'salons', booking.salonId, 'reviews'), {
        userId: firebaseUser.uid,
        userName: user?.displayName || firebaseUser.displayName || 'Customer',
        userEmail: firebaseUser.email,
        rating,
        comment: comment.trim(),
        salonId: booking.salonId,
        bookingId: booking.id,
        serviceName: booking.serviceName ?? '',
        createdAt: serverTimestamp(),
      })
      toast.success('Review submitted! Thank you 🌟')
      onSuccess()
    } catch (err) {
      console.error('Review error:', err)
      toast.error('Failed to submit review. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Rate your experience</CardTitle>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {booking.salonName} · {booking.serviceName}
          </p>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Star rating */}
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700 mb-3">How was your experience?</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-10 h-10 transition-colors ${
                      star <= (hovered || rating)
                        ? 'fill-amber-400 stroke-amber-400'
                        : 'fill-gray-200 stroke-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {rating === 5 ? 'Excellent! 🌟' : rating === 4 ? 'Great! 😊' : rating === 3 ? 'Good 👍' : rating === 2 ? 'Fair 😐' : 'Poor 😞'}
            </p>
          </div>

          {/* Comment */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Your review</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell others about your experience — the service quality, staff, ambience…"
              rows={4}
              className="w-full border border-input rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-rose-400"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{comment.length}/300</p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              className="flex-1 bg-rose-500 hover:bg-rose-600"
              onClick={handleSubmit}
              disabled={loading || !comment.trim()}
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Submitting…</> : 'Submit Review'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
