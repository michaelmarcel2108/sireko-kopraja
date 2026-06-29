import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Menggunakan Admin Key agar bisa mengubah email/password secara paksa dan instan
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { userId, email, password, namaKoperasi, profilId } = await req.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID tidak ditemukan" }, { status: 400 })
    }

    // 1. Ganti Email & Password secara paksa di tabel Auth
    const authUpdates: any = {
      email_confirm: true // Otomatis menganggap email ini sah
    }
    if (email) authUpdates.email = email
    if (password) authUpdates.password = password

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, authUpdates)
    
    if (authError) throw new Error("Gagal mengubah data Auth: " + authError.message)

    // 2. Ganti Nama Koperasi di tabel Profil
    if (profilId && namaKoperasi) {
      const { error: profilError } = await supabaseAdmin
        .from('profil_koperasi')
        .update({ nama_koperasi: namaKoperasi })
        .eq('id', profilId)
      
      if (profilError) throw new Error("Gagal mengubah Nama Koperasi: " + profilError.message)
    }

    return NextResponse.json({ status: "sukses" })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}