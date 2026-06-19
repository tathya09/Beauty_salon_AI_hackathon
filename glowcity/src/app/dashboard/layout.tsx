'use client'

import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useRouter, usePathname } from 'next/navigation'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const isOwner = user?.role === 'salon_owner'

  const customerLinks = [
    { href: '/dashboard/bookings', label: '📋 My Bookings' },
    { href: '/dashboard/profile', label: '👤 Profile' },
  ]
  const ownerLinks = [
    { href: '/dashboard/overview', label: '📊 Dashboard' },
    { href: '/dashboard/slots', label: '🗓️ Slots' },
    { href: '/dashboard/ai-copy', label: '✨ AI Copy' },
  ]

  const links = isOwner ? ownerLinks : customerLinks

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-rose-500 font-bold text-lg">✨ GlowCity</Link>
            <div className="hidden sm:flex gap-4">
              {links.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={`text-sm font-medium transition-colors ${
                    pathname === href ? 'text-rose-500' : 'text-gray-600 hover:text-rose-500'
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isOwner && (
              <Link href="/salons" className="text-xs text-gray-500 hover:text-rose-500 hidden sm:block">
                View Marketplace
              </Link>
            )}
            {!isOwner && (
              <Link href="/salons" className="text-xs text-gray-500 hover:text-rose-500 hidden sm:block">
                Browse Salons
              </Link>
            )}
            <span className="text-sm text-gray-600 hidden sm:block">
              {user?.displayName?.split(' ')[0] ?? 'User'}
            </span>
            <button
              onClick={async () => { await signOut(); router.push('/') }}
              className="text-xs text-red-400 hover:text-red-600 border border-red-100 rounded-full px-3 py-1"
            >
              Sign Out
            </button>
          </div>
        </div>
        {/* Mobile nav */}
        <div className="sm:hidden flex gap-4 mt-2 overflow-x-auto pb-1">
          {links.map(({ href, label }) => (
            <Link key={href} href={href} className={`text-sm whitespace-nowrap ${pathname === href ? 'text-rose-500 font-medium' : 'text-gray-500'}`}>
              {label}
            </Link>
          ))}
        </div>
      </nav>
      <main>{children}</main>
    </div>
  )
}
