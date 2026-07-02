import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Root landing page — public pages go through, but authenticated users still need invite
  const publicPageRoutes = ['/', '/about', '/privacy', '/terms']
  if (publicPageRoutes.includes(pathname)) {
    // For '/', check if user is authenticated AND needs invite
    if (pathname === '/') {
      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
      if (token) {
        // Authenticated user on root — check invite activation
        const activated = req.cookies.get('finwise-activated')?.value === 'true'
        if (!activated) {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
          const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
          if (supabaseUrl && supabaseKey) {
            const verifyUrl = new URL('/verify-invite', req.url)
            return NextResponse.redirect(verifyUrl)
          }
        }
      }
    }
    return NextResponse.next()
  }

  // Public routes — no auth needed
  const publicPaths = [
    '/login', '/verify-invite', '/admin', '/api/admin/codes-simple', '/api/admin/monitoring',
    '/api/auth', '/api/auth-telegram',
    '/auth/error', '/api/telegram-login', '/api/invite-codes/validate',
    '/_next', '/logo.svg', '/favicon.ico', '/mascot-', '/finwise-cat-',
    '/logo-', '/manifest.json', '/sw.js', '/workbox-',
    '/sitemap.xml', '/robots.txt', '/about', '/privacy', '/terms',
    '/pricing',  // Add pricing page to public routes
  ]
  const isPublic = publicPaths.some(p => pathname.startsWith(p))
  if (isPublic) return NextResponse.next()

  // API routes get 401 JSON instead of redirect
  if (pathname.startsWith('/api/')) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // For non-admin API routes, skip invite check (stateless)
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

  // Authenticated — check invite activation cookie
  const activated = req.cookies.get('finwise-activated')?.value === 'true'

  // Skip invite check if:
  // - Already activated (cookie set)
  // - No Supabase configured (env vars missing)
  // - Already on /verify-invite (would cause redirect loop)
  if (!activated && pathname !== '/verify-invite') {
    // Check if Supabase is configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (supabaseUrl && supabaseKey) {
      // Supabase is configured — require invite code
      const verifyUrl = new URL('/verify-invite', req.url)
      return NextResponse.redirect(verifyUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.svg|mascot-|finwise-cat-|login|verify-invite|api/auth|api/telegram-login|manifest\\.json|sw\\.js|workbox-|sitemap\\.xml|robots\\.txt|about|privacy|terms|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.ico$|.*\\.webp$).*)',
  ],
}
