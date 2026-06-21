import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/expenses', '/recurring', '/reports', '/score', '/admin', '/verify-invite'],
      },
    ],
    sitemap: 'https://finwise.my.id/sitemap.xml',
  }
}
