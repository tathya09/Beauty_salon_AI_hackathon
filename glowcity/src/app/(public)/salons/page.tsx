import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { SearchBar } from '@/components/discovery/SearchBar'
import { FilterPanel } from '@/components/discovery/FilterPanel'
import { SalonGrid } from '@/components/discovery/SalonGrid'
import { Skeleton } from '@/components/ui/skeleton'
import { getTopRatedSalons } from '@/lib/repositories/salonRepository'

const SalonMap = dynamic(
  () => import('@/components/discovery/SalonMap').then((m) => m.SalonMap),
  { ssr: false, loading: () => <Skeleton className="w-full h-full rounded-xl" style={{ minHeight: 400 }} /> }
)

export const revalidate = 300 // 5 min ISR

export default async function SalonsPage() {
  const topSalons = await getTopRatedSalons('Mumbai', 20).catch(() => [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-30 px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <a href="/" className="text-rose-500 font-bold text-lg shrink-0">✨ GlowCity</a>
            <SearchBar className="flex-1 max-w-xl" />
          </div>
          <div className="mt-2">
            <FilterPanel />
          </div>
        </div>
      </div>

      {/* Main content — split view */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Grid */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-500 mb-4">
              Showing top salons in <span className="font-medium text-gray-800">Mumbai</span>
            </p>
            <Suspense fallback={
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-[4/3] rounded-lg" />)}
              </div>
            }>
              <SalonGrid initialSalons={topSalons} />
            </Suspense>
          </div>

          {/* Map — hidden on mobile */}
          <div className="hidden lg:block w-[420px] shrink-0 sticky top-24" style={{ height: 'calc(100vh - 120px)' }}>
            <SalonMap salons={topSalons} />
          </div>
        </div>
      </div>
    </div>
  )
}
