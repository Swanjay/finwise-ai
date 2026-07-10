import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"
import { rateLimitMiddleware } from "@/lib/supabase-ratelimit"

function getAuthSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

// POST /api/auth/register
export async function POST(req: Request) {
  try {
    // Rate limit: 5 registrations per minute per IP
    const rateLimitResponse = await rateLimitMiddleware(req, { windowMs: 60_000, max: 5 })
    if (rateLimitResponse) return rateLimitResponse

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Request body tidak valid" }, { status: 400 })
    }

    const { email, password, name } = body as {
      email?: string
      password?: string
      name?: string
    }

    // ─── Validate ───
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email wajib diisi" }, { status: 400 })
    }
    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "Password wajib diisi" }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json({ error: "Format email tidak valid" }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password minimal 8 karakter" }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const userId = `email:${normalizedEmail}`

    // ─── Check if already registered ───
    const supabase = getAuthSupabase()
    if (!supabase) {
      return NextResponse.json(
        { error: "Server tidak terkonfigurasi. Hubungi admin." },
        { status: 500 }
      )
    }

    const { data: existing } = await supabase
      .from("user_credentials")
      .select("user_id")
      .eq("user_id", userId)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: "Email sudah terdaftar. Gunakan email lain atau login." },
        { status: 409 }
      )
    }

    // ─── Hash password ───
    const salt = await bcrypt.genSalt(12)
    const passwordHash = await bcrypt.hash(password, salt)

    // ─── Store credentials ───
    const { error: insertError } = await supabase
      .from("user_credentials")
      .insert({
        user_id: userId,
        password_hash: passwordHash,
      })

    if (insertError) {
      console.error("[register] Insert error:", insertError)
      return NextResponse.json(
        { error: "Gagal mendaftarkan akun. Coba lagi." },
        { status: 500 }
      )
    }

    // ─── Also create Supabase Auth user (so session works) ───
    try {
      await supabase.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: { provider: "email-password" },
      })
    } catch {
      // Non-fatal
    }

    const displayName = name?.trim() || normalizedEmail.split("@")[0]
    return NextResponse.json({
      ok: true,
      message: "Akun berhasil dibuat!",
      user: { email: normalizedEmail, name: displayName },
    })
  } catch (err) {
    console.error("[register] Error:", err)
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
}

// GET — disabled (prevents user enumeration)
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}
