import { NextResponse } from "next/server"
import crypto from "crypto"
import { rateLimitMiddleware } from "@/lib/supabase-ratelimit"
import { otpSet, otpGet, otpIncrementAttempts, otpDelete, otpGetCooldown } from "@/lib/supabase-ratelimit"
import { createTelegramSignature } from "@/auth"

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
      const inCooldown = await otpGetCooldown(key, 30_000)
      if (inCooldown) {
        return NextResponse.json(
          { error: "Tunggu 30 detik sebelum minta kode lagi" },
          { status: 429 },
        )
      }

      // Generate and store code
      const verificationCode = generateCode()
      await otpSet(key, verificationCode, 5 * 60 * 1000)

      // Log code for development only (never log in production)
      if (process.env.NODE_ENV === 'development') {
        console.log(`[email-login] Verification code for ${normalizedEmail}: ${verificationCode}`)
      }

      // Send OTP email via Resend
      const { Resend } = await import("resend")
      const resend = new Resend(process.env.RESEND_API_KEY)

      const fromAddress = process.env.RESEND_FROM || "FinWise <noreply@finny.biz.id>"
      const { error: sendError } = await resend.emails.send({
        from: fromAddress,
        to: normalizedEmail,
        subject: "🔐 Kode Verifikasi FinWise",
        html: `<div style="font-family:system-ui,sans-serif;max-width:400px;margin:0 auto;padding:32px;text-align:center;background:#f5f8ee;border-radius:16px">
          <h2 style="color:#0e0f0c;margin:0 0 8px">FinWise</h2>
          <p style="color:#868685;font-size:14px;margin:0 0 24px">Kode verifikasi kamu:</p>
          <div style="font-size:36px;font-weight:900;letter-spacing:8px;color:#2ead4b;background:white;display:inline-block;padding:16px 32px;border-radius:16px;box-shadow:0 4px 12px rgba(0,0,0,0.06)">${verificationCode}</div>
          <p style="color:#868685;font-size:13px;margin:24px 0 0">Berlaku selama <b>5 menit</b>. Jangan bagikan kode ini ke siapa pun.</p>
        </div>`,
      })

      if (sendError) {
        console.error("[email-login] Resend error:", sendError)
        return NextResponse.json({ error: "Gagal mengirim email. Coba lagi." }, { status: 500 })
      }

      return NextResponse.json({ ok: true, message: "Kode terkirim ke email kamu" })
    }

    // ─── VERIFY CODE ───
    if (action === "verify") {
      if (!email || typeof email !== "string" || !code || typeof code !== "string") {
        return NextResponse.json({ error: "Email dan kode wajib diisi" }, { status: 400 })
      }

      const normalizedEmail = email.trim().toLowerCase()
      const key = `email:${normalizedEmail}`
      const stored = await otpGet(key)

      if (!stored) {
        return NextResponse.json(
          { error: "Kode tidak ditemukan. Minta kode baru." },
          { status: 400 },
        )
      }

      if (Date.now() > stored.expires_at) {
        await otpDelete(key)
        return NextResponse.json(
          { error: "Kode sudah kadaluarsa. Minta kode baru." },
          { status: 400 },
        )
      }

      const attempts = await otpIncrementAttempts(key)
      if (attempts > 5) {
        await otpDelete(key)
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
      await otpDelete(key)

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
