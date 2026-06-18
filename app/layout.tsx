import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Poppins, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { OfflineBanner } from '@/components/ui/offline-banner'
import { ServiceWorkerRegistration } from '@/components/ui/sw-registration'

const poppins = Poppins({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'FinWise — Catat Keuangan Lebih Pintar',
  description:
    'Aplikasi keuangan pribadi berbasis AI. Catat pemasukan & pengeluaran, scan struk otomatis, atur anggaran, dan dapatkan saran hemat. Bahasa Indonesia.',
  generator: 'v0.app',
  icons: {
    icon: '/favicon-32.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#F5F3FF',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${poppins.variable} ${geistMono.variable}`}
    >
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
