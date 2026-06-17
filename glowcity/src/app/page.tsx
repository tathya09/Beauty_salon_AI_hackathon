import { Suspense } from 'react'
import Link from 'next/link'
import { Hero } from '@/components/landing/Hero'
import { FeaturedSalons } from '@/components/landing/FeaturedSalons'
import { AIFeatures } from '@/components/landing/AIFeatures'
import { ChatWidget } from '@/components/ai/ChatWidget'
import { Navbar } from '@/components/landing/Navbar'
import { Skeleton } from '@/components/ui/skeleton'

export const revalidate = 3600

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Navbar />

      <div className="pt-14">
        <Hero />

        <Suspense fallback={
          <section className="py-16 px-4 bg-white">
            <div className="max-w-6xl mx-auto grid grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-video rounded-xl" />
              ))}
            </div>
          </section>
        }>
          <FeaturedSalons />
        </Suspense>

        <AIFeatures />

        <footer className="bg-gray-900 text-gray-400 py-12 px-4">
          <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div>
              <p className="text-white font-bold text-lg mb-2">✨ GlowCity</p>
              <p className="text-sm">Mumbai&apos;s AI-powered beauty salon marketplace.</p>
            </div>
            <div>
              <p className="text-white font-semibold mb-2">Explore</p>
              <ul className="space-y-1 text-sm">
                <li><Link href="/salons" className="hover:text-rose-400">Browse Salons</Link></li>
                <li><Link href="/ai-assistant" className="hover:text-rose-400">Glow AI</Link></li>
                <li><Link href="/style-match" className="hover:text-rose-400">Style Matcher</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-white font-semibold mb-2">Account</p>
              <ul className="space-y-1 text-sm">
                <li><Link href="/login" className="hover:text-rose-400">Sign In</Link></li>
                <li><Link href="/dashboard/bookings" className="hover:text-rose-400">My Bookings</Link></li>
              </ul>
            </div>
          </div>
          <div className="max-w-5xl mx-auto mt-8 pt-8 border-t border-gray-800 text-xs text-center">
            © 2026 GlowCity · SuperXgen AI Startup Buildathon · Powered by Google Gemini
          </div>
        </footer>
      </div>

      <ChatWidget />
    </main>
  )
}
