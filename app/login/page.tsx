"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"
import { Loader2, MessageCircle, CheckCircle, UserCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import FinWiseLogo from "@/components/finwise-logo"

export default function LoginPage() {
  const [loading, setLoading] = useState<"guest" | "telegram" | null>(null)
  const [error, setError] = useState("")
  const [step, setStep] = useState<"idle" | "code" | "done">("idle")
  const [tgUsername, setTgUsername] = useState("")
  const [tgCode, setTgCode] = useState("")
  const [botUrl, setBotUrl] = useState("")
  const router = useRouter()

  async function handleGuestLogin() {
    setLoading("guest")
    setError("")
    // Guest = no auth, set cookie for middleware + localStorage for client
    localStorage.setItem("fw.guest.v1", "true")
    document.cookie = "fw-guest=true; path=/; max-age=2592000; SameSite=Lax" // 30 days
    router.push("/")
  }

  async function handleTelegramRequest() {
    if (!tgUsername.trim()) return setError("Masukkan username Telegram")
    if (!/^[a-zA-Z0-9_]+$/.test(tgUsername.trim())) return setError("Username hanya huruf, angka, dan underscore")
    setLoading("telegram")
    setError("")
    setBotUrl("")

    try {
      const res = await fetch("/api/telegram-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request", username: tgUsername.trim() }),
      })
      const data = await res.json()

      if (res.status === 429) {
        setError(data.error || "Terlalu banyak percobaan")
        setLoading(null)
        return
      }

      if (data.needStart) {
        setBotUrl(data.botUrl)
        setLoading(null)
        return
      }

      if (data.ok) {
        setStep("code")
      } else {
        setError(data.error || "Gagal mengirim kode")
      }
    } catch {
      setError("Koneksi gagal")
    }
    setLoading(null)
  }

  async function handleTelegramVerify() {
    if (!tgCode.trim()) return setError("Masukkan kode")
    setLoading("telegram")
    setError("")

    try {
      const res = await fetch("/api/telegram-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", username: tgUsername.trim(), code: tgCode }),
      })
      const data = await res.json()

      if (res.status === 429) {
        setError(data.error || "Terlalu banyak percobaan")
        setLoading(null)
        return
      }

      if (data.ok && data.user?.sig) {
        // Send HMAC-signed credentials to NextAuth
        await signIn("telegram", {
          id: data.user.id,
          name: data.user.name,
          username: data.user.username,
          sig: data.user.sig,
          callbackUrl: "/",
        })
      } else {
        setError(data.error || "Kode salah")
      }
    } catch {
      setError("Koneksi gagal")
    }
    setLoading(null)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo + Title */}
        <div className="space-y-4 text-center">
          <div className="mx-auto w-fit">
            <FinWiseLogo size={72} />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight">
              Masuk ke <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">FinWise</span>
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Kelola keuanganmu dengan lebih pintar 💰
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-center text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Guest Login (Primary) */}
        <button
          onClick={handleGuestLogin}
          disabled={loading !== null}
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-primary px-4 py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
        >
          {loading === "guest" ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <UserCircle className="size-5" />
          )}
          Masuk sebagai Tamu
        </button>

        <p className="text-center text-xs text-muted-foreground">
          Data disimpan lokal di perangkat ini saja
        </p>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">atau login dengan Telegram</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Telegram Login */}
        {step === "idle" && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Username Telegram (tanpa @)"
                value={tgUsername}
                onChange={(e) => { setTgUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '')); setError("") }}
                onKeyDown={(e) => e.key === "Enter" && handleTelegramRequest()}
                maxLength={50}
                className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary transition"
              />
              <button
                onClick={handleTelegramRequest}
                disabled={loading === "telegram"}
                aria-label="Kirim kode verifikasi ke Telegram"
                className="flex items-center justify-center rounded-xl bg-[#229ED9] px-4 py-3 text-white transition active:scale-[0.98] disabled:opacity-50"
              >
                {loading === "telegram" ? <Loader2 className="size-5 animate-spin" /> : <MessageCircle className="size-5" />}
              </button>
            </div>

            {botUrl && (
              <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-4">
                <p className="text-sm font-medium">Bot belum ditemukan!</p>
                <p className="text-xs text-muted-foreground">
                  Kamu perlu /start dulu ke bot Telegram:
                </p>
                <a
                  href={botUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#229ED9] px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98]"
                >
                  <MessageCircle className="size-4" /> Buka @KiyAii_bot
                </a>
                <p className="text-xs text-muted-foreground">
                  Setelah kirim /start, balik sini dan klik tombol biru lagi
                </p>
              </div>
            )}
          </div>
        )}

        {step === "code" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground text-center">
              Kode dikirim ke Telegram kamu ✨
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Masukkan 6 digit kode"
                maxLength={6}
                value={tgCode}
                onChange={(e) => { setTgCode(e.target.value.replace(/\D/g, "")); setError("") }}
                onKeyDown={(e) => e.key === "Enter" && handleTelegramVerify()}
                className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-center text-lg tracking-[0.5em] font-mono outline-none focus:border-primary transition"
              />
              <button
                onClick={handleTelegramVerify}
                disabled={loading === "telegram"}
                className="flex items-center justify-center rounded-xl bg-[#229ED9] px-4 py-3 text-white transition active:scale-[0.98] disabled:opacity-50"
              >
                {loading === "telegram" ? <Loader2 className="size-5 animate-spin" /> : <CheckCircle className="size-5" />}
              </button>
            </div>
            <button onClick={() => { setStep("idle"); setTgCode(""); setError("") }} className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition">
              ← Ganti username
            </button>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Data kamu aman & tersimpan lokal di perangkat 🔒
        </p>
      </div>
    </div>
  )
}
