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

function FinWiseCat({ size = 80 }: { size?: number }) {
  return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" width={size} height={size}>
      <defs>
        <radialGradient id="lp-headGrad" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#fefefe"/>
          <stop offset="85%" stopColor="#f5f5f2"/>
          <stop offset="100%" stopColor="#e8e8e4"/>
        </radialGradient>
        <radialGradient id="lp-bodyGrad" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#b8f07a"/>
          <stop offset="50%" stopColor="#9fe870"/>
          <stop offset="100%" stopColor="#7acc52"/>
        </radialGradient>
        <radialGradient id="lp-bodyInnerGrad" cx="50%" cy="30%" r="55%">
          <stop offset="0%" stopColor="#ddffc0"/>
          <stop offset="100%" stopColor="#b8f07a"/>
        </radialGradient>
        <radialGradient id="lp-earGradL" cx="40%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#b8f07a"/>
          <stop offset="100%" stopColor="#7acc52"/>
        </radialGradient>
        <radialGradient id="lp-earGradR" cx="60%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#b8f07a"/>
          <stop offset="100%" stopColor="#7acc52"/>
        </radialGradient>
        <radialGradient id="lp-earInnerGrad" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#f0fce0"/>
          <stop offset="100%" stopColor="#d4f5b0"/>
        </radialGradient>
        <radialGradient id="lp-cheekGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFD0DC" stopOpacity="0.7"/>
          <stop offset="100%" stopColor="#FFB8C8" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="lp-pawPadGrad" cx="50%" cy="30%" r="55%">
          <stop offset="0%" stopColor="#FFCDD8"/>
          <stop offset="100%" stopColor="#F0A0B5"/>
        </radialGradient>
        <radialGradient id="lp-eyeShine" cx="35%" cy="30%" r="50%">
          <stop offset="0%" stopColor="#3a3a3a"/>
          <stop offset="100%" stopColor="#0e0f0c"/>
        </radialGradient>
        <radialGradient id="lp-noseGrad" cx="50%" cy="30%" r="55%">
          <stop offset="0%" stopColor="#F5B0C0"/>
          <stop offset="100%" stopColor="#E8A0B0"/>
        </radialGradient>
        <radialGradient id="lp-tailGrad" cx="30%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#b8f07a"/>
          <stop offset="100%" stopColor="#8ad45a"/>
        </radialGradient>
        <filter id="lp-softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
          <feOffset dy="2"/>
          <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1"/>
          <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.12 0"/>
          <feBlend in="SourceGraphic"/>
        </filter>
      </defs>

      <ellipse cx="100" cy="175" rx="55" ry="8" fill="#0e0f0c" opacity="0.06"/>

      <path d="M140 135 C155 128, 165 115, 158 102 C152 92, 142 98, 145 108 C147 115, 148 125, 138 132"
            fill="url(#lp-tailGrad)" stroke="#8ad45a" strokeWidth="0.5" opacity="0.9"/>
      <path d="M158 102 C156 98, 150 95, 148 100" fill="#f8faf5" stroke="none" opacity="0.6"/>

      <ellipse cx="100" cy="145" rx="50" ry="38" fill="url(#lp-bodyGrad)"/>
      <ellipse cx="100" cy="138" rx="36" ry="28" fill="url(#lp-bodyInnerGrad)"/>
      <ellipse cx="100" cy="148" rx="28" ry="20" fill="#ddffc0" opacity="0.6"/>

      <path d="M72 120 Q100 132, 128 120" stroke="#7acc52" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M76 122 Q100 133, 124 122" stroke="#b8f07a" strokeWidth="1" fill="none" opacity="0.5"/>

      <ellipse cx="68" cy="168" rx="16" ry="11" fill="url(#lp-headGrad)" stroke="#e0e0dc" strokeWidth="0.5"/>
      <ellipse cx="63" cy="172" rx="4" ry="3" fill="url(#lp-pawPadGrad)"/>
      <ellipse cx="72" cy="173" rx="3" ry="2.5" fill="url(#lp-pawPadGrad)"/>
      <circle cx="60" cy="168" r="2" fill="#FFD0DC" opacity="0.4"/>
      <circle cx="66" cy="166" r="2" fill="#FFD0DC" opacity="0.4"/>
      <circle cx="74" cy="167" r="2" fill="#FFD0DC" opacity="0.4"/>

      <ellipse cx="132" cy="168" rx="16" ry="11" fill="url(#lp-headGrad)" stroke="#e0e0dc" strokeWidth="0.5"/>
      <ellipse cx="137" cy="172" rx="4" ry="3" fill="url(#lp-pawPadGrad)"/>
      <ellipse cx="128" cy="173" rx="3" ry="2.5" fill="url(#lp-pawPadGrad)"/>
      <circle cx="140" cy="168" r="2" fill="#FFD0DC" opacity="0.4"/>
      <circle cx="134" cy="166" r="2" fill="#FFD0DC" opacity="0.4"/>
      <circle cx="126" cy="167" r="2" fill="#FFD0DC" opacity="0.4"/>

      <ellipse cx="100" cy="82" rx="38" ry="35" fill="url(#lp-headGrad)" filter="url(#lp-softShadow)"/>
      <ellipse cx="100" cy="108" rx="30" ry="8" fill="#e8e8e4" opacity="0.3"/>

      <path d="M70 58 C62 30, 52 8, 58 6 C64 4, 76 22, 82 48" fill="url(#lp-earGradL)"/>
      <path d="M68 54 C63 32, 56 14, 60 12 C64 10, 72 28, 78 48" fill="url(#lp-earInnerGrad)" opacity="0.8"/>
      <path d="M62 20 Q65 25 67 18" stroke="#8ad45a" strokeWidth="0.5" fill="none" opacity="0.4"/>
      <path d="M58 28 Q62 32 64 26" stroke="#8ad45a" strokeWidth="0.5" fill="none" opacity="0.3"/>

      <path d="M130 58 C138 30, 148 8, 142 6 C136 4, 124 22, 118 48" fill="url(#lp-earGradR)"/>
      <path d="M132 54 C137 32, 144 14, 140 12 C136 10, 128 28, 122 48" fill="url(#lp-earInnerGrad)" opacity="0.8"/>
      <path d="M138 20 Q135 25 133 18" stroke="#8ad45a" strokeWidth="0.5" fill="none" opacity="0.4"/>
      <path d="M142 28 Q138 32 136 26" stroke="#8ad45a" strokeWidth="0.5" fill="none" opacity="0.3"/>

      <ellipse cx="85" cy="78" rx="9" ry="10" fill="url(#lp-eyeShine)"/>
      <circle cx="82" cy="74" r="3.5" fill="white" opacity="0.95"/>
      <circle cx="87" cy="80" r="1.8" fill="white" opacity="0.5"/>
      <circle cx="83" cy="81" r="0.8" fill="white" opacity="0.3"/>
      <ellipse cx="85" cy="78" rx="9" ry="10" fill="none" stroke="#2a2a2a" strokeWidth="0.5" opacity="0.3"/>

      <ellipse cx="115" cy="78" rx="9" ry="10" fill="url(#lp-eyeShine)"/>
      <circle cx="112" cy="74" r="3.5" fill="white" opacity="0.95"/>
      <circle cx="117" cy="80" r="1.8" fill="white" opacity="0.5"/>
      <circle cx="113" cy="81" r="0.8" fill="white" opacity="0.3"/>
      <ellipse cx="115" cy="78" rx="9" ry="10" fill="none" stroke="#2a2a2a" strokeWidth="0.5" opacity="0.3"/>

      <path d="M76 73 Q78 71 80 73" stroke="#3a3a3a" strokeWidth="0.6" fill="none" opacity="0.3"/>
      <path d="M120 73 Q122 71 124 73" stroke="#3a3a3a" strokeWidth="0.6" fill="none" opacity="0.3"/>

      <path d="M77 66 Q85 63 93 66" stroke="#c8c8c4" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.5"/>
      <path d="M107 66 Q115 63 123 66" stroke="#c8c8c4" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.5"/>

      <path d="M95 88 Q100 83 105 88 Q102 93 100 94 Q98 93 95 88Z" fill="url(#lp-noseGrad)"/>
      <ellipse cx="100" cy="87" rx="2" ry="1" fill="white" opacity="0.3"/>

      <path d="M93 94 Q97 98 100 95" stroke="#3a3a3a" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M100 95 Q103 98 107 94" stroke="#3a3a3a" strokeWidth="1.5" fill="none" strokeLinecap="round"/>

      <line x1="62" y1="85" x2="78" y2="88" stroke="#c8c8c4" strokeWidth="0.8" strokeLinecap="round" opacity="0.5"/>
      <line x1="60" y1="90" x2="78" y2="91" stroke="#c8c8c4" strokeWidth="0.8" strokeLinecap="round" opacity="0.4"/>
      <line x1="62" y1="95" x2="78" y2="93" stroke="#c8c8c4" strokeWidth="0.8" strokeLinecap="round" opacity="0.3"/>
      <line x1="138" y1="85" x2="122" y2="88" stroke="#c8c8c4" strokeWidth="0.8" strokeLinecap="round" opacity="0.5"/>
      <line x1="140" y1="90" x2="122" y2="91" stroke="#c8c8c4" strokeWidth="0.8" strokeLinecap="round" opacity="0.4"/>
      <line x1="138" y1="95" x2="122" y2="93" stroke="#c8c8c4" strokeWidth="0.8" strokeLinecap="round" opacity="0.3"/>

      <ellipse cx="72" cy="90" rx="9" ry="6" fill="url(#lp-cheekGrad)"/>
      <ellipse cx="128" cy="90" rx="9" ry="6" fill="url(#lp-cheekGrad)"/>

      <path d="M88 62 Q92 58 96 62 Q100 58 104 62 Q108 58 112 62" stroke="#e0e0dc" strokeWidth="0.6" fill="none" opacity="0.3"/>

      <path d="M62 82 Q58 80 60 77" stroke="#e0e0dc" strokeWidth="0.5" fill="none" opacity="0.3"/>
      <path d="M138 82 Q142 80 140 77" stroke="#e0e0dc" strokeWidth="0.5" fill="none" opacity="0.3"/>
    </svg>
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
