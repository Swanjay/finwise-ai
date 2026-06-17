'use client'

import { motion } from 'framer-motion'
import { FinWiseMascot } from '@/components/finwise/mascot'
import { Button } from '@/components/ui/button'
import { RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-[#16161f] flex flex-col items-center justify-center px-6">
      {/* Sad Mascot */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <FinWiseMascot 
          size={180} 
          state="sad"
          animate
        />
      </motion.div>

      {/* Error Message */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="mt-8 text-center"
      >
        <h1 className="text-2xl font-heading font-bold text-foreground">
          Ups! Ada Masalah 😿
        </h1>
        <p className="mt-2 text-muted-foreground max-w-sm">
          Sepertinya ada yang tidak beres. Jangan khawatir, kucing kami sedang 
          memperbaikinya!
        </p>
      </motion.div>

      {/* Error Details */}
      {error?.message && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-4 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 max-w-sm"
        >
          <p className="text-xs text-destructive font-mono text-center break-all">
            {error.message}
          </p>
        </motion.div>
      )}

      {/* Actions */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        className="mt-8 flex flex-col sm:flex-row gap-3"
      >
        <Button 
          onClick={reset}
          className="gap-2 rounded-full px-6"
        >
          <RefreshCw className="size-4" />
          Coba Lagi
        </Button>
        
        <Link href="/">
          <Button 
            variant="outline" 
            className="gap-2 rounded-full px-6 w-full"
          >
            <Home className="size-4" />
            Kembali ke Home
          </Button>
        </Link>
      </motion.div>

      {/* Fun Fact */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="mt-12 text-center"
      >
        <p className="text-xs text-muted-foreground italic">
          "Kucing tidur 12-16 jam sehari. Mungkin ini saatnya istirahat juga! 😴"
        </p>
      </motion.div>
    </div>
  )
}
