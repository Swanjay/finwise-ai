'use client'

import { FinWiseMascot } from '@/components/finwise/mascot'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Heart, ExternalLink, GitBranch } from 'lucide-react'
import Link from 'next/link'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#F5F3FF] flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-4 px-5 py-4">
        <Link href="/">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="size-5" />
          </Button>
        </Link>
        <h1 className="font-heading text-lg font-semibold">Tentang FinWise</h1>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
        {/* Mascot */}
        <div className="animate-fade-in">
          <FinWiseMascot 
            size={256} 
            state="happy"
            animate
          />
        </div>

        {/* App Name */}
        <div className="mt-6 text-center animate-fade-in-up">
          <h1 className="text-3xl font-heading font-bold">
            <span className="text-primary">Fin</span>
            <span className="text-foreground">Wise</span>
          </h1>
          <p className="text-muted-foreground mt-1">Catat Keuangan Lebih Pintar</p>
        </div>

        {/* Description */}
        <div className="mt-8 max-w-sm text-center animate-fade-in-up-delay-1">
          <p className="text-sm text-muted-foreground leading-relaxed">
            FinWise adalah aplikasi keuangan pribadi yang membantu kamu mengelola 
            uang dengan lebih bijak. Dengan fitur AI yang cerdas, scan struk otomatis, 
            dan analisis pengeluaran, FinWise siap menjadi teman finansialmu!
          </p>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-2 gap-3 w-full max-w-sm animate-fade-in-up-delay-2">
          {[
            { icon: '📊', label: 'Dashboard Interaktif' },
            { icon: '📸', label: 'Scan Struk AI' },
            { icon: '🎯', label: 'Anggaran Cerdas' },
            { icon: '📈', label: 'Analisis Tren' },
          ].map((feature) => (
            <div
              key={feature.label}
              className="flex items-center gap-2 p-3 rounded-xl bg-card/50 border border-border/50"
            >
              <span className="text-xl">{feature.icon}</span>
              <span className="text-xs font-medium">{feature.label}</span>
            </div>
          ))}
        </div>

        {/* Mascot Info */}
        <div className="mt-8 flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/5 border border-primary/20 animate-fade-in-up-delay-3">
          <span className="text-2xl">🐱</span>
          <div>
            <p className="text-sm font-medium">Kenalan dengan Finny!</p>
            <p className="text-xs text-muted-foreground">Maskot resmi FinWise</p>
          </div>
        </div>

        {/* Version & Credits */}
        <div className="mt-8 text-center space-2 animate-fade-in-up-delay-4">
          <div className="flex items-center justify-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-primary font-mono">v</span>
              <span className="text-muted-foreground">2.0.0</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-1.5">
              <span>🇮🇩</span>
              <span className="text-muted-foreground">Indonesia</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            Dibuat dengan <Heart className="size-3 fill-primary text-primary" /> oleh San
          </p>
        </div>

        {/* Links */}
        <div className="mt-6 flex gap-3 animate-fade-in-up-delay-5">
          <Button variant="outline" size="sm" className="gap-2 rounded-full">
            <GitBranch className="size-4" />
            GitHub
          </Button>
          <Button variant="outline" size="sm" className="gap-2 rounded-full">
            <ExternalLink className="size-4" />
            Website
          </Button>
        </div>
      </main>
    </div>
  )
}
