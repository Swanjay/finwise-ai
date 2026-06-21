import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import crypto from "crypto"
import bcrypt from "bcryptjs"
import { createClient } from "@supabase/supabase-js"

function createTelegramSignature(id: string, username: string): string {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error('NEXTAUTH_SECRET not configured')
  return crypto.createHmac('sha256', secret).update(`telegram:${id}:${username}`).digest('hex').slice(0, 16)
}

// Service role Supabase for auth lookups (server-side only)
function getAuthSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
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
    // Email + Password login [NEW]
    CredentialsProvider({
      id: "email-password",
      name: "Email & Password",
      credentials: {
        email: { type: "email", label: "Email" },
        password: { type: "password", label: "Password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const supabase = getAuthSupabase()
        if (!supabase) {
          console.error("[auth] Supabase not configured for email-password auth")
          return null
        }

        const email = credentials.email.trim().toLowerCase()
        const userId = `email:${email}`

        // Look up password hash from user_credentials table
        const { data: cred, error } = await supabase
          .from("user_credentials")
          .select("password_hash")
          .eq("user_id", userId)
          .single()

        if (error || !cred) return null

        // Verify password
        const valid = await bcrypt.compare(credentials.password, cred.password_hash)
        if (!valid) return null

        return {
          id: userId,
          name: email.split("@")[0],
          email,
          image: null,
        }
      },
    }),
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
