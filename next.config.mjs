/** @type {import('next').NextConfig} */

// Narrow CSP: replace wildcards with specific domains where possible
// TODO: Replace NEXT_PUBLIC_SUPABASE_URL with your actual Supabase project URL to remove *.supabase.co wildcard
const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://*.supabase.co'
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://finwise.my.id'

const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=(), payment=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com https://vitals.vercel-insights.com",
              "style-src 'self' 'unsafe-inline'",
              // Images: same-origin only (mascot images are in /public). Removed *.vercel.app — not needed.
              "img-src 'self' data: blob: https://*.googleusercontent.com",
              "font-src 'self' data:",
              // Connect: removed finwise-ai-teal.vercel.app (not needed for API calls).
              // Supabase URL comes from env var; falls back to wildcard if not set.
              `connect-src 'self' https://api.telegram.org ${appUrl} https://vitals.vercel-insights.com ${supabaseOrigin} wss://${supabaseOrigin.replace('https://', '')}`,
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
      {
        // CORS for API routes — restrict to own origin
        source: '/api/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: appUrl,
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
          {
            key: 'Access-Control-Max-Age',
            value: '86400',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
        ],
      },
    ]
  },
}

export default nextConfig
