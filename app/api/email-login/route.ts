import { NextResponse } from "next/server"
import crypto from "crypto"
import { rateLimitMiddleware, getClientIp } from "@/lib/rate-limit-kv"
import { createTelegramSignature } from "@/auth"

// In-memory code store — same pattern as Telegram login.
// TODO: migrate to Supabase or Upstash Redis for production persistence.
const codes = new Map<string, { code: string; expires: number; attempts: number }>()

function generateCode(): string {
  return crypto.randomInt(100000, 999999).toString()
}

// POST /api/email-login
export async function POST(req: Request) {
  try {
    // Rate limit: 5 requests per minute per IP
    const rateLimitResponse = await rateLimitMiddleware(req, { windowMs: 60_000, max: 5 })
    if (rateLimitResponse) return rateLimitResponse

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Request body tidak valid" }, { status: 400 })
    }

    const { action, email, code } = body as {
      action?: string
      email?: string
      code?: string
    }

    // ─── REQUEST CODE ───
    if (action === "request") {
      if (!email || typeof email !== "string") {
        return NextResponse.json({ error: "Email tidak boleh kosong" }, { status: 400 })
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email.trim())) {
        return NextResponse.json({ error: "Format email tidak valid" }, { status: 400 })
      }

      const normalizedEmail = email.trim().toLowerCase()
      const key = `email:${normalizedEmail}`

      // Check cooldown (30 seconds between requests)
      const existing = codes.get(key)
      if (existing && Date.now() - (existing.expires - 300_000) < 30_000) {
        return NextResponse.json(
          { error: "Tunggu 30 detik sebelum minta kode lagi" },
          { status: 429 },
        )
      }

      // Generate and store code
      const verificationCode = generateCode()
      codes.set(key, {
        code: verificationCode,
        expires: Date.now() + 300_000, // 5 minutes
        attempts: 0,
      })

      // Log code for development only (never log in production)
      if (process.env.NODE_ENV === 'development') {
        console.log(`[email-login] Verification code for ${normalizedEmail}: ${verificationCode}`)
      }

      // TODO: When SMTP is configured, send email here:
      // await sendEmail({
      //   to: normalizedEmail,
      //   subject: "Kode Verifikasi FinWise",
      //   text: `Kode verifikasi kamu: ${verificationCode}. Berlaku 5 menit.`,
      // })

      return NextResponse.json({ ok: true, message: "Kode terkirim" })
    }

    // ─── VERIFY CODE ───
    if (action === "verify") {
      if (!email || typeof email !== "string" || !code || typeof code !== "string") {
        return NextResponse.json({ error: "Email dan kode wajib diisi" }, { status: 400 })
      }

      const normalizedEmail = email.trim().toLowerCase()
      const key = `email:${normalizedEmail}`
      const stored = codes.get(key)

      if (!stored) {
        return NextResponse.json(
          { error: "Kode tidak ditemukan. Minta kode baru." },
          { status: 400 },
        )
      }

      if (Date.now() > stored.expires) {
        codes.delete(key)
        return NextResponse.json(
          { error: "Kode sudah kadaluarsa. Minta kode baru." },
          { status: 400 },
        )
      }

      stored.attempts++
      if (stored.attempts > 5) {
        codes.delete(key)
        return NextResponse.json(
          { error: "Terlalu banyak percobaan. Minta kode baru." },
          { status: 429 },
        )
      }

      // Timing-safe comparison to prevent character-by-character brute force
      const codeA = Buffer.from(stored.code)
      const codeB = Buffer.from(code.trim().padEnd(stored.code.length))
      if (codeA.length !== codeB.length || !crypto.timingSafeEqual(codeA, codeB)) {
        return NextResponse.json({ error: "Kode salah" }, { status: 400 })
      }

      // Code is valid — clean up
      codes.delete(key)

      // Create or find user ID based on email (deterministic)
      const userId = `email:${normalizedEmail}`
      const sig = createTelegramSignature(userId, normalizedEmail)

      return NextResponse.json({
        ok: true,
        user: {
          id: userId,
          name: normalizedEmail.split("@")[0],
          username: normalizedEmail,
          sig,
        },
      })
    }

    return NextResponse.json({ error: "Action tidak valid" }, { status: 400 })
  } catch (err) {
    console.error("[email-login] Error:", err)
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 })
  }
}
