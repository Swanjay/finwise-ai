import { NextResponse } from "next/server"
import crypto from "crypto"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { id, first_name, last_name, username, photo_url, auth_date, hash } = body

    if (!id || !hash || !auth_date) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 })
    }

    // Check auth_date not expired (24h)
    const now = Math.floor(Date.now() / 1000)
    if (now - Number(auth_date) > 86400) {
      return NextResponse.json({ error: "Token expired" }, { status: 401 })
    }

    // Verify hash
    const botToken = process.env.TELEGRAM_BOT_TOKEN!
    const secretKey = crypto.createHash("sha256").update(botToken).digest()

    const dataCheckArr = Object.entries(body)
      .filter(([k]) => k !== "hash")
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("\n")

    const hmac = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckArr)
      .digest("hex")

    if (hmac !== hash) {
      return NextResponse.json({ error: "Signature tidak valid" }, { status: 403 })
    }

    // Return user data (frontend will use this to set session)
    return NextResponse.json({
      ok: true,
      user: {
        id: String(id),
        name: [first_name, last_name].filter(Boolean).join(" "),
        username: username || null,
        image: photo_url || null,
        provider: "telegram",
      },
    })
  } catch (err) {
    console.error("[telegram-login]", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
