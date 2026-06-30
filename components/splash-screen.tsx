"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import FinWiseLogo from "@/components/finwise-logo"
import Image from "next/image"

export function SplashScreen() {
  const [show, setShow] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setShow(false), 2500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-background"
        >
          {/* Mascot */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <Image
              src="/mascot-256.png?v=2"
              alt="FinWise Cat"
              width={180}
              height={180}
              className="drop-shadow-2xl"
              priority
            />
          </motion.div>

          {/* Logo */}
          <motion.div
            className="mt-4"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
          >
            <FinWiseLogo size={80} />
          </motion.div>

          {/* Tagline */}
          <motion.p
            className="mt-4 text-sm tracking-widest text-muted-foreground"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            Catat Keuangan Lebih Pintar
          </motion.p>

          {/* Neon accent line */}
          <motion.div
            className="mt-4 h-px w-20 bg-gradient-to-r from-primary to-accent"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 0.4 }}
            transition={{ delay: 0.9, duration: 0.6 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
