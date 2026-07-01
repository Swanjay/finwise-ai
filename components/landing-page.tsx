'use client'

import Link from 'next/link'
import Image from 'next/image'
import {
  Camera, BarChart3, PiggyBank, ReceiptText, ShieldCheck,
  Sparkles, Moon, Sun, ArrowRight, ChevronRight,
} from 'lucide-react'
import { useEffect, useState } from 'react'

const FEATURES = [
  {
    icon: Sparkles,
    title: 'AI Scan Struk',
    desc: 'Foto struk belanja, otomatis tercatat. Gak perlu input manual lagi.',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    icon: BarChart3,
    title: 'Laporan Visual',
    desc: 'Grafik pengeluaran per kategori. Tahu uang habis ke mana.',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    icon: PiggyBank,
    title: 'Anggaran Cerdas',
    desc: 'Batas budget per kategori. Dapat notifikasi kalau hampir over.',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: ReceiptText,
    title: 'Transaksi Rutin',
    desc: 'Bayar tagihan bulanan otomatis tercatat. Gak ada yang terlewat.',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
  {
    icon: ShieldCheck,
    title: 'Privasi Utama',
    desc: 'Akunmu terlindungi, data terenkripsi. Hanya kamu yang bisa akses.',
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
  },
  {
    icon: Camera,
    title: 'Multi Wallet',
    desc: 'Tunai, e-wallet, rekening bank — semua terpantau dalam satu tempat.',
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
  },
]

const TRUST_ITEMS = [
  { emoji: '🇮🇩', label: 'Bahasa Indonesia' },
  { emoji: '💸', label: 'Format Rupiah (IDR)' },
  { emoji: '📱', label: 'Install sebagai App (PWA)' },
  { emoji: '🌙', label: 'Mode Gelap & 5 Tema' },
]

export default function LandingPage() {
  const [darkMode, setDarkMode] = useState(true)

  useEffect(() => {
    setDarkMode(document.documentElement.classList.contains('dark'))
  }, [])

  function toggleDark() {
    const root = document.documentElement
    const isDark = !root.classList.contains('dark')
    root.classList.toggle('dark', isDark)
    setDarkMode(isDark)
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* ─── Top bar ─── */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Image src="/mascot-64.png?v=2" alt="FinWise" width={28} height={28} className="drop-shadow-sm" />
            <span className="text-base font-bold tracking-tight">
              <span className="text-primary">Fin</span>Wise
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleDark}
              className="rounded-lg p-2 text-muted-foreground hover:text-foreground transition"
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <Link
              href="/login"
              className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90 transition"
            >
              Masuk
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="px-4 pt-12 pb-10 text-center">
        <div className="mx-auto max-w-lg">
          <div className="mx-auto mb-6 w-fit">
            <Image src="/mascot-128.png?v=2" alt="FinWise Mascot" width={96} height={96} className="drop-shadow-lg" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Catat Keuangan
            <br />
            <span className="text-primary">Lebih Pintar</span> ✨
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-base text-muted-foreground leading-relaxed">
            Scan struk otomatis dengan AI, pantau pengeluaran, atur anggaran — semua dalam Bahasa Indonesia.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all active:scale-[0.98]"
            >
              Mulai Sekarang
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/about"
              className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition"
            >
              Pelajari lebih lanjut <ChevronRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Trust indicators ─── */}
      <section className="px-4 pb-10">
        <div className="mx-auto flex max-w-lg flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {TRUST_ITEMS.map((item) => (
            <span key={item.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="text-base">{item.emoji}</span>
              {item.label}
            </span>
          ))}
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="px-4 pb-12">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-8 text-center text-xl font-bold tracking-tight sm:text-2xl">
            Fitur yang bikin hidup lebih mudah
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-border/60 bg-card p-5 transition-all hover:shadow-md hover:border-border"
              >
                <div className={`mb-3 flex size-10 items-center justify-center rounded-xl ${f.bg}`}>
                  <f.icon className={`size-5 ${f.color}`} />
                </div>
                <h3 className="mb-1 text-sm font-bold">{f.title}</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="px-4 pb-12">
        <div className="mx-auto max-w-lg rounded-2xl border border-border/40 bg-card p-8 text-center">
          <h2 className="mb-3 text-lg font-bold tracking-tight">
            Mulai catat keuangannya sekarang 🚀
          </h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Gratis. Gak perlu kartu kredit. Akun dibuat otomatis saat pertama login.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all active:scale-[0.98]"
          >
            Daftar Sekarang
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border/40 bg-background px-4 py-6">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
            <Link href="/about" className="hover:text-foreground transition">Tentang</Link>
            <Link href="/privacy" className="hover:text-foreground transition">Privasi</Link>
            <Link href="/terms" className="hover:text-foreground transition">Syarat & Ketentuan</Link>
            <a href="https://t.me/ainsyir" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition">
              Bantuan 💬
            </a>
          </div>
          <p className="mt-3 text-center text-[10px] text-muted-foreground/50">
            © {new Date().getFullYear()} FinWise. Dibuat dengan ❤️ di Indonesia.
          </p>
        </div>
      </footer>
    </div>
  )
}
