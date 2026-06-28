"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Mic, MicOff, Loader2, Check, X, Square, Keyboard } from "lucide-react"

interface VoiceInputProps {
  onResult: (parsed: {
    type: "income" | "expense"
    amount: number
    category: string
    note: string
  }) => void
}

type Status = "idle" | "requesting" | "recording" | "processing" | "result" | "error"

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
  const [recordingTime, setRecordingTime] = useState(0)
  const [micAvailable, setMicAvailable] = useState<boolean | null>(null)
  const [manualText, setManualText] = useState("")
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Check mic availability on mount
  useEffect(() => {
    async function checkMic() {
      try {
        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
          setMicAvailable(false)
          return
        }
        // Try to check permission state
        if (navigator.permissions) {
          const result = await navigator.permissions.query({ name: "microphone" as PermissionName })
          setMicAvailable(result.state !== "denied")
          result.onchange = () => setMicAvailable(result.state !== "denied")
        } else {
          setMicAvailable(true)
        }
      } catch {
        setMicAvailable(true) // Assume available, will fail gracefully
      }
    }
    checkMic()
  }, [])

  const startRecording = useCallback(async () => {
    setError("")
    setTranscript("")
    setParsed(null)
    setRecordingTime(0)
    chunksRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      let mimeType = ""
      for (const fmt of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", ""]) {
        if (!fmt || MediaRecorder.isTypeSupported(fmt)) { mimeType = fmt; break }
      }

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        streamRef.current = null
        if (chunksRef.current.length === 0) { setError("Tidak ada audio"); setStatus("error"); return }
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" })
        await transcribeAudio(blob)
      }

      recorder.onerror = () => {
        setError("Gagal merekam")
        setStatus("error")
        stream.getTracks().forEach(t => t.stop())
      }

      recorder.start(250)
      setStatus("recording")

      let sec = 0
      timerRef.current = setInterval(() => {
        sec++
        setRecordingTime(sec)
        if (sec >= 60) stopRecording()
      }, 1000)

    } catch (err: any) {
      console.error("[voice] Error:", err.name, err.message)
      setMicAvailable(false)
      
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setError("mic-denied")
      } else if (err.name === "NotFoundError") {
        setError("Microphone tidak ditemukan")
      } else if (err.name === "NotReadableError") {
        setError("Microphone sedang dipakai app lain (WhatsApp, Zoom, dll)")
      } else {
        setError(`Error: ${err.message || err.name}`)
      }
      setStatus("error")
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop()
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
        setError("Tidak ada kata terdeteksi. Coba bicara lebih jelas.")
        setStatus("error")
        return
      }
      setTranscript(data.text)
      await doParse(data.text)
    } catch (err: any) {
      setError(err.message || "Gagal memproses audio")
      setStatus("error")
    }
  }

  async function doParse(text: string) {
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
        setError(data.error || "Gagal memahami")
        setStatus("error")
      }
    } catch {
      setError("Gagal memproses")
      setStatus("error")
    }
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = manualText.trim()
    if (!text) return
    setTranscript(text)
    setParsed(null)
    doParse(text)
  }

  function formatTime(s: number) { return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}` }
  function formatCurrency(n: number) { return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n) }
  function reset() { setStatus("idle"); setError(""); setTranscript(""); setParsed(null); setRecordingTime(0); setManualText("") }

  return (
    <div className="space-y-4">
      {/* ─── Text Input (ALWAYS VISIBLE) ─── */}
      <form onSubmit={handleManualSubmit} className="flex gap-2">
        <input
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
          placeholder="contoh: beli kopi 25rb"
          className="flex-1 px-4 py-3 rounded-xl bg-muted border border-border text-sm placeholder:text-muted-foreground/50 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition"
          disabled={status === "processing" || status === "recording"}
        />
        <button
          type="submit"
          disabled={!manualText.trim() || status === "processing" || status === "recording"}
          className="px-4 py-3 rounded-xl bg-teal-500 text-white text-sm font-semibold hover:bg-teal-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Keyboard className="size-4" />
        </button>
      </form>

      {/* ─── Divider ─── */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-[10px] text-muted-foreground">ATAU PAKAI SUARA</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* ─── Voice Button ─── */}
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
          <button onClick={stopRecording} className="relative size-20 rounded-full flex items-center justify-center bg-red-500/20 border-2 border-red-500 animate-pulse active:scale-95">
            <Square className="size-6 text-red-400 fill-red-400" />
          </button>
        )}

        {status === "processing" && (
          <div className="relative size-20 rounded-full flex items-center justify-center bg-teal-500/20 border-2 border-teal-500">
            <Loader2 className="size-8 text-teal-400 animate-spin" />
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          {status === "idle" && "Klik mic untuk bicara"}
          {status === "requesting" && <span className="text-amber-400">Meminta izin mic...</span>}
          {status === "recording" && <span className="text-red-400 font-semibold">🔴 {formatTime(recordingTime)} — klik untuk stop</span>}
          {status === "processing" && "⏳ Memproses..."}
          {status === "result" && "✅ Selesai!"}
          {status === "error" && <button onClick={reset} className="text-teal-400 underline">Coba lagi</button>}
        </p>
      </div>

      {/* ─── Transcript ─── */}
      {transcript && (
        <div className="rounded-xl bg-muted p-3">
          <p className="text-xs text-muted-foreground mb-1">Kamu bilang:</p>
          <p className="text-sm font-medium">&ldquo;{transcript}&rdquo;</p>
        </div>
      )}

      {/* ─── Error ─── */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 space-y-2">
          {error === "mic-denied" ? (
            <>
              <p className="font-semibold">🎤 Izin Microphone Ditolak</p>
              <p className="text-xs text-muted-foreground">Coba langkah ini:</p>
              <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-1">
                <li>Buka <strong>Settings HP</strong> → <strong>Apps</strong> → <strong>Chrome</strong></li>
                <li>Klik <strong>Permissions</strong> → <strong>Microphone</strong></li>
                <li>Pilih <strong>&quot;Allow&quot;</strong></li>
                <li>Kembali ke sini & refresh</li>
              </ol>
              <button onClick={() => window.location.reload()} className="w-full mt-2 px-4 py-2.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/30 transition">
                🔄 Refresh Halaman
              </button>
            </>
          ) : (
            <p>{error}</p>
          )}
        </div>
      )}

      {/* ─── Parsed Result ─���─ */}
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

      {/* ─── Tips ─── */}
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
    </div>
  )
}
