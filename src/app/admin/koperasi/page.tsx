'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import NavbarAdmin from '@/components/NavbarAdmin'

export default function AdminDaftarKoperasi() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [koperasiList, setKoperasiList] = useState<any[]>([])

  useEffect(() => {
    fetchKoperasiData()
  }, [])

  const fetchKoperasiData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return; }

      // 1. Ambil Semua Koperasi
      const { data: kops } = await supabase.from('profil_koperasi').select('*').order('created_at', { ascending: false })
      if (!kops) return

      // 2. Ambil Status Verifikasi Terakhir
      const { data: verifData } = await supabase.from('verifikasi_dinas').select('koperasi_id, status').order('created_at', { ascending: false })
      
      // 3. Ambil Dokumen Keragaan & Kesehatan (Untuk Cek Status Laporan)
      const { data: docKeragaan } = await supabase.from('dokumen_keragaan').select('koperasi_id, status_indikator').order('uploaded_at', { ascending: false })
      const { data: docKesehatan } = await supabase.from('dokumen_kesehatan').select('koperasi_id, status_indikator').order('uploaded_at', { ascending: false })

      // Gabungkan Data
      const combinedData = kops.map(kop => {
        const verifMatch = verifData?.find(v => v.koperasi_id === kop.id)
        const keragaanMatch = docKeragaan?.find(d => d.koperasi_id === kop.id)
        const kesehatanMatch = docKesehatan?.find(d => d.koperasi_id === kop.id)

        return {
          ...kop,
          status_verifikasi: verifMatch?.status || 'menunggu',
          status_keragaan: keragaanMatch?.status_indikator || 'belum_ada',
          status_kesehatan: kesehatanMatch?.status_indikator || 'belum_ada'
        }
      })

      setKoperasiList(combinedData)
    } catch (err) {
      console.error("Gagal memuat daftar koperasi:", err)
    } finally {
      setLoading(false)
    }
  }

  const renderBadge = (status: string, type: string) => {
    if (status === 'belum_ada') return <span className="text-slate-400 text-[11px] italic">Belum Ada File</span>
    
    let colors = 'bg-slate-100 text-slate-600 border-slate-200'
    let label = status

    if (type === 'verifikasi') {
      if (status === 'disetujui') { colors = 'bg-green-100 text-green-800 border-green-200'; label = 'Terverifikasi' }
      if (status === 'menunggu') { colors = 'bg-amber-100 text-amber-800 border-amber-200'; label = 'Menunggu' }
      if (status === 'ditolak') { colors = 'bg-red-100 text-red-800 border-red-200'; label = 'Ditolak' }
    } else {
      if (status === 'hijau') { colors = 'bg-green-100 text-green-800 border-green-200'; label = 'Aman (Hijau)' }
      if (status === 'biru') { colors = 'bg-blue-100 text-blue-800 border-blue-200'; label = 'Diproses (Biru)' }
      if (status === 'merah') { colors = 'bg-red-100 text-red-800 border-red-200'; label = 'Belum Dicek (Merah)' }
    }

    return <span className={`px-2 py-1 rounded border text-[10px] font-bold uppercase shadow-sm ${colors}`}>{label}</span>
  }

  if (loading) return <div className="min-h-screen bg-slate-50 p-8 text-center text-slate-900 font-bold">Memuat Data...</div>

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900">
      <NavbarAdmin />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manajemen Data Koperasi</h1>
          <p className="text-sm text-slate-500 mt-1">Daftar lengkap seluruh koperasi dan status laporannya.</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-slate-700 font-bold">
                <tr>
                  <th className="px-4 py-3 text-left">Nama Koperasi</th>
                  <th className="px-4 py-3 text-left">Nomor Badan Hukum</th>
                  <th className="px-4 py-3 text-center">Status Keragaan</th>
                  <th className="px-4 py-3 text-center">Status Kesehatan</th>
                  <th className="px-4 py-3 text-center">Verifikasi Dinas</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {koperasiList.map((kop: any) => (
                  <tr key={kop.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4 font-semibold text-slate-900">{kop.nama_koperasi}</td>
                    <td className="px-4 py-4 text-slate-600">{kop.nomor_badan_hukum || '-'}</td>
                    <td className="px-4 py-4 text-center">{renderBadge(kop.status_keragaan, 'dokumen')}</td>
                    <td className="px-4 py-4 text-center">{renderBadge(kop.status_kesehatan, 'dokumen')}</td>
                    <td className="px-4 py-4 text-center">{renderBadge(kop.status_verifikasi, 'verifikasi')}</td>
                    <td className="px-4 py-4 text-right">
                      <button 
                        onClick={() => router.push(`/admin/${kop.slug}`)}
                        className="px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold rounded hover:bg-indigo-600 hover:text-white transition-colors"
                      >
                        Detail & Verifikasi
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}