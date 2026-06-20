"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { KeyRound, Loader2, CheckCircle, XCircle, ArrowLeft, MessageCircle } from "lucide-react"
import { signOut } from "next-auth/react"
import FinWiseLogo from "@/components/finwise-logo"

export default function VerifyInvitePage() {
  const router = useRouter()
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [error, setError] = useState("")
  const [checking, setChecking] = useState(true)

  // Cek pas halaman dimuat: user udah aktivasi? langsung redirect
  useEffect(() => {
    async function checkActivation() {
      try {
        const res = await fetch("/api/invite-codes/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: "" }),
        })
        const data = await res.json()
        if (data.ok && data.alreadyActivated) {
          setStatus("success")
          setTimeout(() => router.push("/"), 500)
          return
        }
      } catch {
        // silent — user belum aktivasi, lanjut ke form
      }
      setChecking(false)
    }
    checkActivation()
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return

    setLoading(true)
    setStatus("loading")
    setError("")

    try {
      const res = await fetch("/api/invite-codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      })
      const data = await res.json()

      if (data.ok) {
        setStatus("success")
        setTimeout(() => router.push("/"), 1200)
      } else {
        setStatus("error")
        setError(data.error || "Kode tidak valid")
      }
    } catch {
      setStatus("error")
      setError("Koneksi gagal. Coba lagi.")
    }
    setLoading(false)
  }

  // Loading screen pas cek aktivasi
  if (checking) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-6">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="space-y-4 text-center">
          <div className="mx-auto w-fit">
            <FinWiseLogo size={72} />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight">
              Masukkan Kode Invitasi 🔑
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              FinWise hanya untuk pengguna terundang
            </p>
          </div>
        </div>

        {/* Status messages */}
        {status === "success" && (
          <div className="rounded-xl border border-green-400/30 bg-green-500/10 p-4 text-center">
            <CheckCircle className="mx-auto mb-2 size-10 text-green-500" />
            <p className="font-semibold text-green-700 dark:text-green-300">
              ✅ Kode valid! Mengarahkan ke dashboard...
            </p>
          </div>
        )}

        {error && status === "error" && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-center">
            <XCircle className="mx-auto mb-2 size-10 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
            <button
              onClick={() => setStatus("idle")}
              className="mt-2 text-xs text-muted-foreground underline"
            >
              Coba lagi
            </button>
          </div>
        )}

        {/* Input form */}
        {status !== "success" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                Kode Invitasi
              </label>
              <input
                type="text"
                placeholder="CONTOH-A1B2"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))
                  setError("")
                  setStatus("idle")
                }}
                maxLength={20}
                disabled={loading}
                className="w-full rounded-xl border border-border bg-card px-4 py-3.5 text-center text-lg tracking-[0.3em] font-mono outline-none focus:border-primary transition disabled:opacity-50"
                autoFocus
              />
              <p className="mt-1.5 text-xs text-muted-foreground text-center">
                Masukkan kode yang kamu dapatkan
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || code.length < 5}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-4 py-3.5 text-sm font-bold text-white shadow-md transition active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  Memvalidasi...
                </>
              ) : (
                <>
                  <KeyRound className="size-5" />
                  Aktivasi Akun
                </>
              )}
            </button>
          </form>
        )}

        {/* ===== KONTAK ===== */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-xs text-muted-foreground text-center">
            Belum punya kode? Hubungi admin untuk mendapatkan kode invitasi:
          </p>
          <a
            href="https://t.me/Furaney"
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#229ED9] px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98]"
          >
            <MessageCircle className="size-4" />
            Hubungi Admin
          </a>
          <p className="text-xs text-muted-foreground text-center">
            <span className="opacity-70">@Furaney</span>
          </p>
        </div>

        {/* Logout */}
        <div className="text-center">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft className="size-3" />
            Kembali ke login
          </button>
        </div>
      </div>
    </div>
  )
}
