"use client"
import { useState } from "react"
import { signIn } from "next-auth/react"
import { Loader2, MessageCircle, CheckCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import FinWiseLogo from "@/components/finwise-logo"

export default function LoginPage() {
  const [loading, setLoading] = useState<"google" | "telegram" | null>(null)
  const [error, setError] = useState("")
  const [step, setStep] = useState<"idle" | "code" | "done">("idle")
  const [tgUsername, setTgUsername] = useState("")
  const [tgCode, setTgCode] = useState("")
  const [botUrl, setBotUrl] = useState("")
  const [channelUrl, setChannelUrl] = useState("")

  async function handleGoogleLogin() {
    setLoading("google")
    setError("")
    try {
      await signIn("google", { callbackUrl: "/" })
    } catch {
      setError("Gagal login dengan Google")
      setLoading(null)
    }
  }

  async function handleTelegramRequest() {
    if (!tgUsername.trim()) return setError("Masukkan username Telegram")
    if (!/^[a-zA-Z0-9_]+$/.test(tgUsername.trim())) return setError("Username hanya huruf, angka, dan underscore")
    setLoading("telegram")
    setError("")
    setBotUrl("")
    setChannelUrl("")

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

      if (data.needJoin) {
        setChannelUrl(data.channelUrl)
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
        // Use custom auth endpoint (bypasses NextAuth form POST blocked by Cloudflare)
        try {
          const authRes = await fetch("/api/auth-telegram", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: data.user.id,
              name: data.user.name,
              username: data.user.username,
              sig: data.user.sig,
            }),
          })

          if (authRes.ok) {
            window.location.href = "/"
          } else {
            const errData = await authRes.json().catch(() => null)
            setError(errData?.error || "Login gagal")
            setLoading(null)
          }
        } catch {
          setError("Koneksi ke server gagal. Coba lagi.")
          setLoading(null)
        }
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

        {/* Google Login */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading !== null}
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-white border border-border px-4 py-3.5 text-sm font-bold text-foreground shadow-md transition hover:bg-gray-50 active:scale-[0.98] disabled:opacity-50"
        >
          {loading === "google" ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <svg className="size-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          Masuk dengan Google
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">atau</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Telegram Login */}
        {step === "idle" && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-center text-muted-foreground">Login dengan Telegram</p>
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

            {channelUrl && (
              <div className="space-y-2 rounded-xl border border-orange-300/30 bg-orange-500/5 p-4">
                <p className="text-sm font-medium">📢 Belum join channel!</p>
                <p className="text-xs text-muted-foreground">
                  Kamu harus join channel Telegram dulu sebelum bisa login:
                </p>
                <a
                  href={channelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#229ED9] px-4 py-2.5 text-sm font-medium text-white transition active:scale-[0.98]"
                >
                  <MessageCircle className="size-4" /> Join Channel @ainsyir
                </a>
                <p className="text-xs text-muted-foreground">
                  Setelah join, balik sini dan coba lagi
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

        {/* Demo Mode */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">atau</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <button
          onClick={() => {
            document.cookie = "finwise-demo=true; path=/; max-age=86400"
            localStorage.setItem("finwise-demo", "true")
            window.location.href = "/"
          }}
          disabled={loading !== null}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-sm font-bold text-primary transition hover:bg-primary/10 active:scale-[0.98] disabled:opacity-50"
        >
          🎮 Coba Demo (Tanpa Login)
        </button>

        <p className="text-center text-xs text-muted-foreground">
          Data kamu aman & tersimpan lokal di perangkat 🔒
        </p>
      </div>
    </div>
  )
}
