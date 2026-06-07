import Link from 'next/link'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-4 py-3 flex items-center gap-4">
        <Link href="/" className="text-rose-500 font-bold text-lg">✨ GlowCity</Link>
        <div className="flex gap-4 text-sm text-gray-600 ml-4">
          <Link href="/dashboard/bookings" className="hover:text-rose-500">My Bookings</Link>
          <Link href="/dashboard/profile" className="hover:text-rose-500">Profile</Link>
          <Link href="/dashboard/overview" className="hover:text-rose-500">Dashboard</Link>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  )
}
