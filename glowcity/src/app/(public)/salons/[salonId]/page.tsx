import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Star, MapPin, Clock, ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getSalonById } from '@/lib/repositories/salonRepository'
import { formatINR } from '@/utils/format'

export const revalidate = 3600

interface Props { params: { salonId: string } }

export default async function SalonDetailPage({ params }: Props) {
  const salon = await getSalonById(params.salonId).catch(() => null)
  if (!salon) notFound()

  const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back nav */}
      <div className="bg-white border-b px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link href="/salons" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="font-medium text-gray-800 truncate">{salon.name}</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Hero image */}
        <div className="relative aspect-[16/6] rounded-2xl overflow-hidden">
          <Image
            src={salon.coverImage || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200'}
            alt={salon.name}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute bottom-4 left-4 text-white">
            <h1 className="text-2xl font-bold">{salon.name}</h1>
            <div className="flex items-center gap-2 text-sm mt-1">
              <MapPin className="w-4 h-4" />
              <span>{salon.area}, Mumbai</span>
              <span className="opacity-60">·</span>
              <Star className="w-4 h-4 fill-amber-400 stroke-amber-400" />
              <span>{salon.rating.toFixed(1)} ({salon.reviewCount} reviews)</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: services + hours */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {salon.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-rose-600 border-rose-200">{tag}</Badge>
              ))}
            </div>

            {/* Services */}
            <div>
              <h2 className="text-lg font-semibold mb-3">Services</h2>
              <div className="space-y-2">
                {salon.services.map((svc) => (
                  <Card key={svc.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{svc.name}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>{svc.duration} min</span>
                          <Badge variant="outline" className="text-xs">{svc.category}</Badge>
                        </div>
                        {svc.description && <p className="text-xs text-gray-400 mt-1">{svc.description}</p>}
                      </div>
                      <span className="font-semibold text-gray-800 shrink-0 ml-4">{formatINR(svc.price)}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Hours */}
            <div>
              <h2 className="text-lg font-semibold mb-3">Opening Hours</h2>
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-1">
                    {days.map((day) => {
                      const h = salon.openingHours?.[day]
                      return (
                        <div key={day} className="flex justify-between text-sm">
                          <span className="capitalize text-gray-600 w-28">{day}</span>
                          <span className={h?.closed ? 'text-red-400' : 'text-gray-800'}>
                            {h?.closed ? 'Closed' : `${h?.open ?? ''} – ${h?.close ?? ''}`}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right: Book CTA */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardContent className="p-5 space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Starting from</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {salon.services.length
                      ? formatINR(Math.min(...salon.services.map((s) => s.price)))
                      : '—'}
                  </p>
                </div>
                <Link href={`/salons/${salon.id}/book`} className="block">
                  <Button className="w-full bg-rose-500 hover:bg-rose-600 text-white py-3">
                    Book Appointment
                  </Button>
                </Link>
                <p className="text-xs text-gray-400 text-center">Free cancellation up to 2 hours before</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
