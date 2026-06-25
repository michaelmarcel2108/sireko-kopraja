'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'

export default function KeragaanKoperasi() {
  const router = useRouter()
  const [koperasiId, setKoperasiId] = useState<string | null>(null)
  const [dokumenList, setDokumenList] = useState<any[]>([])
  const [metrikData, setMetrikData] = useState<any>(null)
  
  const [file, setFile] = useState<File | null>(null)
  const [jenisLaporan, setJenisLaporan] = useState('bulanan')
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    checkUserAndFetchData()
  }, [])

  const checkUserAndFetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return; }

    const { data: profil } = await supabase.from('profil_koperasi').select('*').eq('user_id', user.id).single()

    if (profil) {
      setKoperasiId(profil.id)
      fetchDokumen(profil.id)
      
      // Ambil data SDM dari import CSV
      if (profil.nomor_badan_hukum) {
        const { data: metrik } = await supabase.from('data_keragaan_metrik').select('*').eq('nobh', profil.nomor_badan_hukum).single()
        if (metrik) setMetrikData(metrik)
      }
    } else {
      alert('Profil Koperasi belum diatur untuk akun ini.')
    }
  }

  const fetchDokumen = async (id: string) => {
    const { data } = await supabase.from('dokumen_keragaan').select('*').eq('koperasi_id', id).order('uploaded_at', { ascending: false })
    if (data) setDokumenList(data)
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !koperasiId) return

    try {
      setIsUploading(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `${koperasiId}-${Date.now()}.${fileExt}`
      const filePath = `keragaan/${fileName}`

      const { error: uploadError } = await supabase.storage.from('berkas_sireko').upload(filePath, file)
      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage.from('berkas_sireko').getPublicUrl(filePath)

      const { error: dbError } = await supabase.from('dokumen_keragaan').insert({
          koperasi_id: koperasiId, jenis_laporan: jenisLaporan, file_path: publicUrlData.publicUrl, status_indikator: 'merah' 
      })
      if (dbError) throw dbError

      alert('Berhasil mengunggah dokumen!')
      setFile(null)
      fetchDokumen(koperasiId) 
    } catch (error: any) {
      alert('Gagal mengunggah: ' + error.message)
    } finally {
      setIsUploading(false)
    }
  }

  const renderBadge = (status: string) => {
    const colors: any = { merah: 'bg-red-100 text-red-800', biru: 'bg-blue-100 text-blue-800', hijau: 'bg-green-100 text-green-800' }
    const labels: any = { merah: 'Belum Dilihat', biru: 'Sudah Dilihat', hijau: 'Terverifikasi' }
    return <span className={`px-2 py-1 rounded text-xs font-bold ${colors[status]}`}>{labels[status]}</span>
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="bg-white border-b border-gray-200 py-4 px-6 mb-8 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Modul Keragaan Koperasi</h1>
          <button onClick={() => router.push('/koperasi/dashboard')} className="text-sm text-indigo-600 font-semibold hover:underline">
            Kembali ke Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* DATA SDM DARI EXCEL */}
        {metrikData && (
          <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-xl shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h2 className="text-lg font-bold text-indigo-900">Data SDM & Kelembagaan Anda Saat Ini</h2>
              <p className="text-sm text-indigo-700">Data di bawah ini ditarik secara otomatis dari database Dinas Buleleng.</p>
            </div>
            <div className="flex flex-wrap gap-4 text-center">
              <div className="bg-white py-2 px-4 rounded-lg shadow-sm">
                <p className="text-xs text-gray-500 font-bold uppercase">Anggota L/P</p>
                <p className="text-lg font-bold text-indigo-900">{metrikData.ang_laki || 0} / {metrikData.ang_wanita || 0}</p>
              </div>
              <div className="bg-white py-2 px-4 rounded-lg shadow-sm">
                <p className="text-xs text-gray-500 font-bold uppercase">Karyawan L/P</p>
                <p className="text-lg font-bold text-indigo-900">{metrikData.kary_laki || 0} / {metrikData.kary_wanita || 0}</p>
              </div>
              <div className="bg-white py-2 px-4 rounded-lg shadow-sm">
                <p className="text-xs text-gray-500 font-bold uppercase">Terakhir RAT</p>
                <p className="text-lg font-bold text-indigo-900">{metrikData.tglrat ? new Date(metrikData.tglrat).toLocaleDateString('id-ID') : 'Belum Ada'}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Unggah Laporan Baru</h2>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Laporan</label>
                <select value={jenisLaporan} onChange={(e) => setJenisLaporan(e.target.value)} className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-indigo-500 focus:ring-indigo-500">
                  <option value="bulanan">Laporan Perbulan</option>
                  <option value="triwulan">Laporan 3 Bulanan</option>
                  <option value="semester">Laporan 6 Bulanan</option>
                  <option value="tahunan">Laporan Tahunan</option>
                  <option value="manual_pernyataan">File Data Manual - Surat Pernyataan</option>
                  <option value="manual_verifikasi">File Data Manual - Surat Verifikasi</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pilih File (PDF/Excel)</label>
                <input type="file" accept=".pdf,.xls,.xlsx" required onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700" />
              </div>
              <button type="submit" disabled={isUploading || !file || !koperasiId} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300">
                {isUploading ? 'Mengunggah...' : 'Unggah File'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Riwayat Dokumen Terunggah</h2>
            {dokumenList.length === 0 ? <p className="text-sm text-gray-500 italic text-center py-8">Belum ada dokumen yang diunggah.</p> : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jenis Laporan</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {dokumenList.map((doc) => (
                      <tr key={doc.id}>
                        <td className="px-4 py-3 text-sm text-gray-900 capitalize">{doc.jenis_laporan.replace('_', ' ')}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{new Date(doc.uploaded_at).toLocaleDateString('id-ID')}</td>
                        <td className="px-4 py-3">{renderBadge(doc.status_indikator)}</td>
                        <td className="px-4 py-3 text-sm">
                          <a href={doc.file_path} target="_blank" rel="noreferrer" className="text-indigo-600 font-semibold hover:underline">Lihat File</a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}