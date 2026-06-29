'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'

export default function NavbarKoperasi() {
  const pathname = usePathname()
  const router = useRouter()
  const [profil, setProfil] = useState<any>(null)
  const [statusVerifikasi, setStatusVerifikasi] = useState<any>(null)

  useEffect(() => {
    fetchHeaderData()
  }, [])

  const fetchHeaderData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: pData } = await supabase.from('profil_koperasi').select('*').eq('user_id', user.id).single()
    if (pData) {
      setProfil(pData)
      const { data: verifData } = await supabase
        .from('verifikasi_dinas')
        .select('status')
        .eq('koperasi_id', pData.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      setStatusVerifikasi(verifData)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navLinks = [
    { name: 'Dashboard', path: '/koperasi/dashboard' },
    { name: 'Keragaan', path: '/koperasi/keragaan' },
    { name: 'Kesehatan', path: '/koperasi/kesehatan' },
    { name: 'Pengaturan Akun', path: '/koperasi/pengaturan' },
  ]

  return (
    <nav className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          
          {/* Bagian Kiri: Logo & Menu */}
          <div className="flex items-center gap-8">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-xl font-black text-indigo-700 tracking-tight">SIREKO</span>
            </div>
            <div className="hidden md:flex space-x-4">
              {navLinks.map((link) => {
                const isActive = pathname === link.path
                return (
                  <Link key={link.name} href={link.path} className={`px-3 py-2 rounded-md text-sm font-bold transition-colors ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                    {link.name}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Bagian Kanan: Status Verifikasi & Profil */}
          <div className="flex items-center gap-4">
            {/* Badge Verifikasi */}
            {statusVerifikasi?.status === 'disetujui' ? (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-800 border border-green-200 rounded-full text-xs font-bold shadow-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                Terverifikasi Dinas
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-800 border border-amber-200 rounded-full text-xs font-bold shadow-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                Belum Terverifikasi
              </div>
            )}

            {/* Nama Koperasi & Logout */}
            <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
              <span className="text-sm font-bold text-slate-700 hidden lg:block">{profil?.nama_koperasi || 'Memuat...'}</span>
              <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-600 transition-colors" title="Keluar">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            </div>
          </div>

        </div>
      </div>
    </nav>
  )
}