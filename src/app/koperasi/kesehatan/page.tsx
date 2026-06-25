'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'

export default function KesehatanKoperasi() {
  const router = useRouter()
  const [koperasiId, setKoperasiId] = useState<string | null>(null)
  const [dokumenList, setDokumenList] = useState<any[]>([])
  const [metrikData, setMetrikData] = useState<any>(null)
  
  const [metodeInput, setMetodeInput] = useState<'upload' | 'manual'>('upload')
  const [jenisDokumen, setJenisDokumen] = useState('lembar_kerja')
  const [file, setFile] = useState<File | null>(null)
  const [teksManual, setTeksManual] = useState('')
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
      
      // Ambil data Keuangan dari import CSV
      if (profil.nomor_badan_hukum) {
        const { data: metrik } = await supabase.from('data_keragaan_metrik').select('*').eq('nobh', profil.nomor_badan_hukum).single()
        if (metrik) setMetrikData(metrik)
      }
    }
  }

  const fetchDokumen = async (id: string) => {
    const { data } = await supabase.from('dokumen_kesehatan').select('*').eq('koperasi_id', id).order('uploaded_at', { ascending: false })
    if (data) setDokumenList(data)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!koperasiId) return

    try {
      setIsUploading(true)
      let finalFilePath = 'input-manual' 
      let finalDataOds = null

      if (metodeInput === 'upload') {
        if (!file) return alert('Pilih file terlebih dahulu!')
        const fileExt = file.name.split('.').pop()
        const fileName = `${koperasiId}-kes-${Date.now()}.${fileExt}`
        const storagePath = `kesehatan/${fileName}`

        const { error: uploadError } = await supabase.storage.from('berkas_sireko').upload(storagePath, file)
        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage.from('berkas_sireko').getPublicUrl(storagePath)
        finalFilePath = publicUrlData.publicUrl
      } else {
        if (!teksManual.trim()) return alert('Teks input manual tidak boleh kosong!')
        finalDataOds = { konten_manual: teksManual }
      }

      const { error: dbError } = await supabase.from('dokumen_kesehatan').insert({
          koperasi_id: koperasiId, jenis_dokumen: jenisDokumen, file_path: finalFilePath, data_ods: finalDataOds, status_indikator: 'merah'
      })
      if (dbError) throw dbError

      alert('Berhasil menyimpan data kesehatan!')
      setFile(null); setTeksManual('')
      fetchDokumen(koperasiId)
    } catch (error: any) {
      alert('Gagal menyimpan: ' + error.message)
    } finally {
      setIsUploading(false)
    }
  }

  const formatRp = (angka: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0)

  const renderBadge = (status: string) => {
    const colors: any = { merah: 'bg-red-100 text-red-800', biru: 'bg-blue-100 text-blue-800', hijau: 'bg-green-100 text-green-800' }
    return <span className={`px-2 py-1 rounded text-xs font-bold capitalize ${colors[status]}`}>{status}</span>
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="bg-white border-b border-gray-200 py-4 px-6 mb-8 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Modul Kesehatan Koperasi</h1>
          <button onClick={() => router.push('/koperasi/dashboard')} className="text-sm text-indigo-600 font-semibold hover:underline">
            Kembali ke Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

        {/* DATA KEUANGAN DARI EXCEL */}
        {metrikData && (
          <div className="bg-green-50 border border-green-100 p-6 rounded-xl shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h2 className="text-lg font-bold text-green-900">Profil Keuangan Koperasi Anda</h2>
              <p className="text-sm text-green-700">Data acuan untuk evaluasi ODS yang ditarik dari sinkronisasi CSV Dinas.</p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center w-full md:w-auto">
              <div className="bg-white py-2 px-3 rounded shadow-sm">
                <p className="text-xs text-gray-500 font-bold uppercase">Modal Sendiri</p>
                <p className="text-sm font-bold text-green-900">{formatRp(metrikData.modalsendiri)}</p>
              </div>
              <div className="bg-white py-2 px-3 rounded shadow-sm">
                <p className="text-xs text-gray-500 font-bold uppercase">Modal Luar</p>
                <p className="text-sm font-bold text-green-900">{formatRp(metrikData.modalluar)}</p>
              </div>
              <div className="bg-white py-2 px-3 rounded shadow-sm">
                <p className="text-xs text-gray-500 font-bold uppercase">Volume Usaha</p>
                <p className="text-sm font-bold text-green-900">{formatRp(metrikData.volusaha)}</p>
              </div>
              <div className="bg-white py-2 px-3 rounded shadow-sm border-b-2 border-b-green-500">
                <p className="text-xs text-gray-500 font-bold uppercase">SHU</p>
                <p className="text-sm font-bold text-green-900">{formatRp(metrikData.shu)}</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Input Dokumen Kesehatan</h2>
            <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
              <button onClick={() => setMetodeInput('upload')} className={`flex-1 text-sm font-medium py-1.5 rounded-md ${metodeInput === 'upload' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500'}`}>Unggah File</button>
              <button onClick={() => setMetodeInput('manual')} className={`flex-1 text-sm font-medium py-1.5 rounded-md ${metodeInput === 'manual' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500'}`}>Ketik Manual</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori Dokumen</label>
                <select value={jenisDokumen} onChange={(e) => setJenisDokumen(e.target.value)} className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-indigo-500">
                  <option value="lembar_kerja">Lembar Kerja (ODS)</option>
                  <option value="pernyataan_kesehatan">Surat Pernyataan Kesehatan</option>
                  <option value="verifikasi_kesehatan">Surat Verifikasi Kesehatan</option>
                </select>
              </div>
              {metodeInput === 'upload' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pilih File</label>
                  <input type="file" accept=".pdf,.xls,.xlsx,.ods" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:bg-indigo-50 file:text-indigo-700" />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ketik Isi Laporan</label>
                  <textarea rows={5} value={teksManual} onChange={(e) => setTeksManual(e.target.value)} placeholder="Ketik data lembar kerja..." className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-indigo-500" />
                </div>
              )}
              <button type="submit" disabled={isUploading || !koperasiId} className="w-full py-2 px-4 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300">
                {isUploading ? 'Menyimpan...' : 'Simpan Data'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Riwayat Berkas Kesehatan</h2>
            {dokumenList.length === 0 ? <p className="text-sm text-gray-500 italic py-8 text-center">Belum ada data yang diunggah.</p> : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jenis</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Input</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {dokumenList.map((doc) => (
                      <tr key={doc.id}>
                        <td className="px-4 py-3 text-sm text-gray-900 capitalize">{doc.jenis_dokumen.replace('_', ' ')}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{doc.file_path === 'input-manual' ? 'Ketik Manual' : 'File Unggahan'}</td>
                        <td className="px-4 py-3">{renderBadge(doc.status_indikator)}</td>
                        <td className="px-4 py-3 text-sm">
                          {doc.file_path === 'input-manual' ? (
                            <button onClick={() => alert('Isi Data: \n\n' + doc.data_ods?.konten_manual)} className="text-indigo-600 font-semibold hover:underline">Baca Teks</button>
                          ) : (
                            <a href={doc.file_path} target="_blank" rel="noreferrer" className="text-indigo-600 font-semibold hover:underline">Unduh File</a>
                          )}
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