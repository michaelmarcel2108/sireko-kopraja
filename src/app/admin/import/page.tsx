'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import Papa from 'papaparse'

export default function AdminImportPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [stats, setStats] = useState({ total: 0, sukses: 0, gagal: 0 })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0])
      setLogs([])
      setStats({ total: 0, sukses: 0, gagal: 0 })
    }
  }

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }

  const handleProcessImport = async () => {
    if (!file) return alert('Silakan pilih file CSV terlebih dahulu!')

    setIsProcessing(true)
    addLog('Mengecek data slug di database untuk mencegah duplikat...')

    // 1. Ambil semua slug yang sudah ada di database
    const { data: existingData } = await supabase.from('data_keragaan_metrik').select('slug')
    const existingSlugs = new Set(existingData?.map(d => d.slug) || [])

    // Fungsi pembuat Slug Cerdas (Otomatis tambah -1, -2 jika kembar)
    const createUniqueSlug = (nama: string) => {
      let baseSlug = (nama || 'koperasi')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-') // Ganti spasi/karakter aneh dengan strip
        .replace(/(^-|-$)+/g, '') // Hapus strip di awal/akhir jika ada

      let slug = baseSlug
      let counter = 1
      while (existingSlugs.has(slug)) {
        slug = `${baseSlug}-${counter}`
        counter++
      }
      existingSlugs.add(slug) // Simpan ke memory agar baris selanjutnya tidak bentrok
      return slug
    }

    addLog('Memulai pembacaan file CSV...')

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rawRows = results.data
        addLog(`Berhasil membaca ${rawRows.length} baris data dari file.`)
        setStats((prev) => ({ ...prev, total: rawRows.length }))

        const batchSize = 50 
        let suksesCount = 0
        let gagalCount = 0

        addLog('Memulai proses sinkronisasi ke database...')

        for (let i = 0; i < rawRows.length; i += batchSize) {
          const chunk = rawRows.slice(i, i + batchSize)
          
          const formattedChunk = chunk.map((row: any) => {
            const parseNum = (val: any) => {
              if (!val) return 0
              const cleaned = String(val).replace(/[^0-9.-]/g, '')
              return Number(cleaned) || 0
            }

            const namaKoperasi = row.nmkop || row.nama_koperasi || 'Koperasi'

            return {
              nmkop: namaKoperasi,
              slug: createUniqueSlug(namaKoperasi), // <--- PENAMBAHAN SLUG OTOMATIS
              nobh: row.nobh || row.nomor_badan_hukum,
              ang_laki: parseNum(row.ang_laki),
              ang_wanita: parseNum(row.ang_wanita),
              kary_laki: parseNum(row.kary_laki),
              kary_wanita: parseNum(row.kary_wanita),
              mgr_laki: parseNum(row.mgr_laki),
              mgr_wanita: parseNum(row.mgr_wanita),
              modalsendiri: parseNum(row.modalsendiri),
              modalluar: parseNum(row.modalluar),
              volusaha: parseNum(row.volusaha),
              shu: parseNum(row.shu),
              asset: parseNum(row.asset),
              tglrat: (!row.tglrat || String(row.tglrat).includes('1899')) ? null : row.tglrat,
              tahun_laporan: parseNum(row.tahun_laporan) || 2026
            }
          })

          const { error } = await supabase.from('data_keragaan_metrik').insert(formattedChunk)

          if (error) {
            gagalCount += chunk.length
            addLog(`❌ Gagal baris ${i + 1}: ${error.message}`)
          } else {
            suksesCount += chunk.length
            addLog(`✅ Berhasil memasukkan baris ${i + 1} sampai ${i + chunk.length}`)
          }

          setStats({ total: rawRows.length, sukses: suksesCount, gagal: gagalCount })
        }
        addLog('🎉 Proses import selesai sepenuhnya!')
        setIsProcessing(false)
      }
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12 font-sans text-gray-900">
      <div className="bg-white border-b border-gray-200 py-4 px-6 mb-8 shadow-sm">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <button onClick={() => router.push('/admin/dashboard')} className="text-sm font-bold text-indigo-700 hover:underline mb-1 block">&larr; Kembali ke Dashboard</button>
            <h1 className="text-2xl font-bold text-gray-900">Sistem Import Massal CSV</h1>
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Pilih Berkas CSV</h2>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <input type="file" accept=".csv" disabled={isProcessing} onChange={handleFileChange} className="w-full text-sm text-gray-800 border border-gray-300 p-2 rounded" />
            <button onClick={handleProcessImport} disabled={isProcessing || !file} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded shadow hover:bg-indigo-700 disabled:bg-gray-400 whitespace-nowrap">
              {isProcessing ? 'Memproses...' : 'Mulai Import'}
            </button>
          </div>
          {stats.total > 0 && (
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100 text-center">
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200"><p className="text-xs font-bold text-gray-700">Total Baris</p><p className="text-xl font-bold text-gray-900">{stats.total}</p></div>
              <div className="bg-green-50 p-3 rounded-lg border border-green-200"><p className="text-xs font-bold text-green-700">Sukses</p><p className="text-xl font-bold text-green-700">{stats.sukses}</p></div>
              <div className="bg-red-50 p-3 rounded-lg border border-red-200"><p className="text-xs font-bold text-red-700">Gagal</p><p className="text-xl font-bold text-red-700">{stats.gagal}</p></div>
            </div>
          )}
        </div>
        <div className="bg-gray-900 rounded-xl p-6 shadow-inner border border-gray-800 text-white font-mono text-xs space-y-2 h-80 overflow-y-auto">
          <p className="text-gray-400">// Konsol Monitor Proses Sinkronisasi</p>
          {logs.map((log, index) => <p key={index}>{log}</p>)}
        </div>
      </div>
    </div>
  )
}