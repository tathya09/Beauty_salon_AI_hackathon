import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { SearchBar } from '@/components/discovery/SearchBar'
import { FilterPanel } from '@/components/discovery/FilterPanel'
import { SalonGrid } from '@/components/discovery/SalonGrid'
import { Skeleton } from '@/components/ui/skeleton'
import { getTopRatedSalons } from '@/lib/repositories/salonRepository'
import Link from 'next/link'

const SalonMap = dynamic(
  () => import('@/components/discovery/SalonMap').then((m) => m.SalonMap),
  { ssr: false, loading: () => <Skeleton className="w-full h-full rounded-xl" style={{ minHeight: 400 }} /> }
)

export const revalidate = 300

interface Props {
  searchParams: { q?: string; area?: string }
}

export default async function SalonsPage({ searchParams }: Props) {
  const topSalons = await getTopRatedSalons('Mumbai', 20).catch(() => [])
  const initialQuery = searchParams.q ?? ''
  const initialArea = searchParams.area ?? ''

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky header */}
      <div className="bg-white border-b sticky top-0 z-30 px-4 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-rose-500 font-bold text-xl shrink-0">✨ GlowCity</Link>
            <SearchBar className="flex-1 max-w-xl" initialQuery={initialQuery} initialArea={initialArea} />
          </div>
          <div className="mt-2">
            <FilterPanel />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Grid */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">
                {initialQuery ? (
                  <>Results for <span className="font-semibold text-gray-800">&ldquo;{initialQuery}&rdquo;</span></>
                ) : initialArea ? (
                  <>Salons in <span className="font-semibold text-gray-800">{initialArea}</span></>
                ) : (
                  <>Top salons in <span className="font-semibold text-gray-800">Mumbai</span></>
                )}
              </p>
            </div>
            <Suspense fallback={
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="aspect-[4/3] rounded-xl w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            }>
              <SalonGrid
                initialSalons={topSalons}
                initialQuery={initialQuery}
                initialArea={initialArea}
              />
            </Suspense>
          </div>

          {/* Map */}
          <div className="hidden lg:block w-[400px] shrink-0 sticky top-24" style={{ height: 'calc(100vh - 130px)' }}>
            <SalonMap salons={topSalons} />
          </div>
        </div>
      </div>
    </div>
  )
}
