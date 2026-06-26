'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'

export default function KesehatanKoperasi() {
  const router = useRouter()
  const [profil, setProfil] = useState<any>(null)
  const [dokumenList, setDokumenList] = useState<any[]>([])
  const [statusUmum, setStatusUmum] = useState('merah')
  
  // State untuk Upload
  const [file, setFile] = useState<File | null>(null)
  const [jenisDokumen, setJenisDokumen] = useState('lembar_kerja_ods')
  const [tanggalInput, setTanggalInput] = useState(new Date().toISOString().split('T')[0])
  const [isUploading, setIsUploading] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUserAndFetchData()
  }, [])

  const checkUserAndFetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return; }

      const { data: pData } = await supabase.from('profil_koperasi').select('*').eq('user_id', user.id).single()

      if (pData) {
        setProfil(pData)
        fetchDokumen(pData.id)
      }
    } catch (err) {
      console.error("Gagal memuat data:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchDokumen = async (id: string) => {
    const { data, error } = await supabase.from('dokumen_kesehatan').select('*').eq('koperasi_id', id).order('uploaded_at', { ascending: false })
    if (error) {
      console.error("Gagal ambil dokumen:", error)
      return
    }
    
    if (data) {
      setDokumenList(data)
      
      // Kalkulasi Status Kesehatan Umum
      if (data.length === 0) {
        setStatusUmum('merah')
      } else {
        const statuses = data.map(d => d.status_indikator)
        if (statuses.includes('merah')) setStatusUmum('merah')
        else if (statuses.includes('biru')) setStatusUmum('biru')
        else setStatusUmum('hijau')
      }
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !profil) {
      alert("Pilih file PDF terlebih dahulu!")
      return
    }
    
    setIsUploading(true)

    try {
      // 1. Upload File ke Storage
      const fileName = `${profil.id}/${jenisDokumen}-${Date.now()}.pdf`
      const { error: uploadError } = await supabase.storage.from('berkas_sireko').upload(`kesehatan/${fileName}`, file)
      
      if (uploadError) {
        console.error("Error Storage:", uploadError)
        throw new Error("Gagal upload file ke storage. Pastikan file berformat PDF.")
      }
      
      // 2. Dapatkan URL Public
      const { data: publicUrlData } = supabase.storage.from('berkas_sireko').getPublicUrl(`kesehatan/${fileName}`)
      
      // 3. Masukkan ke Database dengan jenis dokumen spesifik
      const { error: dbError } = await supabase.from('dokumen_kesehatan').insert({ 
        koperasi_id: profil.id, 
        jenis_dokumen: jenisDokumen, 
        tanggal_input: tanggalInput,
        file_path: publicUrlData.publicUrl, 
        status_indikator: 'merah' 
      })

      if (dbError) throw new Error("Gagal menyimpan data ke database: " + dbError.message)

      alert('Dokumen Kesehatan berhasil diunggah!')
      setFile(null)
      fetchDokumen(profil.id)
    } catch (error: any) { 
      console.error("CRITICAL ERROR:", error)
      alert(error.message) 
    } finally { 
      setIsUploading(false) 
    }
  }

  const renderBadge = (status: string) => {
    const colors: any = { 
      merah: 'bg-red-100 text-red-800 border-red-200', 
      biru: 'bg-blue-100 text-blue-800 border-blue-200', 
      hijau: 'bg-green-100 text-green-800 border-green-200' 
    }
    const labels: any = { merah: 'Belum Diperiksa', biru: 'Sedang Diproses', hijau: 'Terverifikasi' }
    return <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase ${colors[status] || colors.merah}`}>{labels[status] || status}</span>
  }

  const getFormatName = (kode: string) => {
    const formatNames: any = {
      lembar_kerja_ods: 'Lembar Kerja ODS',
      surat_pernyataan: 'Surat Pernyataan Kepatuhan',
      verifikasi_mandiri: 'Verifikasi Mandiri'
    }
    return formatNames[kode] || kode.replace('_', ' ')
  }

  if (loading) return <div className="min-h-screen bg-white p-8 text-center text-slate-900 font-bold">Memuat...</div>

  return (
    <div className="min-h-screen bg-white pb-12 font-sans antialiased text-slate-900">
      {/* HEADER NAVBAR */}
      <div className="bg-white border-b border-slate-200 py-4 px-6 mb-8 shadow-sm">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-slate-900">Modul Kesehatan Koperasi</h1>
          <button onClick={() => router.push('/koperasi/dashboard')} className="text-sm font-semibold text-indigo-700 hover:underline">Kembali</button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 space-y-8">
        
        {/* 1. PANEL STATUS KESEHATAN UMUM */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Status Kesehatan Keseluruhan</h2>
            <p className="text-sm text-slate-700 font-medium">Ini adalah status gabungan dari semua dokumen kesehatan yang Anda unggah.</p>
          </div>
          <div className="flex-shrink-0">
            {statusUmum === 'merah' && <span className="px-4 py-2 bg-red-100 text-red-800 border border-red-200 rounded-lg font-bold shadow-sm">BUTUH PERHATIAN (MERAH)</span>}
            {statusUmum === 'biru' && <span className="px-4 py-2 bg-blue-100 text-blue-800 border border-blue-200 rounded-lg font-bold shadow-sm">DALAM PROSES (BIRU)</span>}
            {statusUmum === 'hijau' && <span className="px-4 py-2 bg-green-100 text-green-800 border border-green-200 rounded-lg font-bold shadow-sm">SEHAT / TERVERIFIKASI (HIJAU)</span>}
          </div>
        </div>

        {/* 2. FORM UPLOAD 3 JENIS DOKUMEN */}
        <div className="bg-slate-50 p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-2">Unggah Dokumen Kesehatan (.pdf)</h2>
            <p className="text-sm text-slate-600 mb-5 font-medium">Lengkapi 3 dokumen wajib di bawah ini untuk memulai proses verifikasi kesehatan.</p>
            
            <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Jenis Dokumen:</label>
                  <select value={jenisDokumen} onChange={(e) => setJenisDokumen(e.target.value)} className="w-full rounded-md border border-slate-300 p-2.5 bg-white text-slate-900 font-bold shadow-sm focus:border-indigo-500">
                      <option value="lembar_kerja_ods">Lembar Kerja ODS</option>
                      <option value="surat_pernyataan">Surat Pernyataan Kepatuhan</option>
                      <option value="verifikasi_mandiri">Verifikasi Mandiri</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Tanggal Input:</label>
                  <input type="date" value={tanggalInput} max={new Date().toISOString().split('T')[0]} onChange={(e) => setTanggalInput(e.target.value)} className="w-full rounded-md border border-slate-300 p-2 bg-white text-slate-900 font-medium shadow-sm focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Pilih File PDF:</label>
                  <input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full text-sm text-slate-800 p-1.5 border border-slate-300 rounded bg-white shadow-sm" />
                </div>
                <div className="md:col-span-3 mt-2">
                  <button type="submit" disabled={isUploading || !file} className="w-full sm:w-auto px-8 py-2.5 bg-indigo-600 text-white font-bold rounded shadow-md hover:bg-indigo-700 disabled:bg-slate-400 transition-colors">
                    {isUploading ? "Mengunggah..." : "Upload Dokumen"}
                  </button>
                </div>
            </form>
        </div>

        {/* 3. RIWAYAT DOKUMEN KESEHATAN */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-md font-bold text-slate-800 uppercase mb-4 tracking-wider">Riwayat Unggah Terakhir</h2>
          {dokumenList.length === 0 ? <p className="text-sm text-slate-500 italic font-medium py-4 text-center">Belum ada dokumen kesehatan yang diunggah.</p> : (
            <div className="space-y-3">
              {dokumenList.map((doc: any) => (
                <div key={doc.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-4 border border-slate-200 rounded-lg bg-slate-50 hover:border-indigo-200 transition-colors gap-4">
                  <div>
                    <p className="font-bold text-slate-900 capitalize text-md">{getFormatName(doc.jenis_dokumen)}</p>
                    <p className="text-xs font-medium text-slate-600 mt-1">Tanggal Input: <span className="font-bold text-slate-800">{new Date(doc.tanggal_input).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</span></p>
                  </div>
                  <div className="flex items-center gap-4">
                    {renderBadge(doc.status_indikator)}
                    <a href={doc.file_path} target="_blank" className="text-indigo-600 font-bold text-sm hover:underline border-l border-slate-300 pl-4">Lihat Berkas</a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}