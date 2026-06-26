'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import NavbarAdmin from '@/components/NavbarAdmin'

export default function AdminDetailKoperasi() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(true)
  
  const [profil, setProfil] = useState<any>(null)
  const [keragaanList, setKeragaanList] = useState<any[]>([])
  const [kesehatanList, setKesehatanList] = useState<any[]>([])
  const [verifData, setVerifData] = useState<any>(null)

  // State Form Verifikasi
  const [statusVerif, setStatusVerif] = useState('menunggu')
  const [catatan, setCatatan] = useState('')
  const [suratFile, setSuratFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (params?.slug) fetchKoperasiDetail(params.slug as string)
  }, [params])

  const fetchKoperasiDetail = async (slug: string) => {
    try {
      // 1. Ambil Profil Koperasi
      const { data: pData } = await supabase.from('profil_koperasi').select('*').eq('slug', slug).single()
      if (!pData) { router.push('/admin/koperasi'); return; }
      setProfil(pData)

      // 2. Ambil Dokumen Keragaan & Kesehatan
      const { data: kerData } = await supabase.from('dokumen_keragaan').select('*').eq('koperasi_id', pData.id).order('uploaded_at', { ascending: false })
      const { data: kesData } = await supabase.from('dokumen_kesehatan').select('*').eq('koperasi_id', pData.id).order('uploaded_at', { ascending: false })
      if (kerData) setKeragaanList(kerData)
      if (kesData) setKesehatanList(kesData)

      // 3. Ambil Status Verifikasi Terakhir
      const { data: vData } = await supabase.from('verifikasi_dinas').select('*').eq('koperasi_id', pData.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (vData) {
        setVerifData(vData)
        setStatusVerif(vData.status)
        setCatatan(vData.catatan || '')
      }

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifikasiSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profil) return
    setIsSubmitting(true)

    try {
      let publicUrl = verifData?.surat_verifikasi_url || null

      // Jika Admin mengunggah file Surat baru
      if (suratFile) {
        const fileName = `${profil.id}/Surat-Dinas-${Date.now()}.pdf`
        const { error: uploadError } = await supabase.storage.from('berkas_sireko').upload(`verifikasi/${fileName}`, suratFile)
        
        if (uploadError) throw new Error("Gagal mengunggah file surat ke storage: " + uploadError.message)
        
        const { data: urlData } = supabase.storage.from('berkas_sireko').getPublicUrl(`verifikasi/${fileName}`)
        publicUrl = urlData.publicUrl
      }

      // Simpan ke tabel verifikasi_dinas
      const { error: dbError } = await supabase.from('verifikasi_dinas').insert({
        koperasi_id: profil.id,
        status: statusVerif,
        catatan: catatan,
        surat_verifikasi_url: publicUrl
      })

      if (dbError) throw new Error("Gagal menyimpan data verifikasi: " + dbError.message)

      alert('Keputusan Dinas dan Surat Verifikasi berhasil disimpan!')
      setSuratFile(null)
      fetchKoperasiDetail(profil.slug) // Refresh data

    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateStatusDokumen = async (tabel: string, id: string, statusBaru: string) => {
    const { error } = await supabase.from(tabel).update({ status_indikator: statusBaru }).eq('id', id)
    if (!error) {
      alert("Status dokumen diperbarui!")
      fetchKoperasiDetail(profil.slug)
    }
  }

  if (loading) return <div className="min-h-screen bg-slate-50 p-8 text-center font-bold">Memuat Detail Koperasi...</div>

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900 pb-12">
      <NavbarAdmin />

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        
        {/* HEADER PROFIL */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{profil?.nama_koperasi}</h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">NBH: {profil?.nomor_badan_hukum || 'Belum diatur'}</p>
          </div>
          <button onClick={() => router.push('/admin/koperasi')} className="text-sm font-bold text-indigo-600 hover:underline">Kembali ke Daftar</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* KOLOM KIRI: DAFTAR DOKUMEN KOPERASI */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Dokumen Keragaan */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Laporan Keragaan (CSV/Metrik)</h2>
              <div className="space-y-3">
                {keragaanList.map(doc => (
                  <div key={doc.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-3 border border-slate-100 bg-slate-50 rounded-lg gap-3">
                    <div>
                      <p className="font-bold text-sm text-slate-800 capitalize">Laporan {doc.jenis_laporan?.replace('_', ' ')}</p>
                      <p className="text-xs text-slate-500">{new Date(doc.uploaded_at).toLocaleDateString('id-ID')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <a href={doc.file_path} target="_blank" className="text-xs font-bold text-indigo-600 hover:underline">Lihat CSV</a>
                      <select 
                        value={doc.status_indikator} 
                        onChange={(e) => updateStatusDokumen('dokumen_keragaan', doc.id, e.target.value)}
                        className="text-xs border border-slate-300 rounded p-1 font-bold bg-white"
                      >
                        <option value="merah">Merah (Belum)</option>
                        <option value="biru">Biru (Proses)</option>
                        <option value="hijau">Hijau (Aman)</option>
                      </select>
                    </div>
                  </div>
                ))}
                {keragaanList.length === 0 && <p className="text-sm text-slate-400 italic">Belum ada dokumen keragaan.</p>}
              </div>
            </div>

            {/* Dokumen Kesehatan */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Laporan Kesehatan (PDF)</h2>
              <div className="space-y-3">
                {kesehatanList.map(doc => (
                  <div key={doc.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-3 border border-slate-100 bg-slate-50 rounded-lg gap-3">
                    <div>
                      <p className="font-bold text-sm text-slate-800 capitalize">{doc.jenis_dokumen?.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-slate-500">{new Date(doc.uploaded_at).toLocaleDateString('id-ID')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <a href={doc.file_path} target="_blank" className="text-xs font-bold text-indigo-600 hover:underline">Buka PDF</a>
                      <select 
                        value={doc.status_indikator} 
                        onChange={(e) => updateStatusDokumen('dokumen_kesehatan', doc.id, e.target.value)}
                        className="text-xs border border-slate-300 rounded p-1 font-bold bg-white"
                      >
                        <option value="merah">Merah (Belum)</option>
                        <option value="biru">Biru (Proses)</option>
                        <option value="hijau">Hijau (Aman)</option>
                      </select>
                    </div>
                  </div>
                ))}
                {kesehatanList.length === 0 && <p className="text-sm text-slate-400 italic">Belum ada dokumen kesehatan.</p>}
              </div>
            </div>

          </div>

          {/* KOLOM KANAN: PANEL UPLOAD VERIFIKASI DINAS */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm sticky top-24">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Keputusan Dinas</h2>
              
              <form onSubmit={handleVerifikasiSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Status Verifikasi</label>
                  <select 
                    value={statusVerif} 
                    onChange={(e) => setStatusVerif(e.target.value)} 
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-md font-bold focus:border-indigo-500 shadow-sm"
                  >
                    <option value="menunggu">Menunggu / Diproses</option>
                    <option value="disetujui">Disetujui (Terverifikasi)</option>
                    <option value="ditolak">Ditolak / Revisi</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Catatan Dinas (Opsional)</label>
                  <textarea 
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    rows={3}
                    placeholder="Berikan catatan atau instruksi revisi..."
                    className="w-full p-2 bg-white border border-slate-300 rounded-md text-sm focus:border-indigo-500 shadow-sm"
                  />
                </div>

                <div className="border-t border-slate-200 pt-4 mt-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1">Upload Surat Verifikasi (.pdf)</label>
                  <p className="text-xs text-slate-500 mb-2">Unggah surat resmi dari dinas yang menyatakan status koperasi ini.</p>
                  <input 
                    type="file" 
                    accept=".pdf"
                    onChange={(e) => setSuratFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-slate-700 p-1.5 border border-slate-300 rounded bg-white shadow-sm" 
                  />
                  
                  {verifData?.surat_verifikasi_url && !suratFile && (
                    <p className="text-xs mt-2 text-indigo-600 font-bold">
                      &#10003; Surat sudah pernah diunggah. <a href={verifData.surat_verifikasi_url} target="_blank" className="underline">Lihat File</a>
                    </p>
                  )}
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full py-2.5 mt-2 bg-indigo-600 text-white font-bold rounded-lg shadow hover:bg-indigo-700 disabled:bg-slate-400 transition-colors"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan & Publikasikan Surat'}
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}