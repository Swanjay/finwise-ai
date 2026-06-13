import { NextResponse } from "next/server"
import crypto from "crypto"

// In-memory code store (resets on cold start, fine for demo)
const codes = new Map<string, { code: string; expires: number; user?: Record<string, string> }>()

function generateCode() {
  return Math.random().toString().slice(2, 8) // 6 digit
}

// POST /api/telegram-login
// action: "request" → send code to user via bot
// action: "verify" → verify code
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { action, username, code } = body as { action: string; username?: string; code?: string }

    const botToken = process.env.TELEGRAM_BOT_TOKEN!
    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "KiyAii_bot"

    if (action === "request") {
      if (!username) {
        return NextResponse.json({ error: "Username diperlukan" }, { status: 400 })
      }

      // Clean username
      const cleanUsername = username.replace("@", "").trim()
      const loginCode = generateCode()
      const expires = Date.now() + 5 * 60 * 1000 // 5 min

      // Store code
      codes.set(cleanUsername.toLowerCase(), { code: loginCode, expires })

      // Try to send code via bot
      // First, we need to find the chat ID - for now we'll use getUpdates
      // The user needs to have started the bot
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

      return NextResponse.json({ ok: true, message: "Kode dikirim ke Telegram kamu" })
    }

    if (action === "verify") {
      if (!username || !code) {
        return NextResponse.json({ error: "Username dan kode diperlukan" }, { status: 400 })
      }

      const cleanUsername = username.replace("@", "").trim().toLowerCase()
      const stored = codes.get(cleanUsername)

      if (!stored) {
        return NextResponse.json({ error: "Kode tidak ditemukan" }, { status: 400 })
      }

      if (Date.now() > stored.expires) {
        codes.delete(cleanUsername)
        return NextResponse.json({ error: "Kode sudah expired" }, { status: 400 })
      }

      if (stored.code !== code) {
        return NextResponse.json({ error: "Kode salah" }, { status: 400 })
      }

      // Success! Delete code
      codes.delete(cleanUsername)

      return NextResponse.json({
        ok: true,
        user: {
          id: `tg_${cleanUsername}`,
          name: `@${cleanUsername}`,
          username: cleanUsername,
          provider: "telegram",
        },
      })
    }

    return NextResponse.json({ error: "Action tidak valid" }, { status: 400 })
  } catch (err) {
    console.error("[telegram-login]", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
