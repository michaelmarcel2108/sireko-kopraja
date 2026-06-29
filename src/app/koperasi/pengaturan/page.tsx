'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import NavbarKoperasi from '@/components/NavbarKoperasi'

export default function PengaturanAkun() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pesan, setPesan] = useState({ text: '', type: '' })

  // State untuk form
  const [profilId, setProfilId] = useState('')
  const [namaKoperasi, setNamaKoperasi] = useState('')
  const [email, setEmail] = useState('')
  const [passwordBaru, setPasswordBaru] = useState('')
  const [konfirmasiPassword, setKonfirmasiPassword] = useState('')

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    try {
      // 1. Ambil data Auth (Email)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setEmail(user.email || '')

      // 2. Ambil data Profil (Nama Koperasi)
      const { data: profil } = await supabase
        .from('profil_koperasi')
        .select('id, nama_koperasi')
        .eq('user_id', user.id)
        .single()

      if (profil) {
        setProfilId(profil.id)
        setNamaKoperasi(profil.nama_koperasi || '')
      }
      
    } catch (error) {
      console.error('Gagal mengambil data user:', error)
    } finally {
      setLoading(false)
    }
  }

  // Cari fungsi ini dan timpa (replace) dengan kode di bawah:
  const handleUpdateAkun = async (e: React.FormEvent) => {
    e.preventDefault()
    setPesan({ text: '', type: '' })

    // Validasi Password jika diisi
    if (passwordBaru && passwordBaru !== konfirmasiPassword) {
      setPesan({ text: 'Password baru dan konfirmasi tidak cocok!', type: 'error' })
      return
    }
    if (passwordBaru && passwordBaru.length < 6) {
      setPesan({ text: 'Password minimal harus 6 karakter!', type: 'error' })
      return
    }

    setIsSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Anda belum login")

      // Kirim data ke API VIP kita
      const response = await fetch('/api/update-akun', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          profilId: profilId,
          namaKoperasi: namaKoperasi,
          email: email,
          password: passwordBaru
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Terjadi kesalahan pada server")
      }

      setPesan({ 
        text: 'Data profil dan ID Login (Email) berhasil diperbarui seketika!', 
        type: 'success' 
      })
      
      // Kosongkan form password setelah berhasil
      setPasswordBaru('')
      setKonfirmasiPassword('')

      // Opsional: Memaksa update session lokal Supabase
      await supabase.auth.refreshSession()

    } catch (error: any) {
      setPesan({ text: error.message || 'Gagal memperbarui pengaturan', type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) return <div className="min-h-screen bg-slate-50 p-8 text-center text-slate-900 font-bold">Memuat Pengaturan...</div>

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900">
      <NavbarKoperasi />

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pengaturan Akun & Profil</h1>
          <p className="text-sm text-slate-500 mt-1">Perbarui Nama Koperasi, ID Login (Email), dan Password Anda di sini.</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          {pesan.text && (
            <div className={`p-4 mb-6 rounded-lg text-sm font-bold ${pesan.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
              {pesan.text}
            </div>
          )}

          <form onSubmit={handleUpdateAkun} className="space-y-8">
            
            {/* Bagian Ubah Profil Koperasi */}
            <div className="border-b border-slate-100 pb-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4">Informasi Dasar Koperasi</h2>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nama Koperasi</label>
                <input 
                  type="text" 
                  value={namaKoperasi}
                  onChange={(e) => setNamaKoperasi(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-md font-medium focus:border-indigo-500 transition-colors"
                  required
                />
              </div>
            </div>

            {/* Bagian Ubah ID / Email */}
            <div className="border-b border-slate-100 pb-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4">Ubah ID Login (Email)</h2>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Email Saat Ini</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-md font-medium focus:border-indigo-500 focus:bg-white transition-colors"
                  required
                />
                <p className="text-xs text-slate-500 mt-1.5">Gunakan email ini untuk login ke aplikasi SIREKO.</p>
              </div>
            </div>

            {/* Bagian Ubah Password */}
            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-4">Ubah Password</h2>
              <p className="text-xs text-slate-500 mb-4">Kosongkan bagian ini jika Anda tidak ingin mengubah password.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Password Baru</label>
                  <input 
                    type="password" 
                    value={passwordBaru}
                    onChange={(e) => setPasswordBaru(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-md focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Konfirmasi Password Baru</label>
                  <input 
                    type="password" 
                    value={konfirmasiPassword}
                    onChange={(e) => setKonfirmasiPassword(e.target.value)}
                    placeholder="Ketik ulang password baru"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-md focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Tombol Simpan */}
            <div className="pt-4 flex justify-end">
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  )
}