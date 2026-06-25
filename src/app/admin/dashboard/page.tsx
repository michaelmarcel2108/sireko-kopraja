'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

// Mendefinisikan tipe data agar TypeScript tidak protes
interface KoperasiData {
  id: string
  nama: string
  statusKeragaan: 'merah' | 'biru' | 'hijau'
  statusKesehatan: 'merah' | 'biru' | 'hijau'
}

export default function AdminDashboard() {
  const router = useRouter()
  const [koperasiList, setKoperasiList] = useState<KoperasiData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchKoperasi()
  }, [])

  const fetchKoperasi = async () => {
    try {
      // Mengambil data koperasi beserta relasi dokumennya dari Supabase
      const { data, error } = await supabase
        .from('profil_koperasi')
        .select(`
          id, 
          nama_koperasi, 
          dokumen_keragaan(status_indikator), 
          dokumen_kesehatan(status_indikator)
        `)
        .order('nama_koperasi', { ascending: true })

      if (error) throw error

      if (data) {
        // Mengolah data yang ditarik untuk menentukan warna status utama
        const formattedData: KoperasiData[] = data.map((kop: any) => {
          
          // Logika kalkulasi status:
          // Jika ada 1 saja dokumen 'merah', maka status umum 'merah' (Butuh Perhatian).
          // Jika tidak ada merah, tapi ada 'biru', maka 'biru' (Sedang Diproses/Dilihat).
          // Jika semua dokumen 'hijau', maka status 'hijau' (Selesai Terverifikasi).
          // Jika kosong (belum upload apa-apa), otomatis 'merah'.
          const getOverallStatus = (docs: any[] | null) => {
            if (!docs || docs.length === 0) return 'merah'
            const statuses = docs.map(d => d.status_indikator)
            if (statuses.includes('merah')) return 'merah'
            if (statuses.includes('biru')) return 'biru'
            return 'hijau'
          }

          return {
            id: kop.id,
            nama: kop.nama_koperasi,
            statusKeragaan: getOverallStatus(kop.dokumen_keragaan),
            statusKesehatan: getOverallStatus(kop.dokumen_kesehatan),
          }
        })
        setKoperasiList(formattedData)
      }
    } catch (error: any) {
      console.error('Gagal mengambil data koperasi:', error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const renderBadge = (status: string) => {
    const colors: Record<string, string> = {
      merah: 'bg-red-100 text-red-800 border-red-200',
      biru: 'bg-blue-100 text-blue-800 border-blue-200',
      hijau: 'bg-green-100 text-green-800 border-green-200'
    }
    const labels: Record<string, string> = {
      merah: 'Belum Dilihat / Kosong',
      biru: 'Sedang Diproses',
      hijau: 'Terverifikasi'
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[status]}`}>
        {labels[status]}
      </span>
    )
  }

  // Kalkulasi data untuk Diagram Keragaan
  const dataKeragaan = [
    { name: 'Belum Dilihat (Merah)', value: koperasiList.filter(k => k.statusKeragaan === 'merah').length, color: '#fee2e2' }, // bg-red-100
    { name: 'Diproses (Biru)', value: koperasiList.filter(k => k.statusKeragaan === 'biru').length, color: '#dbeafe' }, // bg-blue-100
    { name: 'Terverifikasi (Hijau)', value: koperasiList.filter(k => k.statusKeragaan === 'hijau').length, color: '#dcfce3' }, // bg-green-100
  ].filter(item => item.value > 0) // Hanya tampilkan yang ada nilainya

  // Kalkulasi data untuk Diagram Kesehatan
  const dataKesehatan = [
    { name: 'Belum Dilihat (Merah)', value: koperasiList.filter(k => k.statusKesehatan === 'merah').length, color: '#fee2e2' },
    { name: 'Diproses (Biru)', value: koperasiList.filter(k => k.statusKesehatan === 'biru').length, color: '#dbeafe' },
    { name: 'Terverifikasi (Hijau)', value: koperasiList.filter(k => k.statusKesehatan === 'hijau').length, color: '#dcfce3' },
  ].filter(item => item.value > 0)

  // Warna garis pinggir diagram agar lebih tegas
  const strokeColors: any = { '#fee2e2': '#ef4444', '#dbeafe': '#3b82f6', '#dcfce3': '#22c55e' }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-indigo-700 shadow-lg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <span className="text-xl font-bold text-white">SIREKO - Panel Admin Dinas</span>
            <button
              onClick={handleLogout}
              className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 border border-indigo-500"
            >
              Keluar
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Diagram Kurva Data Koperasi</h2>
          
          {loading ? (
            <div className="h-64 flex items-center justify-center text-gray-500">Memuat diagram...</div>
          ) : koperasiList.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-500">Belum ada data untuk ditampilkan</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Diagram Keragaan */}
              <div className="h-72 bg-gray-50 rounded-lg border border-gray-100 p-4 flex flex-col">
                <h3 className="text-sm font-bold text-center text-gray-700 mb-2">Keragaan {koperasiList.length} Koperasi</h3>
                <div className="flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dataKeragaan}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {dataKeragaan.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke={strokeColors[entry.color]} strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Diagram Kesehatan */}
              <div className="h-72 bg-gray-50 rounded-lg border border-gray-100 p-4 flex flex-col">
                <h3 className="text-sm font-bold text-center text-gray-700 mb-2">Kesehatan {koperasiList.length} Koperasi</h3>
                <div className="flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dataKesehatan}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {dataKesehatan.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke={strokeColors[entry.color]} strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          )}
        </section>

        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="sm:flex sm:items-center mb-6">
            <div className="sm:flex-auto">
              <h2 className="text-lg font-bold text-gray-900">Daftar Koperasi</h2>
              <p className="mt-2 text-sm text-gray-700">
                Klik pada baris koperasi untuk membuka detail keragaan dan kesehatannya.
              </p>
            </div>
          </div>
          
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Nama Koperasi</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status Keragaan</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status Kesehatan</th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-sm text-gray-500">
                      Memuat data dari database...
                    </td>
                  </tr>
                ) : koperasiList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-sm text-gray-500">
                      Belum ada data koperasi di database.
                    </td>
                  </tr>
                ) : (
                  koperasiList.map((koperasi) => (
                    <tr key={koperasi.id} className="hover:bg-gray-50 transition-colors">
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        {koperasi.nama}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        {renderBadge(koperasi.statusKeragaan)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        {renderBadge(koperasi.statusKesehatan)}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <button 
                          onClick={() => router.push(`/admin/${koperasi.id}`)}
                          className="text-indigo-600 hover:text-indigo-900 font-semibold"
                        >
                          Buka Detail
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}