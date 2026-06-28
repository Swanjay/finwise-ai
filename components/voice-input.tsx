"use client"

import { useState, useRef, useCallback } from "react"
import { Mic, MicOff, Loader2, Check, X, Square, AlertTriangle } from "lucide-react"

interface VoiceInputProps {
  onResult: (parsed: {
    type: "income" | "expense"
    amount: number
    category: string
    note: string
  }) => void
}

type Status = "idle" | "recording" | "processing" | "result" | "error"

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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Check if browser supports audio recording
  const canRecord = typeof navigator !== "undefined" && 
    navigator.mediaDevices && 
    typeof navigator.mediaDevices.getUserMedia === "function" &&
    typeof MediaRecorder !== "undefined"

  const startRecording = useCallback(async () => {
    setError("")
    setTranscript("")
    setParsed(null)
    setRecordingTime(0)
    chunksRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        }
      })
      streamRef.current = stream

      // Use webm/opus if available, otherwise fallback
      let mimeType = "audio/webm;codecs=opus"
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "audio/webm"
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "audio/mp4"
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "" // Let browser choose
      }

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        streamRef.current = null
        
        if (chunksRef.current.length === 0) {
          setError("Tidak ada audio terekam")
          setStatus("error")
          return
        }

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
        
        // Max 25MB
        if (blob.size > 25 * 1024 * 1024) {
          setError("Audio terlalu besar (max 25MB)")
          setStatus("error")
          return
        }

        await transcribeAudio(blob)
      }

      recorder.onerror = (e) => {
        console.error("[voice] Recorder error:", e)
        setError("Gagal merekam audio")
        setStatus("error")
        stream.getTracks().forEach(t => t.stop())
      }

      recorder.start(250) // Collect data every 250ms
      setStatus("recording")

      // Timer
      let seconds = 0
      timerRef.current = setInterval(() => {
        seconds++
        setRecordingTime(seconds)
        // Auto-stop after 60 seconds
        if (seconds >= 60) {
          stopRecording()
        }
      }, 1000)

    } catch (err: any) {
      console.error("[voice] getUserMedia error:", err)
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setError("mic-denied")
      } else if (err.name === "NotFoundError") {
        setError("Microphone tidak ditemukan. Pastikan device punya microphone.")
      } else if (err.name === "NotReadableError") {
        setError("Microphone sedang dipakai app lain. Tutup app yang pakai mic dulu.")
      } else {
        setError(`Gagal akses microphone: ${err.message}`)
      }
      setStatus("error")
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop()
    }
    setStatus("processing")
  }, [])

  async function transcribeAudio(audioBlob: Blob) {
    setStatus("processing")
    try {
      const formData = new FormData()
      formData.append("audio", audioBlob, `voice-${Date.now()}.webm`)

      const res = await fetch("/api/ai/voice-transcribe", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Server error (${res.status})`)
      }

      const data = await res.json()

      if (!data.text || data.text.trim().length === 0) {
        setError("Tidak ada kata terdeteksi. Coba bicara lebih jelas.")
        setStatus("error")
        return
      }

      setTranscript(data.text)
      await parseTransaction(data.text)

    } catch (err: any) {
      console.error("[voice] Transcribe error:", err)
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

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  function handleReset() {
    setStatus("idle")
    setError("")
    setTranscript("")
    setParsed(null)
    setRecordingTime(0)
  }

  return (
    <div className="space-y-4">
      {/* Voice Button */}
      <div className="flex flex-col items-center gap-3">
        {status === "idle" || status === "error" ? (
          <button
            onClick={startRecording}
            className="relative size-20 rounded-full flex items-center justify-center transition-all bg-teal-500/20 border-2 border-teal-500 hover:bg-teal-500/30 active:scale-95"
          >
            <Mic className="size-8 text-teal-400" />
          </button>
        ) : status === "recording" ? (
          <button
            onClick={stopRecording}
            className="relative size-20 rounded-full flex items-center justify-center transition-all bg-red-500/20 border-2 border-red-500 animate-pulse active:scale-95"
          >
            <Square className="size-6 text-red-400 fill-red-400" />
          </button>
        ) : status === "processing" ? (
          <div className="relative size-20 rounded-full flex items-center justify-center bg-teal-500/20 border-2 border-teal-500">
            <Loader2 className="size-8 text-teal-400 animate-spin" />
          </div>
        ) : null}

        <p className="text-xs text-muted-foreground text-center">
          {status === "idle" && "Klik untuk mulai bicara"}
          {status === "recording" && (
            <span className="text-red-400 font-semibold">
              🔴 Merekam... {formatTime(recordingTime)}
            </span>
          )}
          {status === "processing" && "⏳ Memproses audio..."}
          {status === "result" && "✅ Selesai!"}
          {status === "error" && (
            <button onClick={handleReset} className="text-teal-400 underline">
              Coba lagi
            </button>
          )}
        </p>
      </div>

      {/* Browser Support Warning */}
      {!canRecord && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400 flex items-start gap-2">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Browser tidak support</p>
            <p className="text-xs text-muted-foreground mt-1">
              Gunakan Chrome, Edge, atau Safari untuk voice input.
            </p>
          </div>
        </div>
      )}

      {/* Transcript */}
      {transcript && (
        <div className="rounded-xl bg-muted p-4">
          <p className="text-xs text-muted-foreground mb-1">Kamu bilang:</p>
          <p className="text-sm font-medium">&ldquo;{transcript}&rdquo;</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 space-y-2">
          {error === "mic-denied" ? (
            <>
              <p className="font-semibold">🎤 Izin Microphone Ditolak</p>
              <p className="text-xs text-muted-foreground">Untuk voice input, izinkan akses microphone:</p>
              <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-1">
                <li>Klik 🔒 atau ⓘ di address bar (atas)</li>
                <li>Cari &quot;Microphone&quot;</li>
                <li>Ganti ke &quot;Allow&quot;</li>
                <li>Refresh halaman ini</li>
              </ol>
              <button 
                onClick={() => window.location.reload()} 
                className="w-full mt-2 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/30 transition"
              >
                🔄 Refresh Halaman
              </button>
            </>
          ) : (
            <>
              <p className="font-semibold">❌ Error</p>
              <p className="text-xs">{error}</p>
              <button 
                onClick={handleReset} 
                className="w-full mt-2 px-4 py-2 rounded-lg bg-muted text-xs font-semibold hover:bg-muted/80 transition"
              >
                Coba Lagi
              </button>
            </>
          )}
        </div>
      )}

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
            <button onClick={handleReset} className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground transition">
              <X className="size-4" /> Batal
            </button>
            <button onClick={() => { onResult(parsed); handleReset() }} className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-600">
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
    </div>
  )
}
