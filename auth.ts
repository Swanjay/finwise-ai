import type { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"

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

        // Custom flow: verified by /api/telegram-login
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
