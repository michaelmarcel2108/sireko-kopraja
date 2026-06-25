'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'

export default function KoperasiLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }
      
      const userRole = user.user_metadata?.role

      if (userRole === 'admin') {
        router.push('/admin/dashboard')
        return
      } else if (userRole !== 'koperasi') {
        // Jika role kosong atau salah ketik, paksa logout/kembali ke login
        await supabase.auth.signOut()
        router.push('/login')
        return
      }
      
      setIsAuthorized(true)
    }
    
    checkAuth()
  }, [router])

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <span className="text-gray-500 font-medium animate-pulse">Memverifikasi akses...</span>
      </div>
    )
  }

  return <>{children}</>
}