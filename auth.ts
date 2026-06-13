import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

export const authOptions: NextAuthOptions = {
  providers: [
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
