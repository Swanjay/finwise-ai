import { withAuth } from "next-auth/middleware"

export default withAuth({
  pages: {
    signIn: "/login",
  },
})

export const config = {
  matcher: [
    "/((?!login|api/auth|api/telegram-login|_next|logo\\.svg|favicon\\.ico).*)",
  ],
}
