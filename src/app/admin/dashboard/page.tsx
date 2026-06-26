'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import NavbarAdmin from '@/components/NavbarAdmin'
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts'

export default function AdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [koperasiList, setKoperasiList] = useState<any[]>([])
  const [adminChartData, setAdminChartData] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalKoperasi: 0,
    menungguVerifikasi: 0,
    terverifikasi: 0
  })

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // 1. Cek Login Admin
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return; }

      // 2. Ambil Statistik Angka
      const { count: totalKop } = await supabase.from('profil_koperasi').select('*', { count: 'exact', head: true })
      const { count: verifMenunggu } = await supabase.from('verifikasi_dinas').select('*', { count: 'exact', head: true }).eq('status', 'menunggu')
      const { count: verifDisetujui } = await supabase.from('verifikasi_dinas').select('*', { count: 'exact', head: true }).eq('status', 'disetujui')

      setStats({
        totalKoperasi: totalKop || 0,
        menungguVerifikasi: verifMenunggu || 0,
        terverifikasi: verifDisetujui || 0
      })

      // 3. Ambil Data Keragaan Semua Koperasi untuk Kurva Admin
      const { data: mData } = await supabase
        .from('data_keragaan_metrik')
        .select('created_at, asset, shu, volusaha')
        .order('created_at', { ascending: true })

      if (mData && mData.length > 0) {
        // Mengelompokkan data berdasarkan Bulan/Tahun (Agregasi seluruh koperasi)
        const groupedData = mData.reduce((acc: any, curr: any) => {
          const date = new Date(curr.created_at)
          const key = date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })
          
          if (!acc[key]) {
            acc[key] = { periode: key, Aset: 0, SHU: 0, VolumeUsaha: 0 }
          }
          acc[key].Aset += (curr.asset || 0) / 1000000
          acc[key].SHU += (curr.shu || 0) / 1000000
          acc[key].VolumeUsaha += (curr.volusaha || 0) / 1000000
          return acc
        }, {})
        
        setAdminChartData(Object.values(groupedData))
      }

      // 4. Ambil Daftar Koperasi Terbaru beserta Status Verifikasinya
      const { data: kopData } = await supabase
        .from('profil_koperasi')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)
      
      if (kopData && kopData.length > 0) {
        // Ambil status verifikasi terbaru untuk koperasi-koperasi tersebut
        const kopIds = kopData.map(k => k.id)
        const { data: verifData } = await supabase
          .from('verifikasi_dinas')
          .select('koperasi_id, status')
          .in('koperasi_id', kopIds)
          .order('created_at', { ascending: false })

        // Gabungkan data
        const kopWithStatus = kopData.map(kop => {
          const statusMatch = verifData?.find(v => v.koperasi_id === kop.id)
          return {
            ...kop,
            status_verifikasi: statusMatch ? statusMatch.status : 'belum_ada'
          }
        })

        setKoperasiList(kopWithStatus)
      }

    } catch (err) {
      console.error("Gagal memuat data dashboard admin:", err)
    } finally {
      setLoading(false)
    }
  }

  // Komponen untuk me-render Badge Status Verifikasi di Tabel
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'disetujui':
        return <span className="px-2.5 py-1 bg-green-100 text-green-800 border border-green-200 rounded-md text-[11px] font-bold uppercase shadow-sm">Terverifikasi</span>
      case 'menunggu':
        return <span className="px-2.5 py-1 bg-amber-100 text-amber-800 border border-amber-200 rounded-md text-[11px] font-bold uppercase shadow-sm">Menunggu Cek</span>
      case 'ditolak':
        return <span className="px-2.5 py-1 bg-red-100 text-red-800 border border-red-200 rounded-md text-[11px] font-bold uppercase shadow-sm">Ditolak</span>
      default:
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-md text-[11px] font-bold uppercase shadow-sm">Belum Ada Data</span>
    }
  }

  if (loading) return <div className="min-h-screen bg-slate-50 p-8 text-center text-slate-900 font-bold">Memuat Dashboard Admin...</div>

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900">
      
      {/* PEMANGGILAN KOMPONEN NAVBAR */}
      <NavbarAdmin />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* HEADER DASHBOARD */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard Admin Dinas</h1>
          <p className="text-sm text-slate-500 mt-1">Pantau performa agregat dan kelola status verifikasi seluruh koperasi di Kabupaten Buleleng.</p>
        </div>

        {/* WIDGET STATISTIK (OUTLINE ABU HALUS) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center gap-4 hover:border-slate-300 transition-colors">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total Koperasi</p>
              <h2 className="text-3xl font-black text-slate-800">{stats.totalKoperasi}</h2>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center gap-4 hover:border-slate-300 transition-colors">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-full">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Menunggu Verifikasi</p>
              <h2 className="text-3xl font-black text-slate-800">{stats.menungguVerifikasi}</h2>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center gap-4 hover:border-slate-300 transition-colors">
            <div className="p-3 bg-green-50 text-green-600 rounded-full">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Terverifikasi</p>
              <h2 className="text-3xl font-black text-slate-800">{stats.terverifikasi}</h2>
            </div>
          </div>
        </div>

        {/* KURVA AGREGAT KERAGAAN SEMUA KOPERASI */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">Kurva Pertumbuhan Keragaan (Agregat Buleleng)</h2>
            <p className="text-sm text-slate-500">Grafik ini merupakan gabungan total dari Aset, SHU, dan Volume Usaha dari seluruh koperasi yang melaporkan data ke SIREKO. (Nilai dalam Jutaan Rupiah)</p>
          </div>
          
          <div className="h-80 w-full">
            {adminChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={adminChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="periode" tick={{fontSize: 12, fill: '#64748b'}} tickMargin={10} />
                  <YAxis tick={{fontSize: 12, fill: '#64748b'}} />
                  <Tooltip formatter={(value: any) => [`Rp ${Number(value || 0).toFixed(2)} Juta`, '']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Line type="monotone" dataKey="Aset" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Total Aset Gabungan" />
                  <Line type="monotone" dataKey="VolumeUsaha" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Total Vol. Usaha Gabungan" />
                  <Line type="monotone" dataKey="SHU" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Total SHU Gabungan" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm italic border-2 border-dashed border-slate-200 rounded-lg">
                Belum ada data keragaan dari koperasi yang dapat diagregasi.
              </div>
            )}
          </div>
        </div>

        {/* TABEL DATA KOPERASI (DENGAN STATUS & TOMBOL DETAIL) */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Data Koperasi Terbaru</h2>
              <p className="text-sm text-slate-500">Daftar koperasi yang terakhir mendaftar atau mengirimkan pembaruan data.</p>
            </div>
            <button 
              onClick={() => router.push('/admin/koperasi')}
              className="text-sm font-bold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
            >
              Lihat Semua Data &rarr;
            </button>
          </div>
          
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-slate-700 font-bold">
                <tr>
                  <th className="px-4 py-3 text-left">Nama Koperasi</th>
                  <th className="px-4 py-3 text-left">Nomor Badan Hukum</th>
                  <th className="px-4 py-3 text-left">Tanggal Daftar</th>
                  <th className="px-4 py-3 text-center">Status Verifikasi</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {koperasiList.length > 0 ? (
                  koperasiList.map((kop: any) => (
                    <tr key={kop.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900">{kop.nama_koperasi}</td>
                      <td className="px-4 py-3 text-slate-600">{kop.nomor_badan_hukum || '-'}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {new Date(kop.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {/* Menampilkan Status Verifikasi */}
                        {renderStatusBadge(kop.status_verifikasi)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button 
                          onClick={() => router.push(`/admin/${kop.slug}`)}
                          className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-600 text-xs font-bold rounded hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
                        >
                          Detail Cek Data
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500 italic">Belum ada data koperasi terdaftar.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}