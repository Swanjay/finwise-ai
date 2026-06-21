"use client"
import { useState, useRef, useEffect } from "react"
import { signIn } from "next-auth/react"
import { Loader2, MessageCircle, CheckCircle, Mail, ArrowLeft, Send, HelpCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import FinWiseLogo from "@/components/finwise-logo"

// ─── Step indicator ───
function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5" role="progressbar" aria-valuenow={current} aria-valuemin={1} aria-valuemax={total}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i + 1 < current ? "w-4 bg-success" : i + 1 === current ? "w-6 bg-primary" : "w-1.5 bg-border"
          }`}
        />
      ))}
    </div>
  )
}

export default function LoginPage() {
  const [loading, setLoading] = useState<"google" | "telegram" | "email" | null>(null)
  const [error, setError] = useState("")
  const [tgStep, setTgStep] = useState<"idle" | "code" | "done">("idle")
  const [emailStep, setEmailStep] = useState<"idle" | "input" | "sent" | "done">("idle")
  const [tgUsername, setTgUsername] = useState("")
  const [tgCode, setTgCode] = useState("")
  const [email, setEmail] = useState("")
  const [emailCode, setEmailCode] = useState("")
  const [botUrl, setBotUrl] = useState("")
  const [channelUrl, setChannelUrl] = useState("")
  const otpRef = useRef<HTMLInputElement>(null)
  const emailOtpRef = useRef<HTMLInputElement>(null)
  const tgInputRef = useRef<HTMLInputElement>(null)
  const emailInputRef = useRef<HTMLInputElement>(null)

  // Auto-focus OTP input when step changes
  useEffect(() => {
    if (tgStep === "code") otpRef.current?.focus()
  }, [tgStep])
  useEffect(() => {
    if (emailStep === "sent") emailOtpRef.current?.focus()
  }, [emailStep])

  // ─── Google Login ───
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

  // ─── Telegram: Request OTP ───
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
        setTgStep("code")
      } else {
        setError(data.error || "Gagal mengirim kode")
      }
    } catch {
      setError("Koneksi gagal. Periksa internet kamu.")
    }
    setLoading(null)
  }

  // ─── Telegram: Verify OTP ───
  async function handleTelegramVerify() {
    if (!tgCode.trim()) return setError("Masukkan kode verifikasi")
    if (tgCode.trim().length < 6) return setError("Kode harus 6 digit")
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
        setTgStep("done")
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
            setError(errData?.error || "Login gagal. Coba lagi.")
            setTgStep("code")
            setLoading(null)
          }
        } catch {
          setError("Koneksi ke server gagal. Coba lagi.")
          setTgStep("code")
          setLoading(null)
        }
      } else {
        setError(data.error || "Kode salah atau sudah kadaluarsa")
        setLoading(null)
      }
    } catch {
      setError("Koneksi gagal. Periksa internet kamu.")
      setLoading(null)
    }
  }

  // ─── Email: Request Magic Code ───
  async function handleEmailRequest() {
    if (!email.trim()) return setError("Masukkan alamat email")
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Format email tidak valid")
    setLoading("email")
    setError("")

    try {
      const res = await fetch("/api/email-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request", email: email.trim() }),
      })
      const data = await res.json()

      if (res.status === 429) {
        setError(data.error || "Terlalu banyak percobaan")
        setLoading(null)
        return
      }

      if (data.ok) {
        setEmailStep("sent")
      } else {
        setError(data.error || "Gagal mengirim kode")
      }
    } catch {
      setError("Koneksi gagal. Periksa internet kamu.")
    }
    setLoading(null)
  }

  // ─── Email: Verify Code ───
  async function handleEmailVerify() {
    if (!emailCode.trim()) return setError("Masukkan kode verifikasi")
    if (emailCode.trim().length < 6) return setError("Kode harus 6 digit")
    setLoading("email")
    setError("")

    try {
      const res = await fetch("/api/email-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", email: email.trim(), code: emailCode }),
      })
      const data = await res.json()

      if (res.status === 429) {
        setError(data.error || "Terlalu banyak percobaan")
        setLoading(null)
        return
      }

      if (data.ok) {
        setEmailStep("done")
        window.location.href = "/"
      } else {
        setError(data.error || "Kode salah atau sudah kadaluarsa")
        setLoading(null)
      }
    } catch {
      setError("Koneksi gagal. Coba lagi.")
      setLoading(null)
    }
  }

  // ─── Reset functions ───
  function resetTelegram() {
    setTgStep("idle")
    setTgCode("")
    setError("")
    setBotUrl("")
    setChannelUrl("")
    setTimeout(() => tgInputRef.current?.focus(), 100)
  }
  function resetEmail() {
    setEmailStep("idle")
    setEmailCode("")
    setError("")
    setTimeout(() => emailInputRef.current?.focus(), 100)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-6">
        {/* ─── Logo + Title ─── */}
        <div className="space-y-3 text-center">
          <div className="mx-auto w-fit">
            <FinWiseLogo size={72} />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight">
              Masuk ke{" "}
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-[gradient_3s_ease-in-out_infinite]">
                FinWise
              </span>
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Kelola keuanganmu dengan lebih pintar 💰
            </p>
          </div>
        </div>

        {/* ─── Error ─── */}
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-center text-sm text-destructive animate-[slideUp_0.2s_ease]"
          >
            {error}
          </div>
        )}

        {/* ═══════════════════════════════════════════
            LOGIN METHODS (idle state)
        ═══════════════════════════════════════════ */}
        {tgStep === "idle" && emailStep === "idle" && (
          <div className="space-y-3">
            {/* Google Login */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading !== null}
              aria-label="Masuk dengan akun Google"
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-card border border-border px-4 py-3.5 text-sm font-bold text-foreground shadow-md transition-all hover:bg-muted hover:shadow-lg active:scale-[0.98] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {loading === "google" ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <svg className="size-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Masuk dengan Google
            </button>

            {/* Email Login [P0] */}
            <button
              onClick={() => { setError(""); setEmailStep("input") }}
              disabled={loading !== null}
              aria-label="Masuk dengan email"
              className="relative flex w-full items-center justify-center gap-3 rounded-xl bg-primary/5 border border-primary/20 px-4 py-3.5 text-sm font-bold text-foreground shadow-sm transition-all hover:bg-primary/10 hover:shadow-md active:scale-[0.98] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <Mail className="size-5 shrink-0 text-primary" />
              Masuk dengan Email
              <span className="absolute -top-2 -right-2 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-white">BARU</span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3" role="separator">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground font-medium">atau</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Telegram Login */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-center text-muted-foreground">
                Login dengan Telegram
              </p>
              <div className="flex gap-2">
                <input
                  ref={tgInputRef}
                  type="text"
                  placeholder="Username Telegram (tanpa @)"
                  value={tgUsername}
                  onChange={(e) => { setTgUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '')); setError("") }}
                  onKeyDown={(e) => e.key === "Enter" && handleTelegramRequest()}
                  maxLength={50}
                  aria-label="Username Telegram"
                  className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                {/* [P1] Fixed: button now has label */}
                <button
                  onClick={handleTelegramRequest}
                  disabled={loading === "telegram"}
                  aria-label="Kirim kode verifikasi ke Telegram"
                  title="Kirim kode OTP"
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-[#229ED9] px-3 py-3 text-sm font-semibold text-white transition-all hover:bg-[#1d8ec4] active:scale-[0.98] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[#229ED9] focus-visible:ring-offset-2"
                >
                  {loading === "telegram" ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <>
                      <Send className="size-4 shrink-0" />
                      <span className="hidden sm:inline">Kirim</span>
                    </>
                  )}
                </button>
              </div>

              {/* Bot not found info box */}
              {botUrl && (
                <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-4 animate-[slideUp_0.2s_ease]" role="alert">
                  <p className="text-sm font-medium">🤖 Bot belum ditemukan!</p>
                  <p className="text-xs text-muted-foreground">
                    Kamu perlu /start dulu ke bot Telegram FinWise sebelum bisa login.
                  </p>
                  <a
                    href={botUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#229ED9] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#1d8ec4] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#229ED9]"
                  >
                    <MessageCircle className="size-4" /> Buka @KiyAii_bot
                  </a>
                  <p className="text-xs text-muted-foreground">
                    Setelah kirim /start, balik sini dan klik tombol Kirim lagi
                  </p>
                </div>
              )}

              {/* Channel not joined info box */}
              {channelUrl && (
                <div className="space-y-2 rounded-xl border border-orange-300/30 bg-orange-500/5 p-4 animate-[slideUp_0.2s_ease]" role="alert">
                  <p className="text-sm font-medium">📢 Belum join channel!</p>
                  <p className="text-xs text-muted-foreground">
                    Kamu harus join channel Telegram dulu sebelum bisa login.
                  </p>
                  <a
                    href={channelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#229ED9] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#1d8ec4] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#229ED9]"
                  >
                    <MessageCircle className="size-4" /> Join Channel @ainsyir
                  </a>
                  <p className="text-xs text-muted-foreground">
                    Setelah join, balik sini dan coba lagi
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            TELEGRAM OTP STEP [P1 improved]
        ═══════════════════════════════════════════ */}
        {tgStep === "code" && (
          <div className="space-y-4">
            <StepDots current={2} total={3} />
            <div className="text-center space-y-1">
              <p className="text-sm text-muted-foreground">
                Kode 6 digit dikirim ke Telegram kamu ✨
              </p>
              <p className="text-xs text-muted-foreground/60">
                @<span className="font-medium text-foreground">{tgUsername}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <input
                ref={otpRef}
                type="text"
                placeholder="• • • • • •"
                maxLength={6}
                inputMode="numeric"
                value={tgCode}
                onChange={(e) => { setTgCode(e.target.value.replace(/\D/g, "")); setError("") }}
                onKeyDown={(e) => e.key === "Enter" && handleTelegramVerify()}
                aria-label="Kode verifikasi 6 digit dari Telegram"
                className="flex-1 rounded-xl border border-border bg-card px-4 py-3.5 text-center text-xl tracking-[0.5em] font-mono outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <button
                onClick={handleTelegramVerify}
                disabled={loading === "telegram" || tgCode.length < 6}
                aria-label="Verifikasi kode"
                className="flex items-center justify-center rounded-xl bg-[#229ED9] px-4 py-3.5 text-white transition-all hover:bg-[#1d8ec4] active:scale-[0.98] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[#229ED9] focus-visible:ring-offset-2"
              >
                {loading === "telegram" ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <CheckCircle className="size-5" />
                )}
              </button>
            </div>
            <button
              onClick={resetTelegram}
              className="flex w-full items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg py-1"
              aria-label="Kembali untuk mengganti username"
            >
              <ArrowLeft className="size-3" /> Ganti username
            </button>
          </div>
        )}

        {tgStep === "done" && (
          <div className="text-center space-y-3 py-6">
            <StepDots current={3} total={3} />
            <CheckCircle className="size-12 text-success mx-auto" />
            <p className="text-sm font-medium text-success">Verifikasi berhasil! Mengalihkan...</p>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            EMAIL INPUT STEP [P0 new]
        ═══════════════════════════════════════════ */}
        {emailStep === "input" && (
          <div className="space-y-4">
            <StepDots current={1} total={2} />
            <div className="text-center space-y-1">
              <p className="text-sm text-muted-foreground">
                Masukkan email kamu ✉️
              </p>
            </div>
            <div className="flex gap-2">
              <input
                ref={emailInputRef}
                type="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError("") }}
                onKeyDown={(e) => e.key === "Enter" && handleEmailRequest()}
                aria-label="Alamat email"
                className="flex-1 rounded-xl border border-border bg-card px-4 py-3.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <button
                onClick={handleEmailRequest}
                disabled={loading === "email"}
                aria-label="Kirim kode verifikasi ke email"
                className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-white transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                {loading === "email" ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <>
                    <Send className="size-4 shrink-0" />
                    <span className="hidden sm:inline">Kirim</span>
                  </>
                )}
              </button>
            </div>
            <button
              onClick={() => setEmailStep("idle")}
              className="flex w-full items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg py-1"
              aria-label="Kembali ke pilihan login"
            >
              <ArrowLeft className="size-3" /> Pilih metode lain
            </button>
          </div>
        )}

        {emailStep === "sent" && (
          <div className="space-y-4">
            <StepDots current={2} total={2} />
            <div className="text-center space-y-1">
              <p className="text-sm text-muted-foreground">
                Kode verifikasi dikirim ke email kamu ✨
              </p>
              <p className="text-xs text-muted-foreground/60">
                <span className="font-medium text-foreground">{email}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <input
                ref={emailOtpRef}
                type="text"
                placeholder="• • • • • •"
                maxLength={6}
                inputMode="numeric"
                value={emailCode}
                onChange={(e) => { setEmailCode(e.target.value.replace(/\D/g, "")); setError("") }}
                onKeyDown={(e) => e.key === "Enter" && handleEmailVerify()}
                aria-label="Kode verifikasi 6 digit dari email"
                className="flex-1 rounded-xl border border-border bg-card px-4 py-3.5 text-center text-xl tracking-[0.5em] font-mono outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <button
                onClick={handleEmailVerify}
                disabled={loading === "email" || emailCode.length < 6}
                aria-label="Verifikasi kode email"
                className="flex items-center justify-center rounded-xl bg-primary px-4 py-3.5 text-white transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                {loading === "email" ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <CheckCircle className="size-5" />
                )}
              </button>
            </div>
            <button
              onClick={resetEmail}
              className="flex w-full items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg py-1"
              aria-label="Kembali untuk mengganti email"
            >
              <ArrowLeft className="size-3" /> Ganti email
            </button>
          </div>
        )}

        {emailStep === "done" && (
          <div className="text-center space-y-3 py-6">
            <StepDots current={2} total={2} />
            <CheckCircle className="size-12 text-success mx-auto" />
            <p className="text-sm font-medium text-success">Login berhasil! Mengalihkan...</p>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            EMAIL INLINE FORM (shown when clicking email button)
        ═══════════════════════════════════════════ */}
        {emailStep === "idle" && tgStep !== "idle" ? null : null}

        {/* ─── Footer ─── [P0/P1] */}
        <div className="space-y-2 text-center">
          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            🔒 Data kamu aman & tersimpan lokal di perangkat
          </p>
          <p className="text-xs text-muted-foreground/60">
            Akun dibuat otomatis saat pertama login ·{" "}
            <a
              href="https://t.me/ainsyir"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline font-medium focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
            >
              <HelpCircle className="size-3" /> Butuh bantuan?
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
