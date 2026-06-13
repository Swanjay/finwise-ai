"use client"

import { signIn } from "next-auth/react"
import { useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"

declare global {
  interface Window {
    onTelegramAuth?: (user: Record<string, string>) => void
  }
}

export default function LoginPage() {
  const [loading, setLoading] = useState<"google" | "telegram" | null>(null)
  const [error, setError] = useState("")
  const tgRef = useRef<HTMLDivElement>(null)

  // Telegram Login Widget
  useEffect(() => {
    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || ""
    if (!botUsername || !tgRef.current) return

    window.onTelegramAuth = async (user) => {
      setLoading("telegram")
      setError("")
      try {
        const result = await signIn("telegram", {
          id: user.id,
          first_name: user.first_name || "",
          last_name: user.last_name || "",
          username: user.username || "",
          photo_url: user.photo_url || "",
          auth_date: user.auth_date,
          hash: user.hash,
          redirect: false,
          callbackUrl: "/",
        })
        if (result?.error) {
          setError("Login Telegram gagal")
          setLoading(null)
        } else {
          window.location.href = result?.url || "/"
        }
      } catch {
        setError("Koneksi gagal")
        setLoading(null)
      }
    }

    const script = document.createElement("script")
    script.src = "https://telegram.org/js/telegram-widget.js?22"
    script.setAttribute("data-telegram-login", botUsername)
    script.setAttribute("data-size", "large")
    script.setAttribute("data-onauth", "onTelegramAuth(user)")
    script.setAttribute("data-request-access", "write")
    script.async = true
    tgRef.current.appendChild(script)

    return () => {
      if (tgRef.current) tgRef.current.innerHTML = ""
    }
  }, [])

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo + Title */}
        <div className="space-y-3 text-center">
          <img src="/logo.svg" alt="FinWise" className="mx-auto h-14 w-auto" />
          <h1 className="font-heading text-2xl font-bold">Masuk ke FinWise</h1>
          <p className="text-sm text-muted-foreground">
            Kelola keuanganmu dengan lebih pintar 💰
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-center text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Google Login */}
        <button
          onClick={() => {
            setLoading("google")
            signIn("google", { callbackUrl: "/" })
          }}
          disabled={loading !== null}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-sm font-medium shadow-sm transition hover:bg-muted active:scale-[0.98] disabled:opacity-50"
        >
          {loading === "google" ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <svg className="size-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
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
        <div className="flex justify-center" id="telegram-login" ref={tgRef} />

        {/* Info */}
        <p className="text-center text-xs text-muted-foreground">
          Data kamu aman & tersimpan lokal di perangkat 🔒
        </p>
      </div>
    </div>
  )
}
