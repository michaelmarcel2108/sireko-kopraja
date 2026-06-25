'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

export default function KoperasiDashboard() {
  const router = useRouter()
  const [verifikasiDocs, setVerifikasiDocs] = useState<any[]>([])
  
  // State Diagram & Metrik CSV
  const [keragaanStats, setKeragaanStats] = useState({ merah: 0, biru: 0, hijau: 0 })
  const [kesehatanStats, setKesehatanStats] = useState({ merah: 0, biru: 0, hijau: 0 })
  const [metrikData, setMetrikData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDataDashboard()
  }, [])

  const fetchDataDashboard = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profil } = await supabase
        .from('profil_koperasi')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (profil) {
        // Tarik Data Metrik dari hasil Import CSV (Pencocokan via Nomor Badan Hukum)
        if (profil.nomor_badan_hukum) {
          const { data: metrik } = await supabase
            .from('data_keragaan_metrik')
            .select('*')
            .eq('nobh', profil.nomor_badan_hukum)
            .single()
          if (metrik) setMetrikData(metrik)
        }

        const { data: verif } = await supabase.from('verifikasi_dinas').select('*').eq('koperasi_id', profil.id).order('created_at', { ascending: false })
        if (verif) setVerifikasiDocs(verif)

        const { data: keragaan } = await supabase.from('dokumen_keragaan').select('status_indikator').eq('koperasi_id', profil.id)
        if (keragaan) {
          const stats = { merah: 0, biru: 0, hijau: 0 }
          keragaan.forEach((d: any) => stats[d.status_indikator as keyof typeof stats]++)
          setKeragaanStats(stats)
        }

        const { data: kesehatan } = await supabase.from('dokumen_kesehatan').select('status_indikator').eq('koperasi_id', profil.id)
        if (kesehatan) {
          const stats = { merah: 0, biru: 0, hijau: 0 }
          kesehatan.forEach((d: any) => stats[d.status_indikator as keyof typeof stats]++)
          setKesehatanStats(stats)
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const formatRp = (angka: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0)

  const formatChartData = (stats: { merah: number, biru: number, hijau: number }) => {
    return [
      { name: 'Belum Dilihat (Merah)', value: stats.merah, color: '#fee2e2' },
      { name: 'Diproses (Biru)', value: stats.biru, color: '#dbeafe' },
      { name: 'Terverifikasi (Hijau)', value: stats.hijau, color: '#dcfce3' },
    ].filter(item => item.value > 0)
  }

  const strokeColors: any = { '#fee2e2': '#ef4444', '#dbeafe': '#3b82f6', '#dcfce3': '#22c55e' }
  const dataKeragaan = formatChartData(keragaanStats)
  const dataKesehatan = formatChartData(kesehatanStats)

  return (
    <div className="min-h-screen bg-gray-100 pb-12">
      <nav className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <span className="text-xl font-bold text-gray-900">Dashboard Koperasi</span>
            <button onClick={handleLogout} className="rounded bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-100">
              Keluar
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        
        {/* DATA METRIK DARI EXCEL */}
        {metrikData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-blue-500">
              <p className="text-xs text-gray-500 font-bold uppercase">Total Aset</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{formatRp(metrikData.asset)}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-green-500">
              <p className="text-xs text-gray-500 font-bold uppercase">Sisa Hasil Usaha (SHU)</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{formatRp(metrikData.shu)}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-indigo-500">
              <p className="text-xs text-gray-500 font-bold uppercase">Volume Usaha</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{formatRp(metrikData.volusaha)}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-orange-500">
              <p className="text-xs text-gray-500 font-bold uppercase">Total Anggota</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{(metrikData.ang_laki || 0) + (metrikData.ang_wanita || 0)} <span className="text-sm font-normal">Orang</span></p>
            </div>
          </div>
        )}

        {/* SECTION DIAGRAM */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Status Dokumen Saya</h2>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-gray-500">Memuat diagram...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="h-72 bg-gray-50 rounded-lg border border-gray-100 p-4 flex flex-col">
                <h3 className="text-sm font-bold text-center text-gray-700 mb-2">Keragaan Koperasi</h3>
                <div className="flex-1 w-full">
                  {dataKeragaan.length === 0 ? <div className="h-full flex items-center justify-center text-sm text-gray-400 italic">Belum ada dokumen keragaan</div> : (
                    <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={dataKeragaan} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">{dataKeragaan.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} stroke={strokeColors[entry.color]} strokeWidth={2} />))}</Pie><Tooltip /><Legend verticalAlign="bottom" height={36} /></PieChart></ResponsiveContainer>
                  )}
                </div>
              </div>
              <div className="h-72 bg-gray-50 rounded-lg border border-gray-100 p-4 flex flex-col">
                <h3 className="text-sm font-bold text-center text-gray-700 mb-2">Kesehatan Koperasi</h3>
                <div className="flex-1 w-full">
                  {dataKesehatan.length === 0 ? <div className="h-full flex items-center justify-center text-sm text-gray-400 italic">Belum ada dokumen kesehatan</div> : (
                    <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={dataKesehatan} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">{dataKesehatan.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} stroke={strokeColors[entry.color]} strokeWidth={2} />))}</Pie><Tooltip /><Legend verticalAlign="bottom" height={36} /></PieChart></ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* VERIFIKASI DINAS */}
        <div className="bg-green-50 p-6 rounded-xl shadow-sm border border-green-200">
          <h2 className="text-lg font-bold text-green-900 mb-4">Surat Pernyataan Terverifikasi dari Dinas</h2>
          {verifikasiDocs.length === 0 ? (
            <p className="text-sm text-green-700 italic">Belum ada surat verifikasi yang diterbitkan oleh Dinas.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {verifikasiDocs.map(doc => (
                <div key={doc.id} className="flex justify-between items-center bg-white p-4 rounded-lg border border-green-100 shadow-sm">
                  <div>
                    <p className="text-sm font-bold text-gray-900 capitalize">Verifikasi {doc.kategori}</p>
                    <p className="text-xs text-gray-500">{new Date(doc.created_at).toLocaleDateString('id-ID')}</p>
                  </div>
                  <a href={doc.file_path} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 transition-colors">Unduh File</a>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-indigo-500 transition-all cursor-pointer group" onClick={() => router.push('/koperasi/keragaan')}>
            <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600">Modul Keragaan</h3>
            <p className="text-sm text-gray-500 mt-1">Input file laporan bulanan, triwulan, semester, dan tahunan.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-indigo-500 transition-all cursor-pointer group" onClick={() => router.push('/koperasi/kesehatan')}>
            <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600">Modul Kesehatan</h3>
            <p className="text-sm text-gray-500 mt-1">Pengisian lembar kerja ODS, surat pernyataan, dan verifikasi.</p>
          </div>
        </div>
      </main>
    </div>
  )
}