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

  const handleProcessImport = () => {
    if (!file) return alert('Silakan pilih file CSV terlebih dahulu!')

    setIsProcessing(true)
    addLog('Memulai pembacaan file CSV...')

    Papa.parse(file, {
      header: true, // Membaca baris pertama sebagai nama kolom
      skipEmptyLines: true,
      complete: async (results) => {
        const rawRows = results.data
        addLog(`Berhasil membaca ${rawRows.length} baris data dari file.`);
        setStats((prev) => ({ ...prev, total: rawRows.length }))

        const batchSize = 50 // Kita proses per 50 baris agar tidak membebani database
        let suksesCount = 0
        let gagalCount = 0

        addLog('Memulai proses sinkronisasi ke database Supabase...')

        for (let i = 0; i < rawRows.length; i += batchSize) {
          const chunk = rawRows.slice(i, i + batchSize)
          
          // Format data agar sesuai dengan tipe data PostgreSQL (Angka & Tanggal)
          const formattedChunk = chunk.map((row: any) => {
            
            // Helper untuk membersihkan angka (menghilangkan spasi/titik jika ada format mata uang)
            const parseNum = (val: any) => {
              if (!val) return 0
              const cleaned = String(val).replace(/[^0-9.-]/g, '')
              return Number(cleaned) || 0
            }

            // Helper format tanggal (YYYY-MM-DD)
            const parseDate = (val: any) => {
              if (!val || String(val).includes('1899')) return null
              return val
            }

            return {
              nmkop: row.nmkop || row.nama_koperasi,
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
              tglrat: parseDate(row.tglrat),
              tahun_laporan: parseNum(row.tahun_laporan) || 2026
            }
          })

          // Tembak ke tabel data_keragaan_metrik di Supabase
          const { error } = await supabase
            .from('data_keragaan_metrik')
            .insert(formattedChunk)

          if (error) {
            console.error('Error insert batch:', error)
            gagalCount += chunk.length
            addLog(`❌ Gagal memasukkan baris ${i + 1} sampai ${i + chunk.length}: ${error.message}`)
          } else {
            suksesCount += chunk.length
            addLog(`✅ Berhasil memasukkan baris ${i + 1} sampai ${i + chunk.length}`)
          }

          setStats({ total: rawRows.length, sukses: suksesCount, gagal: gagalCount })
        }

        addLog('🎉 Proses import selesai sepenuhnya!')
        setIsProcessing(false)
      },
      error: (error) => {
        addLog(`❌ Error saat membaca file: ${error.message}`)
        setIsProcessing(false)
      }
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 py-4 px-6 mb-8 shadow-sm">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <button onClick={() => router.push('/admin/dashboard')} className="text-sm text-indigo-600 hover:underline mb-1 block">
              &larr; Kembali ke Dashboard
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Sistem Import Massal CSV</h1>
            <p className="text-sm text-gray-500">Unggah file CSV hasil konversi Excel untuk sinkronisasi otomatis.</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 space-y-6">
        {/* Panel Upload */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Pilih Berkas CSV</h2>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <input
              type="file"
              accept=".csv"
              disabled={isProcessing}
              onChange={handleFileChange}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50"
            />
            <button
              onClick={handleProcessImport}
              disabled={isProcessing || !file}
              className="w-full sm:w-auto px-6 py-2 bg-indigo-600 text-white font-semibold rounded-md shadow hover:bg-indigo-700 disabled:bg-gray-300 transition-colors whitespace-nowrap"
            >
              {isProcessing ? 'Memproses Data...' : 'Mulai Import Massal'}
            </button>
          </div>

          {/* Kartu Statistik */}
          {stats.total > 0 && (
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100 text-center">
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <p className="text-xs font-medium text-gray-500 uppercase">Total Baris</p>
                <p className="text-xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                <p className="text-xs font-medium text-green-700 uppercase">Sukses</p>
                <p className="text-xl font-bold text-green-700">{stats.sukses}</p>
              </div>
              <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                <p className="text-xs font-medium text-red-700 uppercase">Gagal</p>
                <p className="text-xl font-bold text-red-700">{stats.gagal}</p>
              </div>
            </div>
          )}
        </div>

        {/* Kotak Log Monitor */}
        <div className="bg-gray-900 rounded-xl p-6 shadow-inner border border-gray-800 text-white font-mono text-xs space-y-2 h-80 overflow-y-auto">
          <p className="text-gray-500">// Konsol Monitor Proses Sinkronisasi</p>
          {logs.length === 0 ? (
            <p className="text-gray-400 italic">Belum ada aktivitas. Silakan pilih file dan jalankan import.</p>
          ) : (
            logs.map((log, index) => (
              <p key={index} className="leading-relaxed whitespace-pre-wrap">{log}</p>
            ))
          )}
        </div>
      </div>
    </div>
  )
}