"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Mic, Loader2, Check, X, Square, Keyboard } from "lucide-react"
import { formatIDR } from "@/lib/finwise"

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
  const [manualText, setManualText] = useState("")
  const [inputMode, setInputMode] = useState<"voice" | "text">("text")
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recognitionRef = useRef<any>(null)
  const [webSpeechSupported, setWebSpeechSupported] = useState(false)
  const [interimText, setInterimText] = useState("")

  // Check Web Speech API support
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    setWebSpeechSupported(!!SR)
    // Default to voice on mobile if supported, text on desktop
    if (SR && /Mobi|Android|iPhone/i.test(navigator.userAgent)) {
      setInputMode("voice")
    }
  }, [])

  // ─── WEB SPEECH API (realtime, free, no server) ───
  const startWebSpeech = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { setError("Browser tidak mendukung speech recognition"); setStatus("error"); return }

    setError("")
    setTranscript("")
    setParsed(null)
    setInterimText("")
    setRecordingTime(0)

    const recognition = new SR()
    recognition.lang = "id-ID"
    recognition.continuous = false
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    recognitionRef.current = recognition

    let sec = 0
    timerRef.current = setInterval(() => {
      sec++
      setRecordingTime(sec)
      if (sec >= 60) recognition.stop()
    }, 1000)

    recognition.onresult = (event: any) => {
      let interim = ""
      let final = ""
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) final += t
        else interim += t
      }
      if (interim) setInterimText(interim)
      if (final) {
        setTranscript(final)
        setInterimText("")
      }
    }

    recognition.onerror = (event: any) => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      setStatus("error")
      if (event.error === "not-allowed") {
        setError("Izin microphone ditolak. Klik 🔒 di address bar → Microphone → Allow.")
      } else if (event.error === "no-speech") {
        setError("Tidak ada suara terdeteksi. Coba bicara lebih dekat ke mic.")
      } else {
        setError(`Error: ${event.error}`)
      }
    }

    recognition.onend = () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      const finalText = transcript || recognitionRef.current?._lastResult || ""
      // If we got text, parse it
      if (transcript) {
        setStatus("processing")
        doParse(transcript)
      } else if (status === "recording") {
        setError("Tidak ada kata terdeteksi. Coba bicara lebih jelas.")
        setStatus("error")
      }
    }

    recognition.start()
    setStatus("recording")
  }, [transcript, status])

  const stopWebSpeech = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    if (recognitionRef.current) {
      // Save current transcript before stopping
      recognitionRef.current._lastResult = transcript
      recognitionRef.current.stop()
    }
  }, [transcript])

  // ─── MEDIA RECORDER FALLBACK (server transcription) ───
  const startRecording = useCallback(async () => {
    setError("")
    setTranscript("")
    setParsed(null)
    setRecordingTime(0)
    chunksRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true }
      })
      streamRef.current = stream

      let mimeType = ""
      for (const fmt of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg", ""]) {
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
        if (chunksRef.current.length === 0) { setError("Tidak ada audio terekam"); setStatus("error"); return }
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" })
        await transcribeAudio(blob)
      }

      recorder.onerror = () => {
        setError("Gagal merekam audio")
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
      if (err.name === "NotAllowedError") {
        setError("Izin microphone ditolak. Klik 🔒 di address bar → Microphone → Allow, lalu refresh halaman.")
      } else if (err.name === "NotFoundError") {
        setError("Microphone tidak ditemukan di device ini.")
      } else if (err.name === "NotReadableError") {
        setError("Microphone sedang dipakai app lain. Tutup WhatsApp/Zoom dulu.")
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
        throw new Error(data.error || `Server error ${res.status}`)
      }
      const data = await res.json()
      if (!data.text?.trim()) {
        setError("Tidak ada kata terdeteksi. Coba bicara lebih jelas & dekat mic.")
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
        setError(data.error || "Gagal memahami transaksi")
        setStatus("error")
      }
    } catch {
      setError("Gagal memproses transaksi")
      setStatus("error")
    }
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = manualText.trim()
    if (!text) return
    setTranscript(text)
    setParsed(null)
    setStatus("processing")
    doParse(text)
  }

  function formatTime(s: number) { return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}` }
  function formatCurrency(n: number) { return formatIDR(n) }

  function reset() {
    setStatus("idle"); setError(""); setTranscript(""); setParsed(null)
    setRecordingTime(0); setManualText(""); setInterimText("")
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    if (recognitionRef.current) { try { recognitionRef.current.stop() } catch {} }
  }

  const startVoice = webSpeechSupported ? startWebSpeech : startRecording
  const stopVoice = webSpeechSupported ? stopWebSpeech : stopRecording

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex rounded-xl bg-muted p-1 gap-1">
        <button
          onClick={() => { reset(); setInputMode("text") }}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition ${
            inputMode === "text" ? "bg-primary text-white shadow-sm" : "text-muted-foreground"
          }`}
        >
          <Keyboard className="size-4" /> Ketik
        </button>
        <button
          onClick={() => { reset(); setInputMode("voice") }}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition ${
            inputMode === "voice" ? "bg-primary text-white shadow-sm" : "text-muted-foreground"
          }`}
        >
          <Mic className="size-4" /> Suara
        </button>
      </div>

      {/* ─── TEXT INPUT MODE ─── */}
      {inputMode === "text" && (
        <div className="space-y-3">
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder='ketik: beli kopi 25rb, terima gaji 5jt'
              className="flex-1 px-4 py-3 rounded-xl bg-primary/10 border border-primary/30 text-sm placeholder:text-primary/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
              disabled={status === "processing"}
            />
            <button
              type="submit"
              disabled={!manualText.trim() || status === "processing"}
              className="px-4 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50 active:scale-95"
            >
              {status === "processing" ? <Loader2 className="size-4 animate-spin" /> : "→"}
            </button>
          </form>

          {/* Quick examples */}
          {status === "idle" && (
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-2">
              <p className="text-xs text-primary font-semibold">💡 Contoh:</p>
              <div className="grid grid-cols-2 gap-1.5">
                {['"Beli batagor 5 ribu"', '"Makan siang 25rb"', '"Terima gaji 5 juta"', '"Grab ke kantor 15rb"'].map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => { setManualText(ex.replace(/"/g, '')); }}
                    className="text-left text-[11px] text-primary/70 hover:text-primary transition px-2 py-1.5 rounded-lg hover:bg-primary/10"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── VOICE INPUT MODE ─── */}
      {inputMode === "voice" && (
        <div className="space-y-4">
          {/* Mic Button */}
          <div className="flex flex-col items-center gap-3">
            {(status === "idle" || status === "error") && (
              <button
                onClick={startVoice}
                className="relative size-20 rounded-full flex items-center justify-center bg-primary/20 border-2 border-primary hover:bg-primary/30 active:scale-95 transition"
              >
                <Mic className="size-8 text-primary" />
              </button>
            )}

            {status === "recording" && (
              <button
                onClick={stopVoice}
                className="relative size-20 rounded-full flex items-center justify-center bg-red-500/20 border-2 border-red-500 animate-pulse active:scale-95 transition"
              >
                <Square className="size-6 text-red-400 fill-red-400" />
              </button>
            )}

            {status === "processing" && (
              <div className="relative size-20 rounded-full flex items-center justify-center bg-primary/20 border-2 border-primary">
                <Loader2 className="size-8 text-primary animate-spin" />
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center">
              {status === "idle" && (webSpeechSupported ? "Klik mic untuk mulai bicara" : "Klik mic untuk mulai merekam")}
              {status === "recording" && <span className="text-red-400 font-semibold">🔴 Merekam {formatTime(recordingTime)} — klik untuk stop</span>}
              {status === "processing" && "⏳ Memproses..."}
              {status === "error" && <button onClick={reset} className="text-primary underline underline-offset-2">Coba lagi</button>}
            </p>

            {webSpeechSupported && (
              <p className="text-[10px] text-muted-foreground/50">Web Speech API • Bahasa Indonesia</p>
            )}
          </div>

          {/* Interim text (realtime speech recognition) */}
          {interimText && status === "recording" && (
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-3">
              <p className="text-xs text-primary/50 mb-1">Mendengarkan...</p>
              <p className="text-sm text-primary/80 italic">{interimText}</p>
            </div>
          )}
        </div>
      )}

      {/* ─── SHARED: Transcript ─── */}
      {transcript && (
        <div className="rounded-xl bg-muted p-3">
          <p className="text-xs text-muted-foreground mb-1">Kamu bilang:</p>
          <p className="text-sm font-medium">&ldquo;{transcript}&rdquo;</p>
        </div>
      )}

      {/* ─── SHARED: Error ─── */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 space-y-2">
          <p className="text-sm text-red-400">{error}</p>
          {error.includes("ditolak") && (
            <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-1">
              <li>Klik <strong>🔒</strong> di address bar</li>
              <li>Cari <strong>Microphone</strong> → <strong>Allow</strong></li>
              <li>Refresh halaman</li>
            </ol>
          )}
          <button onClick={reset} className="w-full px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/30 transition">
            Coba Lagi
          </button>
        </div>
      )}

      {/* ─── SHARED: Parsed Result ─── */}
      {parsed && status === "result" && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <p className="text-xs text-primary font-semibold">Hasil Parsing:</p>
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
            <button onClick={() => { onResult(parsed); reset() }} className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700">
              <Check className="size-4" /> Catat
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
