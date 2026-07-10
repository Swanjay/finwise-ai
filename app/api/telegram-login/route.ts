import { NextResponse } from "next/server"
import crypto from "crypto"
import { rateLimitMiddleware } from "@/lib/supabase-ratelimit"
import { otpSet, otpGet, otpIncrementAttempts, otpDelete } from "@/lib/supabase-ratelimit"
import { createTelegramSignature } from "@/auth"
import { telegramLoginSchema } from "@/lib/validate"

// Required Telegram channel to join before requesting OTP
const REQUIRED_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID!
const REQUIRED_CHANNEL_URL = process.env.TELEGRAM_CHANNEL_URL || "https://t.me/ainsyir"

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
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Request body tidak valid (bukan JSON)" }, { status: 400 })
    }

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
      const cleanUsername = username.replace("@", "").trim().toLowerCase()
      const loginCode = generateCode()
      const expires = Date.now() + 5 * 60 * 1000 // 5 min

      // Store code with attempt counter
      await otpSet(cleanUsername, loginCode, 5 * 60 * 1000)

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

      // Check if user is member of required channel
      const memberRes = await fetch(`https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${REQUIRED_CHANNEL_ID}&user_id=${chatId}`)
      const memberData = await memberRes.json()

      if (!memberData.ok || !["creator", "administrator", "member"].includes(memberData.result?.status)) {
        return NextResponse.json({
          error: "Kamu harus join channel Telegram dulu sebelum bisa login.",
          needJoin: true,
          channelUrl: REQUIRED_CHANNEL_URL,
        }, { status: 403 })
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
      const stored = await otpGet(cleanUsername)

      if (!stored) {
        return NextResponse.json({ error: "Kode tidak ditemukan" }, { status: 400 })
      }

      // Check attempts (max 5 tries per code)
      const attempts = await otpIncrementAttempts(cleanUsername)
      if (attempts >= 5) {
        await otpDelete(cleanUsername)
        return NextResponse.json({ error: "Terlalu banyak percobaan. Minta kode baru." }, { status: 429 })
      }

      if (Date.now() > stored.expires_at) {
        await otpDelete(cleanUsername)
        return NextResponse.json({ error: "Kode sudah expired" }, { status: 400 })
      }

      // Timing-safe comparison to prevent character-by-character brute force
      const codeA = Buffer.from(stored.code)
      const codeB = Buffer.from((code || '').padEnd(stored.code.length))
      if (codeA.length !== codeB.length || !crypto.timingSafeEqual(codeA, codeB)) {
        return NextResponse.json({ error: "Kode salah" }, { status: 400 })
      }

      // Success! Delete code
      await otpDelete(cleanUsername)

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
