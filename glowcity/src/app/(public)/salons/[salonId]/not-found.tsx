import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function SalonNotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-8">
      <div className="text-5xl mb-4">💇</div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Salon not found</h1>
      <p className="text-gray-500 mb-6">This salon may have moved or been removed.</p>
      <Link href="/salons"><Button className="bg-rose-500 hover:bg-rose-600">Browse Salons</Button></Link>
    </div>
  )
}
