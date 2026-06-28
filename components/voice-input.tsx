"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Mic, MicOff, Loader2, Check, X, Square, AlertTriangle, Shield, Info } from "lucide-react"

interface VoiceInputProps {
  onResult: (parsed: {
    type: "income" | "expense"
    amount: number
    category: string
    note: string
  }) => void
}

type Status = "idle" | "requesting" | "recording" | "processing" | "result" | "error"

function detectBrowser(): string {
  if (typeof navigator === "undefined") return "unknown"
  const ua = navigator.userAgent.toLowerCase()
  // Check Brave specifically
  const isBrave = (navigator as any).brave !== undefined || ua.includes("brave")
  if (isBrave) return "brave"
  if (ua.includes("edg/") || ua.includes("edge")) return "edge"
  if (ua.includes("opr/") || ua.includes("opera")) return "opera"
  if (ua.includes("chrome") && !ua.includes("edg")) return "chrome"
  if (ua.includes("firefox")) return "firefox"
  if (ua.includes("safari") && !ua.includes("chrome")) return "safari"
  // Check Telegram in-app
  if (ua.includes("telegram") || ua.includes("tg")) return "telegram"
  // Check other in-app browsers
  if (ua.includes("wv") || ua.includes("webview")) return "webview"
  return "unknown"
}

function isSecureContext(): boolean {
  if (typeof window === "undefined") return false
  return window.isSecureContext || location.hostname === "localhost"
}

export default function VoiceInput({ onResult }: VoiceInputProps) {
  const [status, setStatus] = useState<Status>("idle")
  const [transcript, setTranscript] = useState("")
  const [parsed, setParsed] = useState<{
    type: "income" | "expense"
    amount: number
    category: string
    note: string
  } | null>(null)
  const [error, setError] = useState("")
  const [errorDetail, setErrorDetail] = useState("")
  const [recordingTime, setRecordingTime] = useState(0)
  const [browserName, setBrowserName] = useState("unknown")
  const [permissionState, setPermissionState] = useState<string>("unknown")
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    const browser = detectBrowser()
    setBrowserName(browser)
    
    // Pre-check permission state
    if (navigator.permissions) {
      navigator.permissions.query({ name: "microphone" as PermissionName }).then(result => {
        setPermissionState(result.state)
        result.onchange = () => setPermissionState(result.state)
      }).catch(() => {
        setPermissionState("prompt")
      })
    }
  }, [])

  const startRecording = useCallback(async () => {
    setError("")
    setErrorDetail("")
    setTranscript("")
    setParsed(null)
    setRecordingTime(0)
    chunksRef.current = []

    // Pre-flight checks
    const browser = detectBrowser()
    
    // Check 1: Telegram/webview
    if (browser === "telegram" || browser === "webview") {
      setError("Browser tidak support microphone")
      setErrorDetail("telegram")
      setStatus("error")
      return
    }

    // Check 2: Secure context
    if (!isSecureContext()) {
      setError("Butuh HTTPS untuk microphone")
      setErrorDetail("https")
      setStatus("error")
      return
    }

    // Check 3: getUserMedia support
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
      setError("Browser tidak support microphone")
      setErrorDetail("no-gum")
      setStatus("error")
      return
    }

    // Check 4: MediaRecorder support
    if (typeof MediaRecorder === "undefined") {
      setError("Browser tidak support perekaman audio")
      setErrorDetail("no-mr")
      setStatus("error")
      return
    }

    setStatus("requesting")

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        }
      })
      streamRef.current = stream
      setPermissionState("granted")

      // Choose best supported format
      const formats = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
        "audio/ogg",
      ]
      let mimeType = ""
      for (const fmt of formats) {
        if (MediaRecorder.isTypeSupported(fmt)) {
          mimeType = fmt
          break
        }
      }

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        streamRef.current = null
        
        if (chunksRef.current.length === 0) {
          setError("Tidak ada audio terekam")
          setStatus("error")
          return
        }

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" })
        
        if (blob.size > 25 * 1024 * 1024) {
          setError("Audio terlalu besar (max 25MB)")
          setStatus("error")
          return
        }

        await transcribeAudio(blob)
      }

      recorder.onerror = () => {
        setError("Gagal merekam audio")
        setStatus("error")
        stream.getTracks().forEach(t => t.stop())
      }

      recorder.start(250)
      setStatus("recording")

      let seconds = 0
      timerRef.current = setInterval(() => {
        seconds++
        setRecordingTime(seconds)
        if (seconds >= 60) stopRecording()
      }, 1000)

    } catch (err: any) {
      console.error("[voice] getUserMedia error:", err.name, err.message)
      
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setPermissionState("denied")
        setError("Izin microphone ditolak")
        setErrorDetail(browser === "brave" ? "brave-denied" : "denied")
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setError("Microphone tidak ditemukan di device ini")
        setErrorDetail("not-found")
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        setError("Microphone sedang dipakai app lain")
        setErrorDetail("in-use")
      } else if (err.name === "OverconstrainedError") {
        setError("Constraint microphone tidak bisa dipenuhi")
        setErrorDetail("constraint")
      } else if (err.name === "SecurityError") {
        setError("Diblokir oleh keamanan browser")
        setErrorDetail(browser === "brave" ? "brave-shield" : "security")
      } else {
        setError(`Error: ${err.message || err.name}`)
        setErrorDetail("unknown")
      }
      setStatus("error")
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop()
    }
    setStatus("processing")
  }, [])

  async function transcribeAudio(audioBlob: Blob) {
    setStatus("processing")
    try {
      const formData = new FormData()
      formData.append("audio", audioBlob, `voice-${Date.now()}.webm`)

      const res = await fetch("/api/ai/voice-transcribe", { method: "POST", body: formData })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Server error (${res.status})`)
      }

      const data = await res.json()
      if (!data.text?.trim()) {
        setError("Tidak ada kata terdeteksi. Coba bicara lebih jelas & dekat mic.")
        setStatus("error")
        return
      }

      setTranscript(data.text)
      await parseTransaction(data.text)
    } catch (err: any) {
      setError(err.message || "Gagal memproses audio")
      setStatus("error")
    }
  }

  async function parseTransaction(text: string) {
    try {
      const res = await fetch("/api/ai/voice-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      if (data.ok && data.parsed) {
        setParsed(data.parsed)
        setStatus("result")
      } else {
        setError(data.error || "Gagal memahami transaksi")
        setStatus("error")
      }
    } catch {
      setError("Gagal memproses transaksi")
      setStatus("error")
    }
  }

  function formatTime(s: number) {
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`
  }

  function formatCurrency(n: number) {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)
  }

  function reset() {
    setStatus("idle")
    setError("")
    setErrorDetail("")
    setTranscript("")
    setParsed(null)
    setRecordingTime(0)
  }

  // ─── RENDER HELPERS ───

  function renderErrorBox() {
    if (!error) return null

    const browser = browserName

    // Brave specific
    if (errorDetail === "brave-denied" || errorDetail === "brave-shield") {
      return (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-amber-500" />
            <p className="text-sm font-semibold text-amber-500">Brave Browser Memblokir Microphone</p>
          </div>
          <p className="text-xs text-muted-foreground">Brave punya fitur &quot;Shields&quot; yang blokir mic secara default. Cara fix:</p>
          <ol className="text-xs text-foreground/80 list-decimal list-inside space-y-1.5">
            <li>Lihat address bar — ada <strong>icon 🦁 singa</strong> di sebelah URL</li>
            <li>Klik icon singa tersebut</li>
            <li>Matikan <strong>&quot;Shields&quot;</strong> untuk site ini (toggle OFF)</li>
            <li>Atau: ubah &quot;Device Recognition&quot; ke <strong>Allow</strong></li>
            <li>Refresh halaman & coba lagi</li>
          </ol>
          <div className="flex gap-2">
            <button onClick={() => window.location.reload()} className="flex-1 px-4 py-2.5 rounded-lg bg-amber-500/20 text-amber-500 text-xs font-semibold hover:bg-amber-500/30 transition">
              🔄 Refresh
            </button>
            <a href="https://brave.com/shields/" target="_blank" rel="noopener" className="flex-1 px-4 py-2.5 rounded-lg bg-amber-500/20 text-amber-500 text-xs font-semibold hover:bg-amber-500/30 transition text-center">
              ℹ️ Pelajari
            </a>
          </div>
        </div>
      )
    }

    // Standard denied
    if (errorDetail === "denied") {
      return (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 space-y-3">
          <p className="text-sm font-semibold text-red-400">🎤 Izin Microphone Ditolak</p>
          <p className="text-xs text-muted-foreground">Browser blokir akses microphone. Cara fix:</p>
          <ol className="text-xs text-foreground/80 list-decimal list-inside space-y-1.5">
            <li>Klik <strong>🔒 atau ⓘ</strong> di address bar (atas)</li>
            <li>Cari <strong>&quot;Microphone&quot;</strong></li>
            <li>Ganti ke <strong>&quot;Allow&quot;</strong></li>
            <li>Refresh halaman ini</li>
          </ol>
          <button onClick={() => window.location.reload()} className="w-full px-4 py-2.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/30 transition">
            🔄 Refresh Halaman
          </button>
        </div>
      )
    }

    // Telegram/webview
    if (errorDetail === "telegram") {
      return (
        <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-3 space-y-3">
          <p className="text-sm font-semibold text-purple-400">📱 Buka di Browser</p>
          <p className="text-xs text-muted-foreground">Voice input gak bisa dipakai di dalam Telegram/app lain.</p>
          <ol className="text-xs text-foreground/80 list-decimal list-inside space-y-1.5">
            <li>Klik <strong>⋮</strong> (3 titik) di pojok kanan atas</li>
            <li>Pilih <strong>&quot;Open in Chrome&quot;</strong> atau <strong>&quot;Buka di Browser&quot;</strong></li>
            <li>Login ulang kalau diminta</li>
            <li>Coba voice input lagi</li>
          </ol>
        </div>
      )
    }

    // Microphone in use
    if (errorDetail === "in-use") {
      return (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 space-y-2">
          <p className="text-sm font-semibold text-amber-400">🎙️ Microphone Sedang Dipakai</p>
          <p className="text-xs text-muted-foreground">App lain (WhatsApp, Zoom, dll) sedang pakai microphone. Tutup dulu app tersebut, lalu coba lagi.</p>
        </div>
      )
    }

    // Not found
    if (errorDetail === "not-found") {
      return (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 space-y-2">
          <p className="text-sm font-semibold text-red-400">🎤 Microphone Tidak Ditemukan</p>
          <p className="text-xs text-muted-foreground">Device ini tidak punya microphone, atau mic tidak terdeteksi.</p>
        </div>
      )
    }

    // Generic error
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 space-y-2">
        <p className="text-sm font-semibold text-red-400">❌ {error}</p>
        <button onClick={reset} className="w-full px-4 py-2.5 rounded-lg bg-muted text-xs font-semibold hover:bg-muted/80 transition">
          Coba Lagi
        </button>
      </div>
    )
  }

  // ─── MAIN RENDER ───

  return (
    <div className="space-y-4">
      {/* Browser info badge */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
        <span>Browser: {browserName === "brave" ? "🦁 Brave" : browserName === "chrome" ? "🌐 Chrome" : browserName === "safari" ? "🧭 Safari" : browserName === "edge" ? "🔷 Edge" : browserName}</span>
        <span>Mic: {permissionState === "granted" ? "✅ Granted" : permissionState === "denied" ? "❌ Denied" : permissionState === "prompt" ? "⏳ Prompt" : "❓ Unknown"}</span>
      </div>

      {/* Voice Button */}
      <div className="flex flex-col items-center gap-3">
        {(status === "idle" || status === "error") && (
          <button
            onClick={startRecording}
            className="relative size-20 rounded-full flex items-center justify-center transition-all bg-teal-500/20 border-2 border-teal-500 hover:bg-teal-500/30 active:scale-95"
          >
            <Mic className="size-8 text-teal-400" />
          </button>
        )}

        {status === "requesting" && (
          <div className="relative size-20 rounded-full flex items-center justify-center bg-amber-500/20 border-2 border-amber-500 animate-pulse">
            <Loader2 className="size-8 text-amber-400 animate-spin" />
          </div>
        )}

        {status === "recording" && (
          <button
            onClick={stopRecording}
            className="relative size-20 rounded-full flex items-center justify-center transition-all bg-red-500/20 border-2 border-red-500 animate-pulse active:scale-95"
          >
            <Square className="size-6 text-red-400 fill-red-400" />
          </button>
        )}

        {status === "processing" && (
          <div className="relative size-20 rounded-full flex items-center justify-center bg-teal-500/20 border-2 border-teal-500">
            <Loader2 className="size-8 text-teal-400 animate-spin" />
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          {status === "idle" && "Klik untuk mulai bicara"}
          {status === "requesting" && (
            <span className="text-amber-400">Meminta izin microphone...</span>
          )}
          {status === "recording" && (
            <span className="text-red-400 font-semibold">🔴 Merekam {formatTime(recordingTime)} — klik untuk stop</span>
          )}
          {status === "processing" && "⏳ Memproses audio..."}
          {status === "result" && "✅ Selesai!"}
          {status === "error" && (
            <button onClick={reset} className="text-teal-400 underline underline-offset-2">Coba lagi</button>
          )}
        </p>
      </div>

      {/* Transcript */}
      {transcript && (
        <div className="rounded-xl bg-muted p-4">
          <p className="text-xs text-muted-foreground mb-1">Kamu bilang:</p>
          <p className="text-sm font-medium">&ldquo;{transcript}&rdquo;</p>
        </div>
      )}

      {/* Error box */}
      {renderErrorBox()}

      {/* Parsed Result */}
      {parsed && status === "result" && (
        <div className="rounded-xl border border-teal-500/30 bg-teal-500/5 p-4 space-y-3">
          <p className="text-xs text-teal-400 font-semibold">Hasil Parsing:</p>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">Tipe</span>
              <span className={`text-xs font-semibold ${parsed.type === "income" ? "text-green-400" : "text-red-400"}`}>
                {parsed.type === "income" ? "📈 Pemasukan" : "📉 Pengeluaran"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">Jumlah</span>
              <span className="text-sm font-bold">{formatCurrency(parsed.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">Kategori</span>
              <span className="text-xs font-medium">{parsed.category}</span>
            </div>
            {parsed.note && (
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Catatan</span>
                <span className="text-xs">{parsed.note}</span>
              </div>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={reset} className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground transition">
              <X className="size-4" /> Batal
            </button>
            <button onClick={() => { onResult(parsed); reset() }} className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-600">
              <Check className="size-4" /> Catat
            </button>
          </div>
        </div>
      )}

      {/* Tips */}
      {status === "idle" && (
        <div className="rounded-xl bg-muted p-4 space-y-2">
          <p className="text-xs text-muted-foreground font-semibold">💡 Contoh perintah:</p>
          <ul className="text-xs text-muted-foreground/70 space-y-1">
            <li>&ldquo;Beli batagor 5 ribu&rdquo;</li>
            <li>&ldquo;Makan siang 25rb&rdquo;</li>
            <li>&ldquo;Terima gaji 5 juta&rdquo;</li>
            <li>&ldquo;Grab ke kantor 15rb&rdquo;</li>
          </ul>
        </div>
      )}

      {/* Manual text fallback */}
      {status === "error" && (errorDetail === "brave-denied" || errorDetail === "brave-shield" || errorDetail === "denied") && (
        <div className="rounded-xl bg-muted p-4 space-y-2">
          <p className="text-xs text-muted-foreground font-semibold">⌨️ Atau ketik manual:</p>
          <form onSubmit={(e) => {
            e.preventDefault()
            const input = (e.target as HTMLFormElement).elements.namedItem("manualText") as HTMLInputElement
            if (input?.value.trim()) parseTransaction(input.value.trim())
          }} className="flex gap-2">
            <input name="manualText" placeholder="contoh: beli kopi 25rb" className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-sm" />
            <button type="submit" className="px-4 py-2 rounded-lg bg-teal-500 text-white text-sm font-semibold">
              Kirim
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
