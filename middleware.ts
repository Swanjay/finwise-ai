import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Public routes — no auth needed
  const publicPaths = ['/login', '/api/auth', '/api/telegram-login', '/_next', '/logo.svg', '/favicon.ico']
  const isPublic = publicPaths.some(p => pathname.startsWith(p))
  if (isPublic) return NextResponse.next()

  // Check for guest flag cookie (set by client on guest login)
  const isGuest = req.cookies.get('fw-guest')?.value === 'true'

  // Check NextAuth session token
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  // Allow if guest OR authenticated
  if (isGuest || token) {
    return NextResponse.next()
  }

  // Not authenticated — redirect to login
  const loginUrl = new URL('/login', req.url)
  loginUrl.searchParams.set('callbackUrl', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.svg|login|api/auth|api/telegram-login).*)',
  ],
}
