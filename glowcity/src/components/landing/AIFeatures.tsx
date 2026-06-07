'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

const features = [
  {
    icon: '✨',
    title: 'Glow AI Chat',
    description: 'Tell our AI what you want in plain English. "Bridal makeup in Andheri under ₹3000" — it finds the best match instantly.',
    cta: 'Try Glow AI',
    href: '/ai-assistant',
    gradient: 'from-rose-50 to-pink-50',
    border: 'border-rose-100',
  },
  {
    icon: '🖼️',
    title: 'Style Matcher',
    description: 'Upload any inspiration photo. Our Gemini Vision AI extracts your style and finds Mumbai salons that can recreate it.',
    cta: 'Match My Style',
    href: '/style-match',
    gradient: 'from-purple-50 to-pink-50',
    border: 'border-purple-100',
  },
  {
    icon: '⚡',
    title: 'Smart Booking',
    description: 'Real-time slot availability, atomic booking (no double-bookings), and instant payment — all under 60 seconds.',
    cta: 'Browse Salons',
    href: '/salons',
    gradient: 'from-amber-50 to-rose-50',
    border: 'border-amber-100',
  },
]

export function AIFeatures() {
  return (
    <section className="py-16 px-4 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-gray-900">Powered by AI ✨</h2>
          <p className="text-gray-500 mt-2 max-w-xl mx-auto">
            GlowCity uses Google Gemini AI to make finding and booking beauty services effortless.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              className={`bg-gradient-to-br ${feature.gradient} border ${feature.border} rounded-2xl p-6 flex flex-col gap-4`}
            >
              <div className="text-4xl">{feature.icon}</div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">{feature.title}</h3>
                <p className="text-gray-500 text-sm mt-1 leading-relaxed">{feature.description}</p>
              </div>
              <Link href={feature.href} className="mt-auto">
                <Button className="w-full bg-rose-500 hover:bg-rose-600 text-sm">
                  {feature.cta}
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
