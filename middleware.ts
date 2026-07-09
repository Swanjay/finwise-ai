import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Public pages
  const publicPageRoutes = ['/', '/about', '/privacy', '/terms']
  if (publicPageRoutes.includes(pathname)) {
    return NextResponse.next()
  }

  // Public routes — no auth needed
  const publicPaths = [
    '/login', '/admin', '/api/admin/codes-simple', '/api/admin/monitoring',
    '/api/auth', '/api/auth-telegram',
    '/auth/error', '/api/telegram-login', '/api/email-login', '/api/invite-codes/validate',
    '/api/voucher',
    '/_next', '/logo.svg', '/favicon.ico', '/mascot-', '/finwise-cat-',
    '/logo-', '/manifest.json', '/sw.js', '/workbox-',
    '/sitemap.xml', '/robots.txt', '/about', '/privacy', '/terms',
    '/pricing', '/finwise.apk',
  ]
  const isPublic = publicPaths.some(p => pathname.startsWith(p))
  if (isPublic) return NextResponse.next()

  // API routes get 401 JSON instead of redirect
  if (pathname.startsWith('/api/')) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.next()
  }

  // Page routes — check auth token
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  if (!token) {
    // Not authenticated — redirect to login
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Authenticated — allow access (no invite code check needed)
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.svg|mascot-|finwise-cat-|login|api/auth|api/telegram-login|api/email-login|manifest\\.json|sw\\.js|workbox-|sitemap\\.xml|robots\\.txt|about|privacy|terms|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.ico$|.*\\.webp$|.*\\.apk$).*)',
  ],
}
