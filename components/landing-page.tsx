'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import {
  Wallet,
  Camera,
  PieChart,
  Bell,
  Shield,
  Sparkles,
  Languages,
  Banknote,
  Smartphone,
  Moon,
  User,
  Plus,
  BarChart3,
  ArrowRight,
} from 'lucide-react'

// ─── FinWise Cat Component ───
function FinWiseCat({ size = 80 }: { size?: number }) {
  return (
    <img
      src="/mascot-cat-512.png?v=4"
      alt="FinWise Cat"
      width={size} height={Math.round(size * 472 / 414)}
      style={{ objectFit: 'contain' }}
    />
  )
}

const features = [
  {
    icon: Camera,
    title: 'Scan Struk AI',
    desc: 'Foto struk belanja, AI otomatis membaca dan mencatat transaksinya.',
    color: '#2ead4b',
  },
  {
    icon: PieChart,
    title: 'Laporan Visual',
    desc: 'Grafik dan chart interaktif untuk memahami pola pengeluaranmu.',
    color: '#9fe870',
  },
  {
    icon: Wallet,
    title: 'Multi Dompet',
    desc: 'Kelola beberapa dompet dan rekening dalam satu tempat.',
    color: '#2ead4b',
  },
  {
    icon: Bell,
    title: 'Pengingat Cerdas',
    desc: 'Notifikasi otomatis untuk tagihan, anggaran, dan target menabung.',
    color: '#9fe870',
  },
  {
    icon: Shield,
    title: 'Privasi Terjaga',
    desc: 'Data terenkripsi end-to-end. Tidak dijual ke pihak manapun.',
    color: '#2ead4b',
  },
  {
    icon: Sparkles,
    title: 'Insight AI',
    desc: 'Rekomendasi personal untuk hemat dan capai target keuangan.',
    color: '#9fe870',
  },
]

const howItWorks = [
  {
    step: '01',
    icon: User,
    title: 'Daftar & Login',
    desc: 'Masuk dengan Google, Telegram, atau email. Akun otomatis dibuat.',
  },
  {
    step: '02',
    icon: Plus,
    title: 'Catat Transaksi',
    desc: 'Input manual atau scan struk dengan AI. Selesai dalam hitungan detik.',
  },
  {
    step: '03',
    icon: BarChart3,
    title: 'Pantau & Analisis',
    desc: 'Lihat laporan visual, atur anggaran, dan capai target keuanganmu.',
  },
]

const trustItems = [
  { icon: Languages, label: 'Dukungan Bahasa Indonesia' },
  { icon: Banknote, label: 'Format Rupiah (Rp)' },
  { icon: Smartphone, label: 'Mobile-First Design' },
  { icon: Moon, label: 'Mode Gelap & Terang' },
]

export default function LandingPage() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(true)
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pt-20 pb-16 sm:pt-28 sm:pb-24">
        <div className="absolute inset-0 z-0" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(159,232,112,0.15) 0%, transparent 70%)' }} />
        <div className={`relative z-10 mx-auto max-w-3xl text-center transition-all duration-700 ${visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}>
          <div className="mx-auto mb-6">
            <FinWiseCat size={80} />
          </div>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl md:text-6xl" style={{ color: '#0e0f0c' }}>
            Catat Keuangan{' '}
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #2ead4b, #9fe870)' }}>
              Lebih Pintar
            </span>{' '}
            ✨
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            AI financial assistant untuk generasi muda Indonesia. Catat, analisis, dan capai target keuanganmu — semua dalam satu app.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-8 py-4 text-lg font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
              style={{ backgroundColor: '#2ead4b' }}
            >
              Mulai Gratis <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center rounded-2xl border border-border px-8 py-4 text-lg font-semibold text-foreground transition-all hover:bg-muted"
            >
              Sudah Punya Akun?
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {['100% Gratis', 'Tanpa Iklan', 'Data Terenkripsi'].map((item) => (
              <span key={item} className="rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground" style={{ borderColor: '#9fe870', backgroundColor: 'rgba(159,232,112,0.08)' }}>
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-black sm:text-3xl" style={{ color: '#0e0f0c' }}>
            Cara Kerja
          </h2>
          <p className="mt-2 text-center text-muted-foreground">Mulai dalam 3 langkah mudah</p>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {howItWorks.map((item) => (
              <div
                key={item.step}
                className="flex items-start gap-4 rounded-2xl border bg-card p-6 transition-all hover:shadow-lg"
                style={{ borderColor: 'rgba(159,232,112,0.3)' }}
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-black" style={{ backgroundColor: 'rgba(159,232,112,0.2)', color: '#2ead4b' }}>
                  {item.step}
                </div>
                <div>
                  <item.icon className="mb-2 h-5 w-5 text-primary" style={{ color: '#2ead4b' }} />
                  <h3 className="text-base font-bold" style={{ color: '#0e0f0c' }}>{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-16 sm:py-20" style={{ backgroundColor: '#f8faf5' }}>
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-black sm:text-3xl" style={{ color: '#0e0f0c' }}>
            Fitur Unggulan
          </h2>
          <p className="mt-2 text-center text-muted-foreground">Semua yang kamu butuhkan untuk kelola keuangan</p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-lg"
                style={{ borderTop: `2px solid ${f.color}` }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: `${f.color}18` }}>
                  <f.icon className="h-6 w-6" style={{ color: f.color }} />
                </div>
                <h3 className="mt-4 text-lg font-bold" style={{ color: '#0e0f0c' }}>{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-black sm:text-3xl" style={{ color: '#0e0f0c' }}>
            Dibuat Khusus untuk Indonesia
          </h2>
          <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {trustItems.map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-3 rounded-2xl border p-6 text-center transition-all hover:shadow-md" style={{ borderColor: 'rgba(159,232,112,0.3)' }}>
                <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(159,232,112,0.15)' }}>
                  <item.icon className="h-6 w-6" style={{ color: '#2ead4b' }} />
                </div>
                <span className="text-sm font-medium" style={{ color: '#0e0f0c' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16 sm:py-24" style={{ background: 'linear-gradient(135deg, #2ead4b, #9fe870)' }}>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-black text-white sm:text-4xl">
            Siap Lebih Pintar Kelola Uang?
          </h2>
          <p className="mt-3 text-lg text-white/85">
            Ribuan orang sudah pakai FinWise. Sekarang giliranmu.
          </p>
          <Link
            href="/register"
            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-lg font-bold shadow-lg transition-all hover:scale-105 hover:shadow-xl"
            style={{ color: '#2ead4b' }}
          >
            Daftar Sekarang <ArrowRight className="h-5 w-5" />
          </Link>
          <p className="mt-4 text-sm text-white/70">⭐ 4.9/5 rating dari pengguna</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-4 py-10" style={{ borderColor: 'rgba(159,232,112,0.3)' }}>
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2">
              <FinWiseCat size={20} />
              <span className="text-lg font-bold" style={{ color: '#0e0f0c' }}>FinWise</span>
            </div>
            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <Link href="/login" className="transition-colors hover:text-primary" style={{ '--tw-hover-color': '#2ead4b' } as React.CSSProperties}>Masuk</Link>
              <Link href="/register" className="transition-colors hover:text-primary" style={{ '--tw-hover-color': '#2ead4b' } as React.CSSProperties}>Daftar</Link>
              <Link href="/privacy" className="transition-colors hover:text-primary" style={{ '--tw-hover-color': '#2ead4b' } as React.CSSProperties}>Privasi</Link>
              <Link href="/terms" className="transition-colors hover:text-primary" style={{ '--tw-hover-color': '#2ead4b' } as React.CSSProperties}>Syarat</Link>
            </div>
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Made with ❤️ in Indonesia · © {new Date().getFullYear()} FinWise
          </p>
        </div>
      </footer>
    </div>
  )
}
