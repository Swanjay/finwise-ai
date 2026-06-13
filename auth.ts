import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      id: "telegram",
      name: "Telegram",
      credentials: {
        id: { type: "text" },
        name: { type: "text" },
        username: { type: "text" },
        photo_url: { type: "text" },
        auth_date: { type: "text" },
        hash: { type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.id || !credentials?.hash) return null

        // Verify Telegram auth data server-side
        const crypto = await import("crypto")
        const botToken = process.env.TELEGRAM_BOT_TOKEN!
        const secretKey = crypto.createHash("sha256").update(botToken).digest()

        const { hash, ...rest } = credentials as Record<string, string>
        const dataCheckArr = Object.entries(rest)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => `${k}=${v}`)
          .join("\n")

        const hmac = crypto
          .createHmac("sha256", secretKey)
          .update(dataCheckArr)
          .digest("hex")

        if (hmac !== hash) return null

        // Check expiry (24h)
        const now = Math.floor(Date.now() / 1000)
        if (now - Number(credentials.auth_date) > 86400) return null

        return {
          id: `tg_${credentials.id}`,
          name: credentials.name || `Telegram User`,
          image: credentials.photo_url || null,
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized: async ({ auth }) => {
      return !!auth
    },
  },
})
