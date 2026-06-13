import type { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) return null
  // Lazy import to avoid build-time errors
  const { createClient } = require('@supabase/supabase-js')
  return createClient(supabaseUrl, supabaseServiceKey)
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      id: "telegram",
      name: "Telegram",
      credentials: {
        id: { type: "text" },
        name: { type: "text" },
        username: { type: "text" },
        hash: { type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.id) return null

        if (credentials.hash === "custom_flow") {
          return {
            id: credentials.id,
            name: credentials.name || `@${credentials.username}`,
            image: null,
          }
        }

        return null
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  callbacks: {
    async session({ session, token }) {
      if (token.sub) {
        (session.user as Record<string, unknown>).id = token.sub
      }
      return session
    },
  },
}
