'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'

export default function AdminDetailKoperasi() {
  const { koperasi_id } = useParams()
  const router = useRouter()
  
  const [koperasi, setKoperasi] = useState<any>(null)
  const [keragaanDocs, setKeragaanDocs] = useState<any[]>([])
  const [kesehatanDocs, setKesehatanDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // State untuk form upload Surat Verifikasi Dinas
  const [fileVerif, setFileVerif] = useState<File | null>(null)
  const [kategoriVerif, setKategoriVerif] = useState('keragaan')
  const [isUploadingVerif, setIsUploadingVerif] = useState(false)

  useEffect(() => {
    if (koperasi_id) {
      fetchDetailKoperasi()
    }
  }, [koperasi_id])

  const fetchDetailKoperasi = async () => {
    try {
      setLoading(true)
      
      const { data: profil, error: profilError } = await supabase
        .from('profil_koperasi')
        .select('*')
        .eq('id', koperasi_id)
        .single()

      if (profilError) throw profilError
      setKoperasi(profil)

      const { data: keragaan, error: keragaanError } = await supabase
        .from('dokumen_keragaan')
        .select('*')
        .eq('koperasi_id', koperasi_id)
        .order('uploaded_at', { ascending: false })
      
      if (keragaanError) throw keragaanError
      setKeragaanDocs(keragaan || [])

      const { data: kesehatan, error: kesehatanError } = await supabase
        .from('dokumen_kesehatan')
        .select('*')
        .eq('koperasi_id', koperasi_id)
        .order('uploaded_at', { ascending: false })

      if (kesehatanError) throw kesehatanError
      setKesehatanDocs(kesehatan || [])

    } catch (error: any) {
      console.error('Error fetching detail:', error.message)
    } finally {
      setLoading(false)
    }
  }

  const updateStatusIndikator = async (tabel: 'dokumen_keragaan' | 'dokumen_kesehatan', docId: string, statusBaru: 'biru' | 'hijau') => {
    try {
      const { error } = await supabase
        .from(tabel)
        .update({ status_indikator: statusBaru })
        .eq('id', docId)

      if (error) throw error
      fetchDetailKoperasi()
    } catch (error: any) {
      alert('Gagal memperbarui status: ' + error.message)
    }
  }

  const handleUploadVerifikasi = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fileVerif || !koperasi_id) return

    try {
      setIsUploadingVerif(true)
      const { data: { user } } = await supabase.auth.getUser()

      const fileExt = fileVerif.name.split('.').pop()
      const fileName = `verif-${koperasi_id}-${kategoriVerif}-${Date.now()}.${fileExt}`
      const filePath = `verifikasi/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('berkas_sireko')
        .upload(filePath, fileVerif)

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage
        .from('berkas_sireko')
        .getPublicUrl(filePath)

      const { error: dbError } = await supabase
        .from('verifikasi_dinas')
        .insert({
          koperasi_id: koperasi_id,
          admin_id: user?.id,
          kategori: kategoriVerif,
          file_path: publicUrlData.publicUrl
        })

      if (dbError) throw dbError

      alert('Surat Verifikasi berhasil dikirim ke Koperasi!')
      setFileVerif(null)
    } catch (error: any) {
      alert('Gagal mengunggah verifikasi: ' + error.message)
    } finally {
      setIsUploadingVerif(false)
    }
  }

  const renderStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      merah: 'bg-red-100 text-red-800',
      biru: 'bg-blue-100 text-blue-800',
      hijau: 'bg-green-100 text-green-800'
    }
    return (
      <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase ${colors[status] || 'bg-gray-100'}`}>
        {status}
      </span>
    )
  }

  if (loading) return <div className="p-8 text-center">Memuat detail data koperasi...</div>
  if (!koperasi) return <div className="p-8 text-center text-red-500">Koperasi tidak ditemukan.</div>

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="bg-white border-b border-gray-200 py-4 px-6 mb-8 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <button onClick={() => router.push('/admin/dashboard')} className="text-sm text-indigo-600 hover:underline mb-1 block">
              &larr; Kembali ke Dashboard
            </button>
            <h1 className="text-2xl font-bold text-gray-900">{koperasi.nama_koperasi}</h1>
            <p className="text-sm text-gray-500">Badan Hukum: {koperasi.nomor_badan_hukum || '-'}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* BAGIAN KIRI: MODUL KERAGAAN */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
          <div className="border-b border-gray-100 pb-3">
            <h2 className="text-lg font-bold text-gray-900">KERAGAAN KOPERASI</h2>
            <p className="text-xs text-gray-500">Daftar dokumen laporan berkala yang diunggah</p>
          </div>

          {keragaanDocs.length === 0 ? (
            <p className="text-sm text-gray-500 italic text-center py-4">Belum ada dokumen keragaan yang diunggah.</p>
          ) : (
            <div className="space-y-4">
              {keragaanDocs.map((doc) => (
                <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-gray-800 capitalize">{doc.jenis_laporan.replace('_', ' ')}</h4>
                    <a href={doc.file_path} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline block mt-1">
                      Buka Berkas Lap.
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    {renderStatusBadge(doc.status_indikator)}
                    <div className="flex gap-1">
                      <button 
                        onClick={() => updateStatusIndikator('dokumen_keragaan', doc.id, 'biru')}
                        className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                        title="Tandai Sudah Dilihat"
                      >
                        Lihat
                      </button>
                      <button 
                        onClick={() => updateStatusIndikator('dokumen_keragaan', doc.id, 'hijau')}
                        className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                        title="Verifikasi Berkas"
                      >
                        Verif
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* BAGIAN KANAN: MODUL KESEHATAN */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
          <div className="border-b border-gray-100 pb-3">
            <h2 className="text-lg font-bold text-gray-900">KESEHATAN KOPERASI</h2>
            <p className="text-xs text-gray-500">Lembar kerja ODS, Surat Pernyataan & Verifikasi Mandiri</p>
          </div>

          {kesehatanDocs.length === 0 ? (
            <p className="text-sm text-gray-500 italic text-center py-4">Belum ada dokumen kesehatan yang diunggah.</p>
          ) : (
            <div className="space-y-4">
              {kesehatanDocs.map((doc) => (
                <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-gray-800 capitalize">{doc.jenis_dokumen.replace('_', ' ')}</h4>
                    
                    {/* Logika untuk membaca teks manual vs link file */}
                    {doc.file_path === 'input-manual' ? (
                      <button 
                        onClick={() => alert(`Isi Teks Manual:\n\n${doc.data_ods?.konten_manual}`)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 block mt-1"
                      >
                        Buka Teks Manual
                      </button>
                    ) : (
                      <a href={doc.file_path} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline block mt-1">
                        Buka Dokumen
                      </a>
                    )}

                  </div>
                  <div className="flex items-center gap-2">
                    {renderStatusBadge(doc.status_indikator)}
                    <div className="flex gap-1">
                      <button 
                        onClick={() => updateStatusIndikator('dokumen_kesehatan', doc.id, 'biru')}
                        className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                      >
                        Lihat
                      </button>
                      <button 
                        onClick={() => updateStatusIndikator('dokumen_kesehatan', doc.id, 'hijau')}
                        className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                      >
                        Verif
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FORM UPLOAD SURAT VERIFIKASI DARI DINAS */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="bg-indigo-50 p-6 rounded-xl shadow-sm border border-indigo-100">
          <h2 className="text-lg font-bold text-indigo-900 mb-2">Kirim Surat Pernyataan Terverifikasi</h2>
          <p className="text-sm text-indigo-700 mb-4">Unggah file balasan resmi dari Dinas untuk diunduh oleh Koperasi.</p>
          
          <form onSubmit={handleUploadVerifikasi} className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-indigo-900 mb-1">Kategori Verifikasi</label>
              <select
                value={kategoriVerif}
                onChange={(e) => setKategoriVerif(e.target.value)}
                className="w-full rounded-md border border-indigo-200 p-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="keragaan">Verifikasi Keragaan</option>
                <option value="kesehatan">Verifikasi Kesehatan</option>
              </select>
            </div>
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-indigo-900 mb-1">File Verifikasi Resmi (PDF)</label>
              <input
                type="file"
                accept=".pdf"
                required
                onChange={(e) => setFileVerif(e.target.files?.[0] || null)}
                className="w-full text-sm text-indigo-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-white file:text-indigo-700 hover:file:bg-indigo-100"
              />
            </div>
            <button
              type="submit"
              disabled={isUploadingVerif || !fileVerif}
              className="w-full sm:w-auto px-6 py-2.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400"
            >
              {isUploadingVerif ? 'Mengirim...' : 'Kirim Berkas'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}