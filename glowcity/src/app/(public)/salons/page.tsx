import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { FilterPanel } from '@/components/discovery/FilterPanel'
import { MegaNav } from '@/components/discovery/MegaNav'
import { SalonGrid } from '@/components/discovery/SalonGrid'
import { SearchBar } from '@/components/discovery/SearchBar'
import { Skeleton } from '@/components/ui/skeleton'
import { getTopRatedSalons } from '@/lib/repositories/salonRepository'

// Map loaded client-side only (Leaflet needs window)
const SalonMapWrapper = dynamic(
  () => import('@/components/discovery/SalonMapWrapper').then((m) => m.SalonMapWrapper),
  {
    ssr: false,
    loading: () => <Skeleton className="w-full h-full rounded-xl" style={{ minHeight: 400 }} />,
  }
)

export const revalidate = 300

export default async function SalonsPage() {
  const topSalons = await getTopRatedSalons('Mumbai', 20).catch(() => [])

  return (
    <div className="min-h-screen bg-gray-50">
      <MegaNav />

      {/* Search + Filter bar */}
      <div className="bg-white border-b px-4 py-3 z-20">
        <div className="max-w-7xl mx-auto space-y-2">
          <SearchBar className="max-w-2xl" />
          <FilterPanel />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Salon grid */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-500 mb-4">
              Showing top salons in{' '}
              <span className="font-medium text-gray-800">Mumbai</span>
            </p>
            <Suspense
              fallback={
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-[4/3] rounded-lg" />
                  ))}
                </div>
              }
            >
              <SalonGrid initialSalons={topSalons} />
            </Suspense>
          </div>

          {/* Map — desktop only, sticky */}
          <div
            className="hidden lg:block w-[420px] shrink-0 sticky top-28"
            style={{ height: 'calc(100vh - 150px)' }}
          >
            <SalonMapWrapper initialSalons={topSalons} />
          </div>
        </div>
      </div>
    </div>
  )
}
