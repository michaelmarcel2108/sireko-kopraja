'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // Tarik role dari metadata Supabase
      const role = data.user?.user_metadata?.role
      
      console.log("🔥 CEK ROLE:", role) // Muncul di Inspect Element -> Console

      if (role === 'admin') {
        alert('Login berhasil sebagai Admin!')
        router.push('/admin/dashboard')
      } else if (role === 'koperasi') {
        alert('Login berhasil sebagai Koperasi!')
        router.push('/koperasi/dashboard')
      } else {
        // JIKA ROLE KOSONG ATAU SALAH, MUNCULKAN ALERT INI
        alert(`❌ Akses Ditolak!\nSistem membaca role kamu sebagai: "${role}"\nHarusnya "koperasi" atau "admin".`)
        await supabase.auth.signOut()
      }
      
    } catch (error: any) {
      alert('Gagal Login: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md border border-gray-100">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Masuk ke SIREKO
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sistem Informasi Rekam Koperasi
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Alamat Email"
              />
            </div>
            <div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Kata Sandi"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 transition-colors"
            >
              {isLoading ? 'Memeriksa Kredensial...' : 'Masuk'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}