'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Star, Loader2 } from 'lucide-react'

interface Review {
  id: string
  userId: string
  displayName: string
  rating: number
  comment: string
  createdAt?: { seconds: number }
}

function StarRow({ rating, interactive, onRate }: { rating: number; interactive?: boolean; onRate?: (r: number) => void }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onMouseEnter={() => interactive && setHovered(star)}
          onMouseLeave={() => interactive && setHovered(0)}
          onClick={() => onRate?.(star)}
          className={interactive ? 'transition-transform hover:scale-110' : 'cursor-default'}
        >
          <Star className={`w-5 h-5 transition-colors ${
            star <= (interactive ? hovered || rating : rating)
              ? 'fill-amber-400 stroke-amber-400'
              : 'fill-gray-200 stroke-gray-300'
          }`} />
        </button>
      ))}
    </div>
  )
}

export function SalonReviews({ salonId }: { salonId: string }) {
  const { firebaseUser } = useAuth()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')

  const fetchReviews = useCallback(async () => {
    try {
      const res = await fetch(`/api/reviews?salonId=${salonId}`)
      const data = await res.json()
      setReviews(data.reviews ?? [])
    } catch {
      setReviews([])
    } finally {
      setLoading(false)
    }
  }, [salonId])

  useEffect(() => { fetchReviews() }, [fetchReviews])

  async function submitReview() {
    if (!firebaseUser) { toast.error('Please sign in to leave a review'); return }
    if (!comment.trim()) { toast.error('Please write something'); return }
    setSubmitting(true)
    try {
      const token = await firebaseUser.getIdToken()
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ salonId, rating, comment }),
      })
      if (!res.ok) throw new Error()
      toast.success('Review submitted! 🌟')
      setComment('')
      setRating(5)
      setShowForm(false)
      await fetchReviews()
    } catch {
      toast.error('Failed to submit review')
    } finally {
      setSubmitting(false)
    }
  }

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Reviews</h2>
          {avgRating && (
            <div className="flex items-center gap-2 mt-1">
              <StarRow rating={parseFloat(avgRating)} />
              <span className="text-sm font-semibold text-gray-700">{avgRating}</span>
              <span className="text-sm text-gray-500">({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span>
            </div>
          )}
        </div>
        {firebaseUser && !showForm && (
          <Button
            variant="outline"
            className="border-rose-200 text-rose-500 hover:bg-rose-50 text-sm"
            onClick={() => setShowForm(true)}
          >
            <Star className="w-4 h-4 mr-1" /> Write a Review
          </Button>
        )}
        {!firebaseUser && (
          <a href="/login" className="text-sm text-rose-500 hover:underline">Sign in to review</a>
        )}
      </div>

      {/* Review form */}
      {showForm && (
        <Card className="border-rose-100 bg-rose-50/30">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-medium text-gray-700">Your rating</p>
            <StarRow rating={rating} interactive onRate={setRating} />
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience — service quality, staff, ambience…"
              rows={3}
              className="w-full border border-input rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white"
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-rose-500 hover:bg-rose-600"
                onClick={submitReview}
                disabled={submitting || !comment.trim()}
              >
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Submitting…</> : 'Submit Review'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reviews list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : reviews.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-gray-400">
            <p className="text-3xl mb-2">⭐</p>
            <p className="font-medium text-gray-500">No reviews yet</p>
            <p className="text-sm mt-1">Be the first to share your experience!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-semibold text-sm">
                        {review.displayName?.[0]?.toUpperCase() ?? 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{review.displayName || 'Customer'}</p>
                        {review.createdAt?.seconds && (
                          <p className="text-xs text-gray-400">
                            {new Date(review.createdAt.seconds * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                    </div>
                    <StarRow rating={review.rating} />
                    {review.comment && (
                      <p className="text-sm text-gray-600 mt-2 leading-relaxed">{review.comment}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
