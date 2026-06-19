import { NextResponse } from "next/server"
import crypto from "crypto"
import { encode } from "next-auth/jwt"
import { createTelegramSignature } from "@/auth"

// Custom Telegram auth callback that bypasses NextAuth's redirect flow
// This works around Cloudflare blocking form POST to /api/auth/callback/telegram

const AUTH_SECRET = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || ""

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { id, name, username, sig } = body

    if (!id || !name || !username || !sig) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 })
    }

    // Verify HMAC signature — must match createTelegramSignature() from auth.ts
    const expected = createTelegramSignature(id, username)

    if (sig !== expected) {
      console.error("[auth/telegram] Sig mismatch", { id, username, sig, expected })
      return NextResponse.json({ error: "Signature tidak valid" }, { status: 401 })
    }

    // Create NextAuth-compatible JWT token
    const token = await encode({
      token: {
        sub: id,
        name: name,
        username: username,
        telegramId: id,
        telegramUsername: username,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        jti: crypto.randomUUID(),
      },
      secret: AUTH_SECRET,
    })

    // Set session cookie directly (same name as NextAuth)
    const isProduction = process.env.NODE_ENV === "production"
    const cookieName = isProduction ? "__Secure-next-auth.session-token" : "next-auth.session-token"
    const cookieParts = [
      `${cookieName}=${token}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      `Max-Age=${30 * 24 * 60 * 60}`,
    ]
    if (isProduction) cookieParts.push("Secure")

    const response = NextResponse.json({ ok: true })
    response.headers.set("Set-Cookie", cookieParts.join("; "))
    return response
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
