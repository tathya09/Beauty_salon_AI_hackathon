import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { SalonCard } from '@/components/discovery/SalonCard'
import { getTopRatedSalons } from '@/lib/repositories/salonRepository'
import type { Salon } from '@/types'

async function getSalons(): Promise<Salon[]> {
  try {
    return await getTopRatedSalons('Mumbai', 6)
  } catch {
    return []
  }
}

export async function FeaturedSalons() {
  const salons = await getSalons()

  if (salons.length === 0) return null

  return (
    <section className="py-16 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Top Salons in Mumbai</h2>
            <p className="text-gray-500 text-sm mt-1">Handpicked, highly rated, verified</p>
          </div>
          <Link href="/salons">
            <Button variant="outline" className="border-rose-200 text-rose-500 hover:bg-rose-50">
              View All →
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 overflow-x-auto">
          {salons.map((salon) => (
            <SalonCard key={salon.id} salon={salon} />
          ))}
        </div>
      </div>
    </section>
  )
}
