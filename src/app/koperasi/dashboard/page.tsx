'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts'
import NavbarKoperasi from '@/components/NavbarKoperasi'

export default function KoperasiDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [keragaanChartData, setKeragaanChartData] = useState<any[]>([])
  const [kesehatanList, setKesehatanList] = useState<any[]>([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return; }

      const { data: pData } = await supabase.from('profil_koperasi').select('*').eq('user_id', user.id).single()
      
      if (pData) {
        if (pData.nomor_badan_hukum) {
          const { data: mData } = await supabase
            .from('data_keragaan_metrik')
            .select('created_at, asset, shu, volusaha')
            .eq('nobh', pData.nomor_badan_hukum)
            .order('created_at', { ascending: true })

          if (mData) {
            const formattedData = mData.map((item: any) => ({
              periode: new Date(item.created_at).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }),
              Aset: (item.asset || 0) / 1000000, 
              SHU: (item.shu || 0) / 1000000,
              VolumeUsaha: (item.volusaha || 0) / 1000000
            }))
            setKeragaanChartData(formattedData)
          }
        }

        const { data: kData } = await supabase
          .from('dokumen_kesehatan')
          .select('*')
          .eq('koperasi_id', pData.id)
          .order('uploaded_at', { ascending: false })
          .limit(5)
        
        if (kData) setKesehatanList(kData)
      }
    } catch (err) {
      console.error("Gagal memuat dashboard:", err)
    } finally {
      setLoading(false)
    }
  }

  const renderBadge = (status: string) => {
    const colors: any = { 
      merah: 'bg-red-100 text-red-800 border-red-200', 
      biru: 'bg-blue-100 text-blue-800 border-blue-200', 
      hijau: 'bg-green-100 text-green-800 border-green-200' 
    }
    const labels: any = { merah: 'Belum Dicek', biru: 'Sedang Diproses', hijau: 'Terverifikasi' }
    return <span className={`px-2 py-1 rounded text-[10px] font-bold border uppercase ${colors[status] || colors.merah}`}>{labels[status] || status}</span>
  }

  if (loading) return <div className="min-h-screen bg-slate-50 p-8 text-center text-slate-900 font-bold">Memuat Dashboard...</div>

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900">
      {/* Panggil Komponen Navbar di sini */}
      <NavbarKoperasi />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* TOMBOL MODUL PINTASAN */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div 
            onClick={() => router.push('/koperasi/keragaan')}
            className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer flex flex-col items-center justify-center text-center group"
          >
            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full mb-3 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
            <h3 className="font-bold text-lg text-slate-800">Modul Keragaan</h3>
            <p className="text-sm text-slate-500 mt-1">Kelola data metrik, SDM, Keuangan & Upload CSV</p>
          </div>

          <div 
            onClick={() => router.push('/koperasi/kesehatan')}
            className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-teal-300 transition-all cursor-pointer flex flex-col items-center justify-center text-center group"
          >
            <div className="p-4 bg-teal-50 text-teal-600 rounded-full mb-3 group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </div>
            <h3 className="font-bold text-lg text-slate-800">Modul Kesehatan</h3>
            <p className="text-sm text-slate-500 mt-1">Unggah PDF Lembar Kerja ODS & Surat Pernyataan</p>
          </div>
        </div>

        {/* GRID DIAGRAM & KESEHATAN */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* DIAGRAM GARIS */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-1">Grafik Pertumbuhan Keuangan</h3>
            <p className="text-xs text-slate-500 mb-6">Nilai ditampilkan dalam hitungan Jutaan Rupiah (Rp)</p>
            
            <div className="h-72 w-full">
              {keragaanChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={keragaanChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="periode" tick={{fontSize: 12, fill: '#64748b'}} tickMargin={10} />
                    <YAxis tick={{fontSize: 12, fill: '#64748b'}} />
                    <Tooltip formatter={(value: any) => [`Rp ${Number(value || 0)} Juta`, '']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Line type="monotone" dataKey="Aset" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Total Aset" />
                    <Line type="monotone" dataKey="VolumeUsaha" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Volume Usaha" />
                    <Line type="monotone" dataKey="SHU" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="SHU" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">
                  Belum ada data historis keragaan untuk ditampilkan.
                </div>
              )}
            </div>
          </div>

          {/* DAFTAR CEK KESEHATAN */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col">
            <h3 className="font-bold text-slate-800 mb-1">Status Cek PDF Kesehatan</h3>
            <p className="text-xs text-slate-500 mb-6">Pantau dokumen yang telah/belum dicek.</p>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {kesehatanList.length > 0 ? (
                kesehatanList.map((doc: any) => (
                  <div key={doc.id} className="border-b border-slate-100 pb-3 last:border-0">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-semibold text-sm text-slate-800 capitalize truncate pr-2">
                        {doc.jenis_dokumen.replace(/_/g, ' ')}
                      </p>
                      {renderBadge(doc.status_indikator)}
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-[11px] text-slate-500">
                        {new Date(doc.uploaded_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                      <a href={doc.file_path} target="_blank" className="text-[11px] font-bold text-indigo-600 hover:underline">Buka PDF</a>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm italic text-center gap-2 mt-10">
                  <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  Belum ada dokumen PDF<br/>yang diunggah.
                </div>
              )}
            </div>
            
            <button 
              onClick={() => router.push('/koperasi/kesehatan')}
              className="mt-4 w-full py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded hover:bg-slate-200 transition-colors"
            >
              Lihat Selengkapnya
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}