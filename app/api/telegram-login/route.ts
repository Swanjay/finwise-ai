import { NextResponse } from "next/server"
import crypto from "crypto"
import { rateLimitMiddleware, getClientIp } from "@/lib/rate-limit-kv"
import { createTelegramSignature } from "@/auth"
import { telegramLoginSchema } from "@/lib/validate"

// In-memory code store (resets on cold start, fine for demo)
const codes = new Map<string, { code: string; expires: number; attempts: number; user?: Record<string, string> }>()

function generateCode(): string {
  // Cryptographically secure 6-digit code
  return crypto.randomInt(100000, 999999).toString()
}

// POST /api/telegram-login
export async function POST(req: Request) {
  try {
    // Rate limit: 5 requests per minute per IP
    const rateLimitResponse = await rateLimitMiddleware(req, { windowMs: 60_000, max: 5 })
    if (rateLimitResponse) return rateLimitResponse

    const body = await req.json()

    // Validate input with Zod
    const parsed = telegramLoginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Input tidak valid" }, { status: 400 })
    }

    const { action } = parsed.data
    const botToken = process.env.TELEGRAM_BOT_TOKEN!
    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "KiyAii_bot"

    if (action === "request") {
      const { username } = parsed.data

      // Clean username
      const cleanUsername = username.replace("@", "").trim()
      const loginCode = generateCode()
      const expires = Date.now() + 5 * 60 * 1000 // 5 min

      // Store code with attempt counter
      codes.set(cleanUsername.toLowerCase(), { code: loginCode, expires, attempts: 0 })

      // Try to send code via bot
      const updatesRes = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?limit=100`)
      const updatesData = await updatesRes.json()

      if (!updatesData.ok) {
        return NextResponse.json({ error: "Bot error" }, { status: 500 })
      }

      // Find user's chat ID from updates
      let chatId: string | null = null
      for (const update of updatesData.result || []) {
        const msg = update.message || update.my_chat_member
        if (msg?.chat?.username?.toLowerCase() === cleanUsername.toLowerCase()) {
          chatId = String(msg.chat.id)
          break
        }
      }

      if (!chatId) {
        return NextResponse.json({
          error: "Bot belum ditemukan. Silakan /start dulu ke bot.",
          needStart: true,
          botUrl: `https://t.me/${botUsername}?start=finwise`,
        }, { status: 404 })
      }

      // Send code via bot
      const sendRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: `🔐 Kode login FinWise kamu:\n\n<b>${loginCode}</b>\n\nBerlaku 5 menit. Jangan bagikan kode ini!`,
          parse_mode: "HTML",
        }),
      })
      const sendData = await sendRes.json()

      if (!sendData.ok) {
        return NextResponse.json({ error: "Gagal mengirim kode" }, { status: 500 })
      }

      return NextResponse.json(
        { ok: true, message: "Kode dikirim ke Telegram kamu" }
      )
    }

    if (action === "verify") {
      const { username, code } = parsed.data

      const cleanUsername = username.replace("@", "").trim().toLowerCase()
      const stored = codes.get(cleanUsername)

      if (!stored) {
        return NextResponse.json({ error: "Kode tidak ditemukan" }, { status: 400 })
      }

      // Check attempts (max 5 tries per code)
      if (stored.attempts >= 5) {
        codes.delete(cleanUsername)
        return NextResponse.json({ error: "Terlalu banyak percobaan. Minta kode baru." }, { status: 429 })
      }

      stored.attempts++

      if (Date.now() > stored.expires) {
        codes.delete(cleanUsername)
        return NextResponse.json({ error: "Kode sudah expired" }, { status: 400 })
      }

      if (stored.code !== code) {
        return NextResponse.json({ error: "Kode salah" }, { status: 400 })
      }

      // Success! Delete code
      codes.delete(cleanUsername)

      // Generate HMAC signature for the user
      const userId = `tg_${cleanUsername}`
      const sig = createTelegramSignature(userId, cleanUsername)

      return NextResponse.json({
        ok: true,
        user: {
          id: userId,
          name: `@${cleanUsername}`,
          username: cleanUsername,
          sig, // HMAC signature — client must send this to NextAuth
        },
      })
    }

    return NextResponse.json({ error: "Action tidak valid" }, { status: 400 })
  } catch (err) {
    console.error("[telegram-login]", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
