'use client'

import Link from 'next/link'
import FinWiseLogo from '@/components/finwise-logo'

export default function AuthError() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <FinWiseLogo size={100} className="mb-6" />
      <h1 className="text-2xl font-bold text-foreground mb-2">Login Gagal</h1>
      <p className="text-muted-foreground text-center mb-6 max-w-sm">
        Terjadi kesalahan saat proses login. Silakan coba lagi.
      </p>
      <Link
        href="/login"
        className="px-6 py-3 rounded-2xl bg-primary text-white font-semibold shadow-lg"
      >
        Kembali ke Login
      </Link>
    </div>
  )
}
