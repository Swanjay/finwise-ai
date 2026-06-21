import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import crypto from "crypto"

function createTelegramSignature(id: string, username: string): string {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error('NEXTAUTH_SECRET not configured')
  return crypto.createHmac('sha256', secret).update(`telegram:${id}:${username}`).digest('hex').slice(0, 16)
}

export const authOptions: NextAuthOptions = {
  providers: [
    // Google OAuth — only enabled if credentials are set
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    // Email OTP login
    CredentialsProvider({
      id: "email",
      name: "Email",
      credentials: {
        id: { type: "text" },
        name: { type: "text" },
        email: { type: "text" },
        sig: { type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.id || !credentials?.email || !credentials?.sig) return null

        // Verify HMAC signature — same pattern as Telegram
        const expectedSig = createTelegramSignature(credentials.id, credentials.email)
        if (credentials.sig !== expectedSig) return null

        return {
          id: credentials.id,
          name: credentials.name || credentials.email.split("@")[0],
          image: null,
        }
      },
    }),
    // Telegram login
    CredentialsProvider({
      id: "telegram",
      name: "Telegram",
      credentials: {
        id: { type: "text" },
        name: { type: "text" },
        username: { type: "text" },
        sig: { type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.id || !credentials?.username || !credentials?.sig) return null

        // Verify HMAC signature — prevents client-side forgery
        const expectedSig = createTelegramSignature(credentials.id, credentials.username)
        if (credentials.sig !== expectedSig) return null

        return {
          id: credentials.id,
          name: credentials.name || `@${credentials.username}`,
          image: null,
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  callbacks: {
    async session({ session, token }) {
      if (token.sub) {
        (session.user as Record<string, unknown>).id = token.sub
      }
      return session
    },
  },
}

// Export for use in telegram-login route
export { createTelegramSignature }
