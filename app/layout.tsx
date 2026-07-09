import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, Geist_Mono } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { Providers } from './providers'
import { OfflineBanner } from '@/components/ui/offline-banner'
import { ServiceWorkerRegistration } from '@/components/ui/sw-registration'

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'FinWise — Catat Keuangan Lebih Pintar',
  description:
    'Aplikasi keuangan pribadi berbasis AI. Catat pemasukan & pengeluaran, scan struk otomatis, atur anggaran, dan dapatkan saran hemat. Bahasa Indonesia.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://finwise.my.id'),
  openGraph: {
    title: 'FinWise — Catat Keuangan Lebih Pintar',
    description: 'Aplikasi keuangan pribadi berbasis AI. Catat pemasukan & pengeluaran, scan struk otomatis, atur anggaran.',
    siteName: 'FinWise',
    images: [
      {
        url: '/mascot-512.webp?v=4',
        width: 512,
        height: 512,
        alt: 'FinWise Cat Mascot',
      },
    ],
    locale: 'id_ID',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FinWise — Catat Keuangan Lebih Pintar',
    description: 'Aplikasi keuangan pribadi berbasis AI.',
    images: ['/mascot-512.webp?v=4'],
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon-32.png',
    apple: '/mascot-cat-192.png?v=4',
  },
  alternates: {
    canonical: './',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#ECFDF5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

// Theme color map — must be kept in sync with lib/themes.ts
const THEME_MAP: Record<string, { dark: Record<string, string>; light: Record<string, string> }> = {
  wise: {
    dark: { bg: '#111110', card: '#1a1a18', surface2: '#242420', primary: '#9fe870', pl: '#cdffad', greeting: '#1a2e12', border: 'rgba(159, 232, 112, 0.15)', mutedFg: '#707070' },
    light: { bg: '#FFFFFF', card: '#FFFFFF', surface2: '#e8ebe6', primary: '#2ead4b', pl: '#9fe870', greeting: '#e2f6d5', border: 'rgba(0, 0, 0, 0.08)', mutedFg: '#868685' },
  },
  purple: {
    dark: { bg: '#1a1625', card: '#231e30', surface2: '#2a2438', primary: '#9b7fd4', pl: '#c4a0e8', greeting: '#3a2d5a', border: 'rgba(155, 127, 212, 0.15)', mutedFg: '#9b8ab8' },
    light: { bg: '#F5F3FF', card: '#FFFFFF', surface2: '#EDE9FF', primary: '#8A6ECF', pl: '#D0BFF5', greeting: '#EDE9FF', border: 'rgba(138, 110, 207, 0.15)', mutedFg: '#7C7A8A' },
  },
  emerald: {
    dark: { bg: '#0a1f15', card: '#122a1f', surface2: '#1a3528', primary: '#059669', pl: '#34d399', greeting: '#064e3b', border: 'rgba(52, 211, 153, 0.15)', mutedFg: '#5eead4' },
    light: { bg: '#ECFDF5', card: '#FFFFFF', surface2: '#D1FAE5', primary: '#059669', pl: '#A7F3D0', greeting: '#D1FAE5', border: 'rgba(5, 150, 105, 0.15)', mutedFg: '#6B7280' },
  },
  blue: {
    dark: { bg: '#0c1929', card: '#142740', surface2: '#1a3252', primary: '#2563eb', pl: '#60a5fa', greeting: '#172554', border: 'rgba(96, 165, 250, 0.15)', mutedFg: '#93c5fd' },
    light: { bg: '#EFF6FF', card: '#FFFFFF', surface2: '#DBEAFE', primary: '#2563eb', pl: '#93C5FD', greeting: '#DBEAFE', border: 'rgba(37, 99, 235, 0.15)', mutedFg: '#6B7280' },
  },
  slate: {
    dark: { bg: '#0f172a', card: '#1e293b', surface2: '#334155', primary: '#64748b', pl: '#94a3b8', greeting: '#1e293b', border: 'rgba(148, 163, 184, 0.15)', mutedFg: '#94a3b8' },
    light: { bg: '#F8FAFC', card: '#FFFFFF', surface2: '#E2E8F0', primary: '#475569', pl: '#94A3B8', greeting: '#E2E8F0', border: 'rgba(71, 85, 105, 0.15)', mutedFg: '#6B7280' },
  },
  amber: {
    dark: { bg: '#1a120a', card: '#2a2015', surface2: '#352a1c', primary: '#d97706', pl: '#fbbf24', greeting: '#451a03', border: 'rgba(251, 191, 36, 0.15)', mutedFg: '#fcd34d' },
    light: { bg: '#FFFBEB', card: '#FFFFFF', surface2: '#FEF3C7', primary: '#d97706', pl: '#FCD34D', greeting: '#FEF3C7', border: 'rgba(217, 119, 6, 0.15)', mutedFg: '#6B7280' },
  },
}

// This script runs BEFORE React hydration — applies theme instantly on load
const themeScript = `
(function(){
  try {
    var id = localStorage.getItem('fw.colorTheme.v1') || 'wise';
    var dark = document.documentElement.classList.contains('dark');
    var m = ${JSON.stringify(THEME_MAP)};
    var t = m[id] || m.emerald;
    var p = dark ? t.dark : t.light;
    var r = document.documentElement;
    r.style.setProperty('--background', p.bg);
    r.style.setProperty('--card', p.card);
    r.style.setProperty('--popover', p.card);
    r.style.setProperty('--surface-2', p.surface2);
    r.style.setProperty('--primary', p.primary);
    r.style.setProperty('--accent', p.pl);
    r.style.setProperty('--muted', p.surface2);
    r.style.setProperty('--muted-foreground', p.mutedFg);
    r.style.setProperty('--border', p.border);
    r.style.setProperty('--input', p.border);
    r.style.setProperty('--ring', p.primary);
    r.style.setProperty('--sidebar', p.card);
    r.style.setProperty('--sidebar-primary', p.primary);
    r.style.setProperty('--sidebar-accent', p.surface2);
    r.style.setProperty('--sidebar-border', p.border);
    r.style.setProperty('--sidebar-ring', p.primary);
    r.style.setProperty('--greeting-bg', p.greeting);
    r.style.setProperty('--color-clay-purple', p.pl);
    r.style.setProperty('--color-clay-purple-deep', p.primary);
    r.style.setProperty('--clay-card-dark', p.card);
    r.style.setProperty('--clay-greeting-dark', p.greeting);
    r.style.setProperty('--clay-nav-dark', p.card);
    r.style.setProperty('--card-border', p.border);
    var h = p.primary.replace('#','');
    var rr = parseInt(h.substring(0,2),16);
    var gg = parseInt(h.substring(2,4),16);
    var bb = parseInt(h.substring(4,6),16);
    r.style.setProperty('--theme-shadow', 'rgba('+rr+','+gg+','+bb+',0.15)');
    r.style.setProperty('--theme-shadow-strong', 'rgba('+rr+','+gg+','+bb+',0.3)');
  } catch(e) {}
})();
`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${inter.variable} ${geistMono.variable}`}
    >
      <head>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
      </head>
      <body className="bg-background font-sans antialiased">
        <OfflineBanner />
        <ServiceWorkerRegistration />
        <Providers>
          {children}
        </Providers>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
