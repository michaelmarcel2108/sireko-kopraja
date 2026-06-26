'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import Papa from 'papaparse'

export default function KeragaanKoperasi() {
  const router = useRouter()
  const [profil, setProfil] = useState<any>(null)
  const [dokumenList, setDokumenList] = useState<any[]>([])
  
  // State untuk Data Metrik (View & Add New)
  const [metrikData, setMetrikData] = useState<any>(null)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [formData, setFormData] = useState<any>({})

  // State untuk Upload CSV
  const [file, setFile] = useState<File | null>(null)
  const [periodeLaporan, setPeriodeLaporan] = useState('bulanan') // Default value sesuai ENUM
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
        
        if (pData.nomor_badan_hukum) {
          const { data: mData } = await supabase.from('data_keragaan_metrik')
            .select('*')
            .eq('nobh', pData.nomor_badan_hukum)
            .order('created_at', { ascending: false })
            .limit(1)
            
          if (mData && mData.length > 0) {
            setMetrikData(mData[0])
            setFormData(mData[0])
          } else {
            setFormData({ 
              nobh: pData.nomor_badan_hukum, slug: pData.slug, nmkop: pData.nama_koperasi,
              ang_laki: 0, ang_wanita: 0, kary_laki: 0, kary_wanita: 0, mgr_laki: 0, mgr_wanita: 0,
              asset: 0, shu: 0, volusaha: 0, modalsendiri: 0, modalluar: 0, tahun_laporan: new Date().getFullYear()
            })
          }
        }
      }
    } catch (err) {
      console.error("Gagal memuat data:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchDokumen = async (id: string) => {
    const { data, error } = await supabase.from('dokumen_keragaan').select('*').eq('koperasi_id', id).order('uploaded_at', { ascending: false })
    if (error) console.error("Gagal ambil dokumen:", error)
    if (data) setDokumenList(data)
  }

  // --- FUNGSI TAMBAH DATA MANUAL ---
  const handleSaveManual = async () => {
    try {
      setIsUploading(true)
      const parseNum = (val: any) => Number(String(val).replace(/[^0-9.-]/g, '')) || 0
      
      const { id, created_at, ...cleanFormData } = formData

      const payload = {
        ...cleanFormData,
        ang_laki: parseNum(formData.ang_laki), ang_wanita: parseNum(formData.ang_wanita),
        kary_laki: parseNum(formData.kary_laki), kary_wanita: parseNum(formData.kary_wanita),
        mgr_laki: parseNum(formData.mgr_laki), mgr_wanita: parseNum(formData.mgr_wanita),
        asset: parseNum(formData.asset), shu: parseNum(formData.shu), volusaha: parseNum(formData.volusaha),
        modalsendiri: parseNum(formData.modalsendiri), modalluar: parseNum(formData.modalluar),
        tahun_laporan: parseNum(formData.tahun_laporan) || new Date().getFullYear()
      }

      const { error } = await supabase.from('data_keragaan_metrik').insert(payload)
      if (error) throw new Error("Gagal menyimpan ke database: " + error.message)

      alert("Data laporan baru berhasil ditambahkan!")
      setIsAddingNew(false)
      checkUserAndFetchData()
    } catch (error: any) {
      console.error(error)
      alert(error.message)
    } finally {
      setIsUploading(false)
    }
  }

  // --- FUNGSI UPLOAD CSV ---
  const handleUploadCSV = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !profil) { alert("Pilih file CSV terlebih dahulu!"); return; }
    
    setIsUploading(true)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const row: any = results.data[0]
          if (!row) throw new Error("File CSV kosong atau format tidak sesuai.")

          const parseNum = (val: any) => Number(String(val).replace(/[^0-9.-]/g, '')) || 0

          const { error: metrikError } = await supabase.from('data_keragaan_metrik')
            .insert({
              nobh: profil.nomor_badan_hukum, slug: profil.slug, nmkop: profil.nama_koperasi,
              ang_laki: parseNum(row.ang_laki), ang_wanita: parseNum(row.ang_wanita),
              asset: parseNum(row.asset), shu: parseNum(row.shu), volusaha: parseNum(row.volusaha),
              modalsendiri: parseNum(row.modalsendiri), modalluar: parseNum(row.modalluar),
              tahun_laporan: parseNum(row.tahun_laporan) || new Date().getFullYear()
            })

          if (metrikError) throw new Error("Gagal insert metrik baru: " + metrikError.message)

          const fileName = `${profil.id}/${periodeLaporan}-${Date.now()}.csv`
          const { error: uploadError } = await supabase.storage.from('berkas_sireko').upload(`keragaan/${fileName}`, file)
          if (uploadError) throw new Error("Gagal upload file: " + uploadError.message)
          
          const { data: publicUrlData } = supabase.storage.from('berkas_sireko').getPublicUrl(`keragaan/${fileName}`)
          
          // PERBAIKAN DI SINI: jenis_laporan menggunakan value ENUM yang valid (bulanan, tahunan, dll)
          const { error: dbError } = await supabase.from('dokumen_keragaan').insert({ 
            koperasi_id: profil.id, 
            jenis_laporan: periodeLaporan, // Mengirimkan 'bulanan', 'triwulan', dst
            periode_laporan: periodeLaporan,
            file_path: publicUrlData.publicUrl, 
            status_indikator: 'merah' 
          })

          if (dbError) throw new Error("Gagal mencatat dokumen: " + dbError.message)

          alert('Data CSV berhasil diproses sebagai laporan baru!')
          setFile(null)
          checkUserAndFetchData()

        } catch (error: any) { 
          console.error("CRITICAL ERROR:", error); alert(error.message); 
        } finally { 
          setIsUploading(false) 
        }
      }
    })
  }

  const formatRp = (angka: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0)
  const handleInputChange = (field: string, value: string) => setFormData({ ...formData, [field]: value })

  const renderBadge = (status: string) => {
    const colors: any = { merah: 'bg-red-100 text-red-800 border-red-200', biru: 'bg-blue-100 text-blue-800 border-blue-200', hijau: 'bg-green-100 text-green-800 border-green-200' }
    return <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase ${colors[status] || colors.merah}`}>{status}</span>
  }

  if (loading) return <div className="min-h-screen bg-white p-8 text-center text-slate-900 font-bold">Memuat...</div>

  return (
    <div className="min-h-screen bg-white pb-12 font-sans antialiased text-slate-900">
      <div className="bg-white border-b border-slate-200 py-4 px-6 mb-8 shadow-sm">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-slate-900">Modul Keragaan Koperasi</h1>
          <button onClick={() => router.push('/koperasi/dashboard')} className="text-sm font-semibold text-indigo-700 hover:underline">Kembali</button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 space-y-8">

        {/* 1. TABEL DATA TERAKHIR & INPUT MANUAL */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                Laporan Metrik Terakhir
                {metrikData?.created_at && (
                  <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200 font-bold">
                    Per {new Date(metrikData.created_at).toLocaleDateString('id-ID')}
                  </span>
                )}
              </h2>
              <p className="text-sm text-slate-500 font-medium">Tambah data baru secara manual atau unggah CSV untuk membuat rekam jejak laporan baru.</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => isAddingNew ? handleSaveManual() : setIsAddingNew(true)} 
                disabled={isUploading}
                className={`px-4 py-2 font-bold text-sm rounded transition-colors shadow-sm ${isAddingNew ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
              >
                {isUploading ? 'Menyimpan...' : isAddingNew ? 'Simpan Laporan Baru' : '+ Tambah Data Baru'}
              </button>
              {isAddingNew && (
                <button onClick={() => {setIsAddingNew(false); setFormData(metrikData || {})}} className="px-4 py-2 bg-gray-200 text-gray-800 font-bold text-sm rounded hover:bg-gray-300">Batal</button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-slate-700 font-bold">
                <tr>
                  <th className="px-4 py-3 text-left">Kategori Indikator</th>
                  <th className="px-4 py-3 text-left">Laki-Laki (Orang) / Nilai (Rupiah)</th>
                  <th className="px-4 py-3 text-left">Perempuan (Orang)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                <tr>
                  <td className="px-4 py-3 font-semibold text-slate-800 bg-slate-50/50">Total Anggota</td>
                  <td className="px-4 py-3">{isAddingNew ? <input type="number" value={formData.ang_laki || ''} onChange={(e) => handleInputChange('ang_laki', e.target.value)} className="border p-1 w-full rounded focus:ring-indigo-500 focus:border-indigo-500" /> : (metrikData?.ang_laki || 0)}</td>
                  <td className="px-4 py-3">{isAddingNew ? <input type="number" value={formData.ang_wanita || ''} onChange={(e) => handleInputChange('ang_wanita', e.target.value)} className="border p-1 w-full rounded focus:ring-indigo-500 focus:border-indigo-500" /> : (metrikData?.ang_wanita || 0)}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-slate-800 bg-slate-50/50">Total Karyawan</td>
                  <td className="px-4 py-3">{isAddingNew ? <input type="number" value={formData.kary_laki || ''} onChange={(e) => handleInputChange('kary_laki', e.target.value)} className="border p-1 w-full rounded focus:ring-indigo-500 focus:border-indigo-500" /> : (metrikData?.kary_laki || 0)}</td>
                  <td className="px-4 py-3">{isAddingNew ? <input type="number" value={formData.kary_wanita || ''} onChange={(e) => handleInputChange('kary_wanita', e.target.value)} className="border p-1 w-full rounded focus:ring-indigo-500 focus:border-indigo-500" /> : (metrikData?.kary_wanita || 0)}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-slate-800 bg-slate-50/50">Total Manajer</td>
                  <td className="px-4 py-3">{isAddingNew ? <input type="number" value={formData.mgr_laki || ''} onChange={(e) => handleInputChange('mgr_laki', e.target.value)} className="border p-1 w-full rounded focus:ring-indigo-500 focus:border-indigo-500" /> : (metrikData?.mgr_laki || 0)}</td>
                  <td className="px-4 py-3">{isAddingNew ? <input type="number" value={formData.mgr_wanita || ''} onChange={(e) => handleInputChange('mgr_wanita', e.target.value)} className="border p-1 w-full rounded focus:ring-indigo-500 focus:border-indigo-500" /> : (metrikData?.mgr_wanita || 0)}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-slate-800 bg-slate-50/50">Total Aset</td>
                  <td className="px-4 py-3" colSpan={2}>{isAddingNew ? <input type="number" value={formData.asset || ''} onChange={(e) => handleInputChange('asset', e.target.value)} className="border p-1 w-full rounded focus:ring-indigo-500 focus:border-indigo-500" /> : formatRp(metrikData?.asset)}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-slate-800 bg-slate-50/50">Sisa Hasil Usaha (SHU)</td>
                  <td className="px-4 py-3" colSpan={2}>{isAddingNew ? <input type="number" value={formData.shu || ''} onChange={(e) => handleInputChange('shu', e.target.value)} className="border p-1 w-full rounded focus:ring-indigo-500 focus:border-indigo-500" /> : formatRp(metrikData?.shu)}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-slate-800 bg-slate-50/50">Volume Usaha</td>
                  <td className="px-4 py-3" colSpan={2}>{isAddingNew ? <input type="number" value={formData.volusaha || ''} onChange={(e) => handleInputChange('volusaha', e.target.value)} className="border p-1 w-full rounded focus:ring-indigo-500 focus:border-indigo-500" /> : formatRp(metrikData?.volusaha)}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-slate-800 bg-slate-50/50">Modal Sendiri</td>
                  <td className="px-4 py-3" colSpan={2}>{isAddingNew ? <input type="number" value={formData.modalsendiri || ''} onChange={(e) => handleInputChange('modalsendiri', e.target.value)} className="border p-1 w-full rounded focus:ring-indigo-500 focus:border-indigo-500" /> : formatRp(metrikData?.modalsendiri)}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-semibold text-slate-800 bg-slate-50/50">Modal Luar</td>
                  <td className="px-4 py-3" colSpan={2}>{isAddingNew ? <input type="number" value={formData.modalluar || ''} onChange={(e) => handleInputChange('modalluar', e.target.value)} className="border p-1 w-full rounded focus:ring-indigo-500 focus:border-indigo-500" /> : formatRp(metrikData?.modalluar)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. UPLOAD CSV */}
        <div className="bg-slate-50 p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-2">Unggah Laporan via CSV</h2>
            <p className="text-sm text-slate-600 mb-4 font-medium">Sistem akan membaca file CSV Anda dan mencatatnya sebagai baris laporan metrik terbaru.</p>
            
            <form onSubmit={handleUploadCSV} className="flex gap-4 items-end flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-bold text-slate-700 mb-1">Periode Laporan:</label>
                  {/* PERBAIKAN DI SINI: Value nya disesuaikan dengan isi ENUM Database */}
                  <select value={periodeLaporan} onChange={(e) => setPeriodeLaporan(e.target.value)} className="w-full rounded-md border border-slate-300 p-2 bg-white text-slate-900 font-medium">
                      <option value="bulanan">Per Bulan</option>
                      <option value="triwulan">Per Trisemester</option>
                      <option value="semesteran">Per Semester</option>
                      <option value="tahunan">Per Tahun</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-bold text-slate-700 mb-1">File CSV:</label>
                  <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full text-sm text-slate-800 p-1.5 border border-slate-300 rounded bg-white shadow-sm" />
                </div>
                <button type="submit" disabled={isUploading || !file || isAddingNew} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded shadow-sm hover:bg-indigo-700 disabled:bg-slate-400 transition-colors">
                  {isUploading ? "Memproses..." : "Upload & Tambah Data"}
                </button>
            </form>
        </div>

        {/* 3. RIWAYAT DOKUMEN */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-md font-bold text-slate-800 uppercase mb-4 tracking-wider">Riwayat Dokumen CSV</h2>
          {dokumenList.length === 0 ? <p className="text-sm text-slate-500 italic">Belum ada dokumen yang diunggah.</p> : (
            <div className="space-y-3">
              {dokumenList.map((doc: any) => (
                <div key={doc.id} className="flex justify-between items-center p-4 border border-slate-200 rounded-lg bg-slate-50 hover:border-indigo-200 transition-colors">
                  <div>
                    {/* Menggunakan jenis_laporan agar tampil "bulanan", "tahunan", dll yang rapi */}
                    <p className="font-bold text-slate-900 capitalize">Laporan {doc.jenis_laporan.replace('_', ' ')}</p>
                    <p className="text-xs font-medium text-slate-500 mt-1">Diunggah pada: {new Date(doc.uploaded_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    {renderBadge(doc.status_indikator)}
                    <a href={doc.file_path} target="_blank" className="text-indigo-600 font-bold text-sm hover:underline">Unduh Berkas</a>
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