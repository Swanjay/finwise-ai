'use client'

import { motion } from 'framer-motion'
import { FinWiseMascot } from '@/components/finwise/mascot'
import { Button } from '@/components/ui/button'
import { Home, Search } from 'lucide-react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F5F3FF] flex flex-col items-center justify-center px-6">
      {/* Confused Mascot */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <FinWiseMascot 
          size={180} 
          state="thinking"
          animate
        />
      </motion.div>

      {/* 404 Message */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="mt-8 text-center"
      >
        <h1 className="text-6xl font-heading font-bold text-primary">
          404
        </h1>
        <h2 className="mt-2 text-xl font-heading font-semibold text-foreground">
          Halaman Tidak Ditemukan 🐱
        </h2>
        <p className="mt-2 text-muted-foreground max-w-sm">
          Sepertinya halaman yang kamu cari sudah pindah atau tidak ada. 
          Kucing kami sedang mencarinya!
        </p>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="mt-8 flex flex-col sm:flex-row gap-3"
      >
        <Link href="/">
          <Button className="gap-2 rounded-full px-6">
            <Home className="size-4" />
            Kembali ke Home
          </Button>
        </Link>
      </motion.div>

      {/* Fun Fact */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.5 }}
        className="mt-12 text-center"
      >
        <p className="text-xs text-muted-foreground italic">
          "Kucing memiliki 230 tulang, lebih banyak dari manusia (206). 
          Mungkin mereka lebih fleksibel dalam menemukan jalan! 🐈"
        </p>
      </motion.div>
    </div>
  )
}
