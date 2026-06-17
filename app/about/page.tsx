'use client'

import { motion } from 'framer-motion'
import { FinWiseMascot } from '@/components/finwise/mascot'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Github, Heart, ExternalLink } from 'lucide-react'
import Link from 'next/link'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#16161f] flex flex-col">
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
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <FinWiseMascot 
            size={200} 
            state="happy"
            animate
          />
        </motion.div>

        {/* App Name */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mt-6 text-center"
        >
          <h1 className="text-3xl font-heading font-bold">
            <span className="text-primary">Fin</span>
            <span className="text-foreground">Wise</span>
          </h1>
          <p className="text-muted-foreground mt-1">Catat Keuangan Lebih Pintar</p>
        </motion.div>

        {/* Description */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mt-8 max-w-sm text-center"
        >
          <p className="text-sm text-muted-foreground leading-relaxed">
            FinWise adalah aplikasi keuangan pribadi yang membantu kamu mengelola 
            uang dengan lebih bijak. Dengan fitur AI yang cerdas, scan struk otomatis, 
            dan analisis pengeluaran, FinWise siap menjadi teman finansialmu!
          </p>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-8 grid grid-cols-2 gap-3 w-full max-w-sm"
        >
          {[
            { icon: '📊', label: 'Dashboard Interaktif' },
            { icon: '📸', label: 'Scan Struk AI' },
            { icon: '🎯', label: 'Anggaran Cerdas' },
            { icon: '📈', label: 'Analisis Tren' },
          ].map((feature, i) => (
            <motion.div
              key={feature.label}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.8 + i * 0.1, duration: 0.3 }}
              className="flex items-center gap-2 p-3 rounded-xl bg-card/50 border border-border/50"
            >
              <span className="text-xl">{feature.icon}</span>
              <span className="text-xs font-medium">{feature.label}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Mascot Info */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="mt-8 flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/5 border border-primary/20"
        >
          <span className="text-2xl">🐱</span>
          <div>
            <p className="text-sm font-medium">Kenalan dengan Finny!</p>
            <p className="text-xs text-muted-foreground">Maskot resmi FinWise</p>
          </div>
        </motion.div>

        {/* Version & Credits */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.5 }}
          className="mt-8 text-center space-y-2"
        >
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
        </motion.div>

        {/* Links */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.5 }}
          className="mt-6 flex gap-3"
        >
          <Button variant="outline" size="sm" className="gap-2 rounded-full">
            <Github className="size-4" />
            GitHub
          </Button>
          <Button variant="outline" size="sm" className="gap-2 rounded-full">
            <ExternalLink className="size-4" />
            Website
          </Button>
        </motion.div>
      </main>
    </div>
  )
}
