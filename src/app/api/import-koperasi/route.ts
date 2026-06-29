import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'

// Menggunakan Service Role Key untuk membypass RLS dan bisa create akun Auth
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
)

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data_koperasi.csv')
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File data_koperasi.csv tidak ditemukan di folder public/" }, { status: 400 })
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8')
    
    const { data } = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      delimiter: ';' // Format bawaan file Anda dipisah oleh titik koma
    })

    let successCount = 0
    let logs = []

    // Looping semua baris di CSV
    for (const row of data as any[]) {
      if (!row.idkop || !row.nmkop) continue;

      // SETTING AKUN LOGIN KOPERASI:
      // Email = koperasi[idkop]@sireko.com (Contoh: koperasi1@sireko.com)
      // Password = Koperasi2026!
      const email = `koperasi${row.idkop.trim()}@sireko.com`
      const password = `Koperasi2026!`
      
      const namaKoperasi = row.nmkop.trim()
      const nobh = row.nobh && row.nobh.trim() !== '-' ? row.nobh.trim() : `BELUM-ADA-${row.idkop}`
      const slug = namaKoperasi.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')

      // Fungsi untuk membersihkan angka (membuang titik separator ribuan)
      const parseNum = (val: any) => {
        if (!val || typeof val !== 'string') return 0;
        return Number(val.replace(/\./g, '').replace(/[^0-9-]/g, '')) || 0;
      }

      // 1. Buat Akun Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true
      })

      if (authError) {
        logs.push(`Gagal buat akun [${namaKoperasi}]: ${authError.message}`)
        continue; // Lanjut ke koperasi berikutnya jika gagal buat akun
      }

      const userId = authData?.user?.id

      if (userId) {
        // 2. Insert Profil Koperasi
        const { error: profilError } = await supabaseAdmin.from('profil_koperasi').insert({
          user_id: userId,
          nama_koperasi: namaKoperasi,
          nomor_badan_hukum: nobh,
          slug: slug
        })

        if (profilError) logs.push(`Profil Error [${namaKoperasi}]: ${profilError.message}`)

        // 3. Insert Data Keragaan Metrik Awal (Diambil dari CSV)
        const { error: metrikError } = await supabaseAdmin.from('data_keragaan_metrik').insert({
          nobh: nobh,
          slug: slug,
          nmkop: namaKoperasi,
          ang_laki: parseNum(row.Anggt), // Menggabungkan total anggota sementara
          ang_wanita: 0,
          kary_laki: parseNum(row.Krywn),
          kary_wanita: 0,
          mgr_laki: parseNum(row.Mngr),
          mgr_wanita: 0,
          asset: parseNum(row.asset),
          shu: parseNum(row.shu),
          volusaha: parseNum(row.volusaha),
          modalsendiri: parseNum(row.modalsendiri),
          modalluar: parseNum(row.modalluar),
          tahun_laporan: 2026 // Diambil dari POSISI PER 2026 di file CSV
        })

        if (metrikError) {
            logs.push(`Metrik Error [${namaKoperasi}]: ${metrikError.message}`)
        } else {
            successCount++;
        }
      }
    }

    return NextResponse.json({ 
      status: "SELESAI",
      pesan: `Berhasil memproses & mendaftarkan ${successCount} koperasi beserta data keragaannya.`, 
      error_log: logs 
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}