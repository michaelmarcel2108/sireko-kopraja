'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import Papa from 'papaparse'
import toast, { Toaster } from 'react-hot-toast'

export default function KeragaanKoperasi() {
  const router = useRouter()
  const [profil, setProfil] = useState<any>(null)
  const [dokumenList, setDokumenList] = useState<any[]>([])
  
  // State untuk Data Metrik
  const [riwayatMetrik, setRiwayatMetrik] = useState<any[]>([]) 
  const [metrikData, setMetrikData] = useState<any>(null) 
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [formData, setFormData] = useState<any>({})
  
  // State untuk Upload CSV
  const [file, setFile] = useState<File | null>(null)
  const [periodeLaporan, setPeriodeLaporan] = useState('bulanan')
  const [isUploading, setIsUploading] = useState(false)
  
  const [loading, setLoading] = useState(true)

  // --- STATE BARU: Filter, Pagination & Accordion Riwayat ---
  const [filterBulan, setFilterBulan] = useState('')
  const [filterTahun, setFilterTahun] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 6
  const [expandedId, setExpandedId] = useState<string | null>(null) // Untuk Dropdown Accordion

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
          const { data: mData, error: mError } = await supabase.from('data_keragaan_metrik')
            .select('*')
            .eq('nobh', pData.nomor_badan_hukum)
            .order('created_at', { ascending: false })
            
          if (mError) console.error("Gagal menarik data:", mError)

          if (mData && mData.length > 0) {
            setRiwayatMetrik(mData) 
            setMetrikData(mData[0]) 
            setFormData(mData[0])
          } else {
            setFormData({ 
              nobh: pData.nomor_badan_hukum, slug: pData.slug, nmkop: pData.nama_koperasi,
              ang_laki: 0, ang_wanita: 0, kary_laki: 0, kary_wanita: 0, mgr_laki: 0, mgr_wanita: 0,
              asset: 0, shu: 0, volusaha: 0, modalsendiri: 0, modalluar: 0, tahun_laporan: new Date().getFullYear(),
              tanggal_laporan: new Date().toISOString().split('T')[0]
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

  // --- LOGIKA FILTER & PAGINATION RIWAYAT ---
  const filteredRiwayat = useMemo(() => {
    return riwayatMetrik.filter((metrik) => {
      if (!metrik.tanggal_laporan && !metrik.created_at) return false;
      const date = new Date(metrik.tanggal_laporan || metrik.created_at)
      
      const matchBulan = filterBulan ? (date.getMonth() + 1).toString() === filterBulan : true
      const matchTahun = filterTahun ? date.getFullYear().toString() === filterTahun : true
      
      return matchBulan && matchTahun
    })
  }, [riwayatMetrik, filterBulan, filterTahun])

  const totalPages = Math.ceil(filteredRiwayat.length / itemsPerPage)
  
  const paginatedRiwayat = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredRiwayat.slice(start, start + itemsPerPage)
  }, [filteredRiwayat, currentPage])

  // Reset page ke 1 kalau filter berubah
  useEffect(() => {
    setCurrentPage(1)
  }, [filterBulan, filterTahun])


  const handleDownloadTemplate = () => {
    const headers = ["ang_laki", "ang_wanita", "kary_laki", "kary_wanita", "mgr_laki", "mgr_wanita", "asset", "shu", "volusaha", "modalsendiri", "modalluar", "tahun_laporan"]
    const sampleData = ["10", "15", "5", "8", "1", "2", "150000000", "25000000", "500000000", "100000000", "50000000", new Date().getFullYear().toString()]
    const csvContent = headers.join(",") + "\n" + sampleData.join(",")
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", "Template_Laporan_Keragaan.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("Template CSV berhasil diunduh!")
  }

  const handleSaveManual = async () => {
    if (!formData.tanggal_laporan) {
      toast.error("Pilih Tanggal Laporan terlebih dahulu!")
      return
    }

    const toastId = toast.loading("Menyimpan laporan baru ke database...")
    try {
      setIsUploading(true)
      const parseNum = (val: any) => Number(String(val).replace(/[^0-9.-]/g, '')) || 0
      
      const { id, created_at, ...cleanFormData } = formData

      const payload = {
        ...cleanFormData,
        tanggal_laporan: formData.tanggal_laporan,
        ang_laki: parseNum(formData.ang_laki), ang_wanita: parseNum(formData.ang_wanita),
        kary_laki: parseNum(formData.kary_laki), kary_wanita: parseNum(formData.kary_wanita),
        mgr_laki: parseNum(formData.mgr_laki), mgr_wanita: parseNum(formData.mgr_wanita),
        asset: parseNum(formData.asset), shu: parseNum(formData.shu), volusaha: parseNum(formData.volusaha),
        modalsendiri: parseNum(formData.modalsendiri), modalluar: parseNum(formData.modalluar),
        tahun_laporan: parseNum(formData.tahun_laporan) || new Date().getFullYear()
      }

      const { error } = await supabase.from('data_keragaan_metrik').insert(payload)
      if (error) throw new Error("Gagal menyimpan ke database: " + error.message)

      toast.success("Data laporan baru berhasil ditambahkan!", { id: toastId })
      setIsAddingNew(false)
      checkUserAndFetchData()
    } catch (error: any) {
      console.error(error)
      toast.error(error.message, { id: toastId })
    } finally {
      setIsUploading(false)
    }
  }

  const handleUploadCSV = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !profil) { toast.error("Pilih file CSV terlebih dahulu!"); return; }
    
    const toastId = toast.loading("Memproses & menyimpan data CSV ke database...")
    setIsUploading(true)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const row: any = results.data[0]
          if (!row) throw new Error("File CSV kosong atau format tidak sesuai.")

          const parseNum = (val: any) => Number(String(val).replace(/[^0-9.-]/g, '')) || 0

          const { error: metrikError } = await supabase.from('data_keragaan_metrik').insert({
              nobh: profil.nomor_badan_hukum, slug: profil.slug, nmkop: profil.nama_koperasi,
              ang_laki: parseNum(row.ang_laki), ang_wanita: parseNum(row.ang_wanita),
              kary_laki: parseNum(row.kary_laki), kary_wanita: parseNum(row.kary_wanita), 
              mgr_laki: parseNum(row.mgr_laki), mgr_wanita: parseNum(row.mgr_wanita),
              asset: parseNum(row.asset), shu: parseNum(row.shu), volusaha: parseNum(row.volusaha),
              modalsendiri: parseNum(row.modalsendiri), modalluar: parseNum(row.modalluar),
              tahun_laporan: parseNum(row.tahun_laporan) || new Date().getFullYear(),
              tanggal_laporan: new Date().toISOString().split('T')[0]
            })

          if (metrikError) throw new Error("Gagal insert metrik baru: " + metrikError.message)

          const fileName = `${profil.id}/${periodeLaporan}-${Date.now()}.csv`
          const { error: uploadError } = await supabase.storage.from('berkas_sireko').upload(`keragaan/${fileName}`, file)
          if (uploadError) throw new Error("Gagal upload file: " + uploadError.message)
          
          const { data: publicUrlData } = supabase.storage.from('berkas_sireko').getPublicUrl(`keragaan/${fileName}`)
          
          const { error: dbError } = await supabase.from('dokumen_keragaan').insert({ 
            koperasi_id: profil.id, jenis_laporan: periodeLaporan, periode_laporan: periodeLaporan,
            file_path: publicUrlData.publicUrl, status_indikator: 'merah' 
          })

          if (dbError) throw new Error("Gagal mencatat dokumen ke database: " + dbError.message)

          toast.success('Data CSV berhasil diproses & disimpan!', { id: toastId })
          setFile(null)
          checkUserAndFetchData()
        } catch (error: any) { 
          toast.error(error.message, { id: toastId }); 
        } finally { setIsUploading(false) }
      }
    })
  }

  const formatRp = (angka: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0)
  
  const formatDateIndo = (dateStr: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  }
  
  const handleInputChange = (field: string, value: string) => setFormData({ ...formData, [field]: value })

  const renderBadge = (status: string) => {
    const colors: any = { merah: 'bg-red-100 text-red-800 border-red-200', biru: 'bg-blue-100 text-blue-800 border-blue-200', hijau: 'bg-green-100 text-green-800 border-green-200' }
    return <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase ${colors[status] || colors.merah}`}>{status}</span>
  }

  if (loading) return <div className="min-h-screen bg-white p-8 text-center text-slate-900 font-bold">Memuat data asli dari server...</div>

  return (
    <div className="min-h-screen bg-slate-50 pb-12 font-sans antialiased text-slate-900">
      <Toaster position="top-center" />

      {/* HEADER HALAMAN */}
      <div className="bg-white border-b border-slate-200 py-4 px-6 mb-8 shadow-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-slate-900">Modul Keragaan Koperasi</h1>
          <button onClick={() => router.push('/koperasi/dashboard')} className="text-sm font-semibold text-indigo-700 hover:underline">Kembali ke Dashboard</button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 space-y-8">

        {/* 1. DATA TERAKHIR & INPUT MANUAL (DIPERJELAS) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                Laporan Metrik Terakhir
                {metrikData && !isAddingNew && (
                  <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200 font-bold">
                    Per {formatDateIndo(metrikData.tanggal_laporan || metrikData.created_at)}
                  </span>
                )}
              </h2>
              <p className="text-sm text-slate-500 font-medium">
                {isAddingNew ? 'Silakan isi form di bawah ini dengan lengkap.' : 'Tampilan ini memuat data laporan paling baru dari database.'}
              </p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => isAddingNew ? handleSaveManual() : setIsAddingNew(true)} 
                disabled={isUploading}
                className={`px-4 py-2 font-bold text-sm rounded transition-colors shadow-sm ${isAddingNew ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
              >
                {isUploading ? 'Menyimpan...' : isAddingNew ? 'Simpan Laporan Baru' : '+ Tambah Data Manual'}
              </button>
              {isAddingNew && (
                <button onClick={() => {setIsAddingNew(false); setFormData(metrikData || {})}} className="px-4 py-2 bg-slate-200 text-slate-800 font-bold text-sm rounded hover:bg-slate-300">Batal</button>
              )}
            </div>
          </div>

          {/* FORM / VIEW DIPISAH MENJADI 2 BAGIAN AGAR JELAS */}
          <div className="space-y-6">
            
            {/* Input Tanggal Khusus Saat Add New */}
            {isAddingNew && (
              <div className="bg-indigo-50/50 p-4 rounded-lg border border-indigo-100 flex items-center gap-4">
                <label className="text-sm font-bold text-indigo-900">Tanggal Laporan Baru:</label>
                <input 
                  type="date" 
                  value={formData.tanggal_laporan || ''} 
                  onChange={(e) => handleInputChange('tanggal_laporan', e.target.value)} 
                  className="border border-indigo-200 p-2 rounded-md focus:ring-indigo-500 focus:border-indigo-500 outline-none font-medium" 
                  required
                />
              </div>
            )}

            {/* TABEL 1: DATA SDM */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-100 px-4 py-3 border-b border-slate-200">
                <h3 className="font-bold text-slate-800">Data Sumber Daya Manusia (Orang)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 w-1/3">Kategori Ketenagakerjaan</th>
                      <th className="px-4 py-3 w-1/3">Jumlah Laki-Laki</th>
                      <th className="px-4 py-3 w-1/3">Jumlah Perempuan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    <tr>
                      <td className="px-4 py-3 font-semibold text-slate-800">Total Anggota</td>
                      <td className="px-4 py-3">{isAddingNew ? <input type="number" min="0" value={formData.ang_laki || ''} onChange={(e) => handleInputChange('ang_laki', e.target.value)} className="border p-2 w-full rounded focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-slate-50" /> : <span className="font-medium text-slate-700">{metrikData?.ang_laki || 0} Orang</span>}</td>
                      <td className="px-4 py-3">{isAddingNew ? <input type="number" min="0" value={formData.ang_wanita || ''} onChange={(e) => handleInputChange('ang_wanita', e.target.value)} className="border p-2 w-full rounded focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-slate-50" /> : <span className="font-medium text-slate-700">{metrikData?.ang_wanita || 0} Orang</span>}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-semibold text-slate-800">Total Karyawan</td>
                      <td className="px-4 py-3">{isAddingNew ? <input type="number" min="0" value={formData.kary_laki || ''} onChange={(e) => handleInputChange('kary_laki', e.target.value)} className="border p-2 w-full rounded focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-slate-50" /> : <span className="font-medium text-slate-700">{metrikData?.kary_laki || 0} Orang</span>}</td>
                      <td className="px-4 py-3">{isAddingNew ? <input type="number" min="0" value={formData.kary_wanita || ''} onChange={(e) => handleInputChange('kary_wanita', e.target.value)} className="border p-2 w-full rounded focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-slate-50" /> : <span className="font-medium text-slate-700">{metrikData?.kary_wanita || 0} Orang</span>}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-semibold text-slate-800">Total Manajer</td>
                      <td className="px-4 py-3">{isAddingNew ? <input type="number" min="0" value={formData.mgr_laki || ''} onChange={(e) => handleInputChange('mgr_laki', e.target.value)} className="border p-2 w-full rounded focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-slate-50" /> : <span className="font-medium text-slate-700">{metrikData?.mgr_laki || 0} Orang</span>}</td>
                      <td className="px-4 py-3">{isAddingNew ? <input type="number" min="0" value={formData.mgr_wanita || ''} onChange={(e) => handleInputChange('mgr_wanita', e.target.value)} className="border p-2 w-full rounded focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-slate-50" /> : <span className="font-medium text-slate-700">{metrikData?.mgr_wanita || 0} Orang</span>}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* TABEL 2: DATA KEUANGAN */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-100 px-4 py-3 border-b border-slate-200">
                <h3 className="font-bold text-slate-800">Data Keuangan (Rupiah)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 w-1/3">Indikator Keuangan</th>
                      <th className="px-4 py-3 w-2/3">Nilai dalam Rupiah (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    <tr>
                      <td className="px-4 py-3 font-semibold text-slate-800">Total Aset</td>
                      <td className="px-4 py-3">{isAddingNew ? <input type="number" min="0" value={formData.asset || ''} onChange={(e) => handleInputChange('asset', e.target.value)} placeholder="Contoh: 150000000" className="border p-2 w-full max-w-md rounded focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-slate-50" /> : <span className="font-medium text-slate-700">{formatRp(metrikData?.asset)}</span>}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-semibold text-slate-800">Sisa Hasil Usaha (SHU)</td>
                      <td className="px-4 py-3">{isAddingNew ? <input type="number" value={formData.shu || ''} onChange={(e) => handleInputChange('shu', e.target.value)} placeholder="Contoh: 25000000" className="border p-2 w-full max-w-md rounded focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-slate-50" /> : <span className="font-bold text-green-600">{formatRp(metrikData?.shu)}</span>}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-semibold text-slate-800">Volume Usaha</td>
                      <td className="px-4 py-3">{isAddingNew ? <input type="number" min="0" value={formData.volusaha || ''} onChange={(e) => handleInputChange('volusaha', e.target.value)} placeholder="Contoh: 50000000" className="border p-2 w-full max-w-md rounded focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-slate-50" /> : <span className="font-medium text-slate-700">{formatRp(metrikData?.volusaha)}</span>}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-semibold text-slate-800">Modal Sendiri</td>
                      <td className="px-4 py-3">{isAddingNew ? <input type="number" min="0" value={formData.modalsendiri || ''} onChange={(e) => handleInputChange('modalsendiri', e.target.value)} className="border p-2 w-full max-w-md rounded focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-slate-50" /> : <span className="font-medium text-slate-700">{formatRp(metrikData?.modalsendiri)}</span>}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-semibold text-slate-800">Modal Luar</td>
                      <td className="px-4 py-3">{isAddingNew ? <input type="number" min="0" value={formData.modalluar || ''} onChange={(e) => handleInputChange('modalluar', e.target.value)} className="border p-2 w-full max-w-md rounded focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-slate-50" /> : <span className="font-medium text-slate-700">{formatRp(metrikData?.modalluar)}</span>}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>

        {/* 2. DAFTAR RIWAYAT DATA (DENGAN FILTER & PAGINATION) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200" id="riwayat-section">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-md font-bold text-slate-800 uppercase tracking-wider">Riwayat Data Keragaan</h2>
              <p className="text-sm text-slate-500 mt-1">Daftar laporan yang pernah disubmit ke sistem.</p>
            </div>
            
            {/* FITUR FILTER BULAN / TAHUN */}
            <div className="flex gap-2">
              <select value={filterBulan} onChange={(e) => setFilterBulan(e.target.value)} className="p-2 border border-slate-300 rounded-md text-sm font-medium outline-none focus:border-indigo-500 bg-slate-50">
                <option value="">Semua Bulan</option>
                <option value="1">Januari</option><option value="2">Februari</option><option value="3">Maret</option>
                <option value="4">April</option><option value="5">Mei</option><option value="6">Juni</option>
                <option value="7">Juli</option><option value="8">Agustus</option><option value="9">September</option>
                <option value="10">Oktober</option><option value="11">November</option><option value="12">Desember</option>
              </select>
              
              <select value={filterTahun} onChange={(e) => setFilterTahun(e.target.value)} className="p-2 border border-slate-300 rounded-md text-sm font-medium outline-none focus:border-indigo-500 bg-slate-50">
                <option value="">Semua Tahun</option>
                {[...Array(5)].map((_, i) => {
                  const year = new Date().getFullYear() - i;
                  return <option key={year} value={year}>{year}</option>
                })}
              </select>
            </div>
          </div>

          {filteredRiwayat.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-lg border border-dashed border-slate-300">
              <p className="text-sm text-slate-500 font-medium">Tidak ada data riwayat yang sesuai dengan filter.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {paginatedRiwayat.map((metrik: any) => (
                  <div key={metrik.id} className="border border-slate-200 rounded-xl bg-slate-50 overflow-hidden shadow-sm hover:border-indigo-300 transition-colors">
                    
                    {/* Kotak Ringkasan */}
                    <div className="p-5">
                      <p className="font-black text-slate-900 text-lg">Laporan {formatDateIndo(metrik.tanggal_laporan || metrik.created_at)}</p>
                      <div className="mt-3 space-y-1.5">
                        <p className="text-sm font-medium text-slate-600 flex justify-between">
                          <span>Total Aset:</span> <span className="font-bold text-slate-900">{formatRp(metrik.asset)}</span>
                        </p>
                        <p className="text-sm font-medium text-slate-600 flex justify-between">
                          <span>SHU:</span> <span className="font-bold text-green-600">{formatRp(metrik.shu)}</span>
                        </p>
                      </div>
                      
                      {/* Tombol Toggle Accordion */}
                      <button 
                        onClick={() => setExpandedId(expandedId === metrik.id ? null : metrik.id)}
                        className="w-full mt-4 py-2 bg-white border border-indigo-200 text-indigo-700 font-bold text-sm rounded-lg shadow-sm hover:bg-indigo-50 transition-colors flex justify-center items-center gap-2"
                      >
                        {expandedId === metrik.id ? 'Tutup Detail' : 'Lihat Laporan Lengkap'}
                        <svg className={`w-4 h-4 transform transition-transform ${expandedId === metrik.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </button>
                    </div>

                    {/* FITUR DROPDOWN/ACCORDION ISI DETAIL */}
                    {expandedId === metrik.id && (
                      <div className="bg-white border-t border-slate-200 p-5 text-sm animate-in slide-in-from-top-2 duration-200">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                          <div className="col-span-2 pb-2 border-b border-slate-100 font-bold text-slate-800">Data SDM</div>
                          <div className="flex justify-between text-slate-600"><span>Anggota (L):</span> <span className="font-semibold text-slate-900">{metrik.ang_laki}</span></div>
                          <div className="flex justify-between text-slate-600"><span>Anggota (P):</span> <span className="font-semibold text-slate-900">{metrik.ang_wanita}</span></div>
                          <div className="flex justify-between text-slate-600"><span>Karyawan (L):</span> <span className="font-semibold text-slate-900">{metrik.kary_laki}</span></div>
                          <div className="flex justify-between text-slate-600"><span>Karyawan (P):</span> <span className="font-semibold text-slate-900">{metrik.kary_wanita}</span></div>
                          <div className="flex justify-between text-slate-600"><span>Manajer (L):</span> <span className="font-semibold text-slate-900">{metrik.mgr_laki}</span></div>
                          <div className="flex justify-between text-slate-600"><span>Manajer (P):</span> <span className="font-semibold text-slate-900">{metrik.mgr_wanita}</span></div>
                          
                          <div className="col-span-2 pt-2 pb-2 border-b border-slate-100 font-bold text-slate-800 mt-2">Data Keuangan</div>
                          <div className="col-span-2 flex justify-between text-slate-600"><span>Volume Usaha:</span> <span className="font-semibold text-slate-900">{formatRp(metrik.volusaha)}</span></div>
                          <div className="col-span-2 flex justify-between text-slate-600"><span>Modal Sendiri:</span> <span className="font-semibold text-slate-900">{formatRp(metrik.modalsendiri)}</span></div>
                          <div className="col-span-2 flex justify-between text-slate-600"><span>Modal Luar:</span> <span className="font-semibold text-slate-900">{formatRp(metrik.modalluar)}</span></div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* FITUR PAGINATION CONTROLS */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6 pt-6 border-t border-slate-100">
                  <p className="text-sm font-medium text-slate-500">Halaman {currentPage} dari {totalPages}</p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setCurrentPage(p => Math.max(1, p - 1));
                        document.getElementById('riwayat-section')?.scrollIntoView({ behavior: 'smooth' });
                      }} 
                      disabled={currentPage === 1}
                      className="px-4 py-2 border border-slate-300 rounded text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Sebelumnya
                    </button>
                    <button 
                      onClick={() => {
                        setCurrentPage(p => Math.min(totalPages, p + 1));
                        document.getElementById('riwayat-section')?.scrollIntoView({ behavior: 'smooth' });
                      }} 
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 border border-slate-300 rounded text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Selanjutnya
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* 3. UPLOAD CSV & TOMBOL UNDUH TEMPLATE */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-1">Unggah Laporan via CSV</h2>
                <p className="text-sm text-slate-600 font-medium">Sistem akan membaca file CSV Anda dan mencatatnya sebagai laporan metrik terbaru.</p>
              </div>
              <button onClick={handleDownloadTemplate} type="button" className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-bold shadow-sm hover:bg-emerald-100 transition-colors whitespace-nowrap">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                Unduh Template CSV
              </button>
            </div>
            
            <form onSubmit={handleUploadCSV} className="flex gap-4 items-end flex-wrap bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-bold text-slate-700 mb-1">Periode Laporan:</label>
                  <select value={periodeLaporan} onChange={(e) => setPeriodeLaporan(e.target.value)} className="w-full rounded-md border border-slate-300 p-2 bg-white text-slate-900 font-medium outline-none focus:border-indigo-500">
                      <option value="bulanan">Per Bulan</option><option value="triwulan">Per Trisemester</option>
                      <option value="semesteran">Per Semester</option><option value="tahunan">Per Tahun</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-bold text-slate-700 mb-1">Pilih File CSV:</label>
                  <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full text-sm text-slate-800 p-1.5 border border-slate-300 rounded bg-white shadow-sm outline-none focus:border-indigo-500" />
                </div>
                <button type="submit" disabled={isUploading || !file || isAddingNew} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded shadow-sm hover:bg-indigo-700 disabled:bg-slate-400 transition-colors h-[42px]">
                  {isUploading ? "Memproses..." : "Upload & Tambah Data"}
                </button>
            </form>
        </div>

        {/* 4. RIWAYAT DOKUMEN CSV */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-md font-bold text-slate-800 uppercase mb-4 tracking-wider">Riwayat Unggahan Dokumen (Berkas Asli)</h2>
          {dokumenList.length === 0 ? <p className="text-sm text-slate-500 italic">Belum ada dokumen yang diunggah.</p> : (
            <div className="space-y-3">
              {dokumenList.map((doc: any) => (
                <div key={doc.id} className="flex justify-between items-center p-4 border border-slate-200 rounded-lg bg-slate-50 hover:border-indigo-200 transition-colors">
                  <div>
                    <p className="font-bold text-slate-900 capitalize">File Laporan {doc.jenis_laporan.replace('_', ' ')}</p>
                    <p className="text-xs font-medium text-slate-500 mt-1">Diunggah pada: {new Date(doc.uploaded_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
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