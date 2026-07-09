/** @type {import('next').NextConfig} */
import { withSentryConfig } from "@sentry/nextjs";

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
        // Minimal static headers — CSP & security handled by middleware (nonce-based)
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
    ]
  },
}

// Sentry config — hide source maps in production, auto-upload for stack traces
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,

  // ─── PII Protection: scrub sensitive data from Sentry events ───
  beforeSend(event) {
    // Strip auth tokens, API keys, and cookies from error reports
    if (event.request?.headers) {
      delete event.request.headers['Authorization']
      delete event.request.headers['Cookie']
      delete event.request.headers['X-API-Key']
    }
    // Strip user identifiers from breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map(b => {
        if (b.data) {
          delete b.data.token
          delete b.data.password
          delete b.data.apiKey
          delete b.data.secret
          delete b.data.sessionToken
        }
        return b
      })
    }
    return event
  },
});
