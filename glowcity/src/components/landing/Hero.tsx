'use client'

import { motion } from 'framer-motion'
import { SearchBar } from '@/components/discovery/SearchBar'
import { Sparkles } from 'lucide-react'

export function Hero() {
  return (
    <section className="relative min-h-[85vh] flex items-center overflow-hidden bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
      {/* Decorative blobs */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-rose-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-pink-200/40 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-4xl mx-auto px-6 py-20 text-center w-full">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 bg-rose-100 text-rose-600 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <Sparkles className="w-4 h-4" />
            AI-Powered Beauty Marketplace · Mumbai
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-4">
            Book Mumbai&apos;s Best
            <br />
            <span className="text-rose-500">Salons in 60 Seconds</span>
          </h1>

          <p className="text-lg text-gray-500 max-w-xl mx-auto mb-8">
            Discover top-rated beauty salons near you, get AI-powered style recommendations, and book instantly — no calls needed.
          </p>

          <div className="max-w-xl mx-auto">
            <SearchBar
              navigateOnSubmit
              placeholder="Try 'bridal makeup Andheri' or 'balayage Bandra'…"
              className="shadow-lg"
            />
          </div>

          <div className="flex flex-wrap justify-center gap-3 mt-6 text-sm text-gray-500">
            {['Bandra', 'Andheri', 'Juhu', 'Colaba', 'Powai', 'Khar'].map((area) => (
              <a
                key={area}
                href={`/salons?area=${area}`}
                className="bg-white/80 border border-gray-200 rounded-full px-3 py-1 hover:border-rose-300 hover:text-rose-500 transition-colors"
              >
                📍 {area}
              </a>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex justify-center gap-8 mt-12 text-center"
        >
          {[
            { value: '200+', label: 'Verified Salons' },
            { value: '50K+', label: 'Happy Customers' },
            { value: '4.8★', label: 'Average Rating' },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
