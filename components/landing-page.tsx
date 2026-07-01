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

// ─── FinWise Cat SVG Component (Orange Tabby Business Cat) ───
function FinWiseCat({ size = 80 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width={size} height={size}>
<defs>
<radialGradient id="lp-furGrad" cx="50%" cy="40%" r="50%" fx="45%" fy="35%">
      <stop offset="0%" stopColor="#F5A623"/>
      <stop offset="60%" stopColor="#FF8C00"/>
      <stop offset="100%" stopColor="#E67E22"/>
    </radialGradient>
<radialGradient id="lp-faceGrad" cx="50%" cy="45%" r="45%">
      <stop offset="0%" stopColor="#FFB347"/>
      <stop offset="100%" stopColor="#FF8C00"/>
    </radialGradient>
<radialGradient id="lp-muzzleGrad" cx="50%" cy="40%" r="50%">
      <stop offset="0%" stopColor="#FFFDF7"/>
      <stop offset="100%" stopColor="#FFF8F0"/>
    </radialGradient>
<radialGradient id="lp-eyeGrad" cx="45%" cy="40%" r="50%">
      <stop offset="0%" stopColor="#FFD700"/>
      <stop offset="40%" stopColor="#DAA520"/>
      <stop offset="100%" stopColor="#B8860B"/>
    </radialGradient>
<radialGradient id="lp-earInnerGrad" cx="50%" cy="60%" r="50%">
      <stop offset="0%" stopColor="#FFB6C1"/>
      <stop offset="100%" stopColor="#FFF8F0"/>
    </radialGradient>
<linearGradient id="lp-tieGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#3B82F6"/>
      <stop offset="50%" stopColor="#2563EB"/>
      <stop offset="100%" stopColor="#1D4ED8"/>
    </linearGradient>
<linearGradient id="lp-phoneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#374151"/>
      <stop offset="100%" stopColor="#1F2937"/>
    </linearGradient>
<linearGradient id="lp-screenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#DBEAFE"/>
      <stop offset="100%" stopColor="#BFDBFE"/>
    </linearGradient>
<radialGradient id="lp-bodyGrad" cx="50%" cy="30%" r="60%">
      <stop offset="0%" stopColor="#FF8C00"/>
      <stop offset="100%" stopColor="#E67E22"/>
    </radialGradient>
<linearGradient id="lp-shirtGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#FFFFFF"/>
      <stop offset="100%" stopColor="#F3F4F6"/>
    </linearGradient>
<filter id="lp-shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" floodColor="#00000030"/>
    </filter>
<filter id="lp-innerShadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#00000020"/>
    </filter>
<filter id="lp-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
<clipPath id="lp-earClipLeft">
      <ellipse cx="138" cy="108" rx="28" ry="42"/>
    </clipPath>
    <clipPath id="lp-earClipRight">
      <ellipse cx="262" cy="108" rx="28" ry="42"/>
    </clipPath>
  </defs>

<ellipse cx="200" cy="390" rx="140" ry="100" fill="url(#lp-bodyGrad)" filter="url(#lp-shadow)"/>
<path d="M155 310 Q165 290 200 285 Q235 290 245 310 L260 400 L140 400 Z" fill="url(#lp-shirtGrad)"/>
<path d="M155 310 Q170 305 185 310 L180 335 Q170 330 160 332 Z" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="0.5"/>
<path d="M245 310 Q230 305 215 310 L220 335 Q230 330 240 332 Z" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="0.5"/>
<polygon points="195,312 205,312 203,325 200,328 197,325" fill="#1D4ED8"/>
<path d="M196 325 L200 395 L204 325 Q200 320 196 325 Z" fill="url(#lp-tieGrad)"/>
<line x1="199" y1="335" x2="199" y2="385" stroke="#60A5FA" strokeWidth="1.5" opacity="0.4"/>

<ellipse cx="200" cy="210" rx="95" ry="85" fill="url(#lp-furGrad)" filter="url(#lp-shadow)"/>
<ellipse cx="145" cy="230" rx="25" ry="20" fill="#FF8C00" opacity="0.6"/>
  <ellipse cx="255" cy="230" rx="25" ry="20" fill="#FF8C00" opacity="0.6"/>

<path d="M130 175 L115 100 L162 155 Z" fill="#FF8C00" stroke="#E67E22" strokeWidth="1"/>
<path d="M135 168 L124 112 L155 155 Z" fill="url(#lp-earInnerGrad)"/>
<path d="M270 175 L285 100 L238 155 Z" fill="#FF8C00" stroke="#E67E22" strokeWidth="1"/>
<path d="M265 168 L276 112 L245 155 Z" fill="url(#lp-earInnerGrad)"/>

<path d="M170 175 L180 160 L190 178" fill="none" stroke="#D2691E" strokeWidth="3" strokeLinecap="round" opacity="0.6"/>
  <path d="M190 178 L200 162 L210 178" fill="none" stroke="#D2691E" strokeWidth="3" strokeLinecap="round" opacity="0.6"/>
  <path d="M210 178 L220 160 L230 175" fill="none" stroke="#D2691E" strokeWidth="3" strokeLinecap="round" opacity="0.6"/>
<path d="M120 200 Q130 195 135 205" fill="none" stroke="#D2691E" strokeWidth="2.5" strokeLinecap="round" opacity="0.5"/>
  <path d="M118 215 Q128 210 133 220" fill="none" stroke="#D2691E" strokeWidth="2.5" strokeLinecap="round" opacity="0.5"/>
  <path d="M120 230 Q130 225 135 235" fill="none" stroke="#D2691E" strokeWidth="2.5" strokeLinecap="round" opacity="0.5"/>

  <path d="M280 200 Q270 195 265 205" fill="none" stroke="#D2691E" strokeWidth="2.5" strokeLinecap="round" opacity="0.5"/>
  <path d="M282 215 Q272 210 267 220" fill="none" stroke="#D2691E" strokeWidth="2.5" strokeLinecap="round" opacity="0.5"/>
  <path d="M280 230 Q270 225 265 235" fill="none" stroke="#D2691E" strokeWidth="2.5" strokeLinecap="round" opacity="0.5"/>

<ellipse cx="200" cy="240" rx="52" ry="40" fill="url(#lp-muzzleGrad)"/>

<ellipse cx="170" cy="210" rx="24" ry="26" fill="#FFFFFF" stroke="#5C4033" strokeWidth="1"/>
<ellipse cx="170" cy="212" rx="18" ry="20" fill="url(#lp-eyeGrad)"/>
<ellipse cx="170" cy="213" rx="10" ry="13" fill="#1A1A2E"/>
<ellipse cx="176" cy="204" rx="5" ry="5" fill="#FFFFFF" opacity="0.95"/>
  <ellipse cx="165" cy="220" rx="3" ry="3" fill="#FFFFFF" opacity="0.6"/>
<path d="M148 207 Q170 195 192 207" fill="none" stroke="#5C4033" strokeWidth="1.5" opacity="0.3"/>
<ellipse cx="230" cy="210" rx="24" ry="26" fill="#FFFFFF" stroke="#5C4033" strokeWidth="1"/>
<ellipse cx="230" cy="212" rx="18" ry="20" fill="url(#lp-eyeGrad)"/>
<ellipse cx="230" cy="213" rx="10" ry="13" fill="#1A1A2E"/>
<ellipse cx="236" cy="204" rx="5" ry="5" fill="#FFFFFF" opacity="0.95"/>
  <ellipse cx="225" cy="220" rx="3" ry="3" fill="#FFFFFF" opacity="0.6"/>
<path d="M208 207 Q230 195 252 207" fill="none" stroke="#5C4033" strokeWidth="1.5" opacity="0.3"/>

<path d="M195 237 Q200 230 205 237 Q200 243 195 237 Z" fill="#FF8FAB" stroke="#E8697A" strokeWidth="0.5"/>
<ellipse cx="199" cy="235" rx="2" ry="1.5" fill="#FFB6C1" opacity="0.7"/>

<line x1="200" y1="241" x2="200" y2="248" stroke="#5C4033" strokeWidth="1.5" strokeLinecap="round"/>
<path d="M175 250 Q188 272 200 272 Q212 272 225 250" fill="#FF6B81" stroke="#5C4033" strokeWidth="1.5"/>
<ellipse cx="200" cy="267" rx="12" ry="8" fill="#FF8FAB"/>
  <path d="M188 267 Q200 275 212 267" fill="#FF6B81"/>
<path d="M185 252 Q192 250 199 252" fill="none" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.8"/>
  <path d="M201 252 Q208 250 215 252" fill="none" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.8"/>

<line x1="170" y1="245" x2="100" y2="235" stroke="#5C4033" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
  <line x1="168" y1="252" x2="95" y2="252" stroke="#5C4033" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
  <line x1="170" y1="259" x2="100" y2="269" stroke="#5C4033" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
<line x1="230" y1="245" x2="300" y2="235" stroke="#5C4033" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
  <line x1="232" y1="252" x2="305" y2="252" stroke="#5C4033" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
  <line x1="230" y1="259" x2="300" y2="269" stroke="#5C4033" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
<circle cx="168" cy="245" r="1.5" fill="#5C4033" opacity="0.5"/>
  <circle cx="166" cy="252" r="1.5" fill="#5C4033" opacity="0.5"/>
  <circle cx="168" cy="259" r="1.5" fill="#5C4033" opacity="0.5"/>
  <circle cx="232" cy="245" r="1.5" fill="#5C4033" opacity="0.5"/>
  <circle cx="234" cy="252" r="1.5" fill="#5C4033" opacity="0.5"/>
  <circle cx="232" cy="259" r="1.5" fill="#5C4033" opacity="0.5"/>

<path d="M275 310 Q300 290 310 260 Q315 245 310 235" fill="url(#lp-furGrad)" stroke="#E67E22" strokeWidth="1"/>
<ellipse cx="308" cy="225" rx="18" ry="14" fill="#FF8C00"/>
<ellipse cx="308" cy="228" rx="10" ry="8" fill="#FFB347" opacity="0.5"/>

<rect x="285" y="175" width="52" height="82" rx="6" ry="6" fill="#000000" opacity="0.15" transform="translate(2,2)"/>
<rect x="285" y="175" width="52" height="82" rx="6" ry="6" fill="url(#lp-phoneGrad)" stroke="#111827" strokeWidth="1"/>
<rect x="289" y="181" width="44" height="68" rx="3" ry="3" fill="url(#lp-screenGrad)"/>
<rect x="305" y="177" width="12" height="2" rx="1" fill="#374151"/>

<text x="305" y="207" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="bold" fill="#22C55E" textAnchor="middle">$</text>

<rect x="295" y="212" width="22" height="10" rx="1.5" fill="#22C55E" opacity="0.9"/>
  <rect x="297" y="214" width="18" height="6" rx="1" fill="#16A34A" opacity="0.5"/>
<rect x="297" y="208" width="22" height="10" rx="1.5" fill="#4ADE80" opacity="0.9"/>
  <rect x="299" y="210" width="18" height="6" rx="1" fill="#22C55E" opacity="0.5"/>
<rect x="299" y="204" width="22" height="10" rx="1.5" fill="#86EFAC" opacity="0.9"/>
  <rect x="301" y="206" width="18" height="6" rx="1" fill="#4ADE80" opacity="0.5"/>

<rect x="296" y="240" width="8" height="8" rx="1" fill="#3B82F6"/>
<rect x="306" y="236" width="8" height="12" rx="1" fill="#2563EB"/>
<rect x="316" y="230" width="8" height="18" rx="1" fill="#1D4ED8"/>
<rect x="289" y="181" width="44" height="5" rx="2" fill="#93C5FD" opacity="0.3"/>

<ellipse cx="165" cy="340" rx="22" ry="16" fill="#FF8C00"/>
  <ellipse cx="165" cy="343" rx="14" ry="10" fill="#FFB347" opacity="0.4"/>
<ellipse cx="155" cy="345" rx="5" ry="4" fill="#FF8C00"/>
  <ellipse cx="163" cy="348" rx="5" ry="4" fill="#FF8C00"/>
  <ellipse cx="171" cy="347" rx="5" ry="4" fill="#FF8C00"/>

<path d="M155 310 Q160 300 170 308 Q175 298 185 306" fill="#FF8C00" opacity="0.8"/>
  <path d="M245 310 Q240 300 230 308 Q225 298 215 306" fill="#FF8C00" opacity="0.8"/>

<ellipse cx="200" cy="280" rx="45" ry="10" fill="#E67E22" opacity="0.3"/>
<ellipse cx="200" cy="190" rx="30" ry="15" fill="#FFD700" opacity="0.12"/>
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
