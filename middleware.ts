export { auth as middleware } from "@/auth"

export const config = {
  matcher: [
    /*
     * Match all paths except:
     - /login (login page)
     - /api/auth (NextAuth routes)
     - /api/telegram-login (Telegram auth endpoint)
     - /_next (Next.js internals)
     - /logo.svg (static assets)
     */
    "/((?!login|api/auth|api/telegram-login|_next|logo\\.svg|favicon\\.ico).*)",
  ],
}
