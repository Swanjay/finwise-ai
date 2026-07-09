import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// ─── Config ───
const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nzhzenacejxeyajoaftv.supabase.co'
const supabaseWs = supabaseOrigin.replace('https://', 'wss://')
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://finwise.my.id'

// ─── Nonce-based CSP (compatible with Edge Runtime) ───
function generateNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function buildCSP(nonce: string): string {
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://va.vercel-scripts.com https://vitals.vercel-insights.com`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https://*.googleusercontent.com https://*.supabase.co`,
    `font-src 'self' data:`,
    `connect-src 'self' https://api.telegram.org ${appUrl} https://vitals.vercel-insights.com ${supabaseOrigin} ${supabaseWs} https://*.ingest.sentry.io https://*.langfuse.com https://cloud.langfuse.com`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
    `upgrade-insecure-requests`,
  ].join('; ')
}

// ─── Security Headers (defined BEFORE middleware for Edge Runtime) ───
function applySecurityHeaders(res: NextResponse, nonce: string, csp: string, pathname: string) {
  res.headers.set('Content-Security-Policy', csp)
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-XSS-Protection', '1; mode=block')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  res.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  res.headers.set('Cross-Origin-Resource-Policy', 'same-origin')

  // Camera Permission: global=NONE, scan page ONLY
  if (pathname === '/scan' || pathname.startsWith('/scan/')) {
    res.headers.set('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=(), payment=()')
  } else {
    res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')
  }

  // Nonce passthrough for <script> tags
  res.headers.set('X-Nonce', nonce)

  // Strip internal Vercel headers (info leak)
  res.headers.delete('x-vercel-id')
  res.headers.delete('x-vercel-cache')
  res.headers.delete('x-matched-path')
  res.headers.delete('x-nextjs-cache')
  res.headers.delete('x-nextjs-prerender')
  res.headers.delete('x-nextjs-rewritten-path')

  // CORS — restrict to own origin
  res.headers.set('Access-Control-Allow-Origin', appUrl)
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.headers.set('Access-Control-Max-Age', '86400')
  res.headers.set('Access-Control-Allow-Credentials', 'true')
}

// ─── Public paths ───
const PUBLIC_ROUTES = ['/', '/about', '/privacy', '/terms']
const PUBLIC_PREFIXES = [
  '/login', '/admin', '/api/admin/codes-simple', '/api/admin/monitoring',
  '/api/auth', '/api/auth-telegram',
  '/auth/error', '/api/telegram-login', '/api/email-login', '/api/invite-codes/validate',
  '/api/voucher',
  '/_next', '/logo.svg', '/favicon.ico', '/mascot-', '/finwise-cat-',
  '/logo-', '/manifest.json', '/sw.js', '/workbox-',
  '/sitemap.xml', '/robots.txt', '/about', '/privacy', '/terms',
  '/pricing', '/finwise.apk',
]

// ─── Middleware ───
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const nonce = generateNonce()
  const csp = buildCSP(nonce)

  // Public pages
  if (PUBLIC_ROUTES.includes(pathname)) {
    const res = NextResponse.next()
    applySecurityHeaders(res, nonce, csp, pathname)
    return res
  }

  // Public routes
  const isPublic = PUBLIC_PREFIXES.some(p => pathname.startsWith(p))
  if (isPublic) {
    const res = NextResponse.next()
    applySecurityHeaders(res, nonce, csp, pathname)
    return res
  }

  // API routes
  if (pathname.startsWith('/api/')) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) {
      const res = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      applySecurityHeaders(res, nonce, csp, pathname)
      return res
    }
    const res = NextResponse.next()
    applySecurityHeaders(res, nonce, csp, pathname)
    return res
  }

  // Page routes — auth check
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    const res = NextResponse.redirect(loginUrl)
    applySecurityHeaders(res, nonce, csp, pathname)
    return res
  }

  const res = NextResponse.next()
  applySecurityHeaders(res, nonce, csp, pathname)
  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.svg|mascot-|finwise-cat-|login|api/auth|api/telegram-login|api/email-login|manifest\\.json|sw\\.js|workbox-|sitemap\\.xml|robots\\.txt|about|privacy|terms|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.ico$|.*\\.webp$|.*\\.apk$).*)',
  ],
}
