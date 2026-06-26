'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'

export default function NavbarAdmin() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navLinks = [
    { name: 'Dashboard Admin', path: '/admin/dashboard' },
    { name: 'Daftar Koperasi', path: '/admin/koperasi' },
  ]

  return (
    <nav className="bg-slate-900 border-b border-slate-800 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          
          <div className="flex items-center gap-8">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-xl font-black text-white tracking-tight">SIREKO <span className="text-indigo-400">ADMIN</span></span>
            </div>
            <div className="hidden md:flex space-x-4">
              {navLinks.map((link) => {
                const isActive = pathname.startsWith(link.path)
                return (
                  <Link key={link.name} href={link.path} className={`px-3 py-2 rounded-md text-sm font-bold transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                    {link.name}
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-slate-300 hidden lg:block">Dinas Koperasi</span>
              <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-400 transition-colors" title="Keluar">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            </div>
          </div>

        </div>
      </div>
    </nav>
  )
}