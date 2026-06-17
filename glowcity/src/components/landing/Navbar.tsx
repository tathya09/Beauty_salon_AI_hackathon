'use client'

import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { LogOut, CalendarDays, User, ChevronDown } from 'lucide-react'

export function Navbar() {
  const { firebaseUser, user, signOut } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  async function handleSignOut() {
    setOpen(false)
    await signOut()
    router.push('/')
    router.refresh()
  }

  const displayName = user?.displayName || firebaseUser?.displayName || firebaseUser?.email?.split('@')[0] || 'User'
  const initials = displayName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
  const photoURL = user?.photoURL || firebaseUser?.photoURL

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-rose-500 font-extrabold text-xl">✨ GlowCity</Link>

        <div className="flex items-center gap-3 text-sm">
          <Link href="/salons" className="text-gray-600 hover:text-rose-500 hidden sm:block">Salons</Link>
          <Link href="/ai-assistant" className="text-gray-600 hover:text-rose-500 hidden sm:block">Glow AI</Link>
          <Link href="/style-match" className="text-gray-600 hover:text-rose-500 hidden sm:block">Style Match</Link>

          {firebaseUser ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-full px-3 py-1.5 transition-colors"
              >
                {photoURL ? (
                  <img src={photoURL} alt={displayName} className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-rose-500 text-white text-xs flex items-center justify-center font-semibold">
                    {initials}
                  </div>
                )}
                <span className="text-rose-600 font-medium text-sm max-w-[100px] truncate hidden sm:block">
                  {displayName.split(' ')[0]}
                </span>
                <ChevronDown className={`w-3 h-3 text-rose-400 transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>

              {open && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50">
                  <div className="px-4 py-3 border-b bg-rose-50">
                    <p className="font-semibold text-gray-900 text-sm truncate">{displayName}</p>
                    <p className="text-xs text-gray-500 truncate">{firebaseUser.email}</p>
                  </div>
                  <Link
                    href="/dashboard/bookings"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <CalendarDays className="w-4 h-4 text-rose-400" />
                    My Bookings
                  </Link>
                  <Link
                    href="/dashboard/profile"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <User className="w-4 h-4 text-rose-400" />
                    Profile
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 border-t"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
