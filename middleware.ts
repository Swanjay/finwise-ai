import { withAuth } from "next-auth/middleware"

// Only protect Telegram-logged-in users.
// Guest users bypass auth via localStorage flag (client-side).
export default withAuth({
  pages: {
    signIn: "/login",
  },
})

export const config = {
  matcher: [
    // Don't protect any routes - let client handle guest vs logged-in
    // This middleware is only a fallback for Telegram auth
    "/__never_match__",
  ],
}
