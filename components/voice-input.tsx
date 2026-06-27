"use client"

import { useState, useRef, useEffect } from "react"
import { Mic, MicOff, Loader2, Check, X } from "lucide-react"

// Speech Recognition types
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList
}
interface SpeechRecognitionResultList {
  length: number
  [index: number]: SpeechRecognitionResult
}
interface SpeechRecognitionResult {
  isFinal: boolean
  [index: number]: SpeechRecognitionAlternative
}
interface SpeechRecognitionAlternative {
  transcript: string
}
interface SpeechRecognitionErrorEvent {
  error: string
}
interface SpeechRecognitionInstance {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}
interface SpeechRecognitionConstructor {
  new(): SpeechRecognitionInstance
}
declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

interface VoiceInputProps {
  onResult: (parsed: {
    type: "income" | "expense"
    amount: number
    category: string
    note: string
  }) => void
  onError?: (error: string) => void
}

export default function VoiceInput({ onResult, onError }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [parsing, setParsing] = useState(false)
  const [parsed, setParsed] = useState<{
    type: "income" | "expense"
    amount: number
    category: string
    note: string
  } | null>(null)
  const [error, setError] = useState("")
  
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError("Browser tidak support speech recognition. Gunakan Chrome.")
      return
    }

    // Proactively check microphone permission
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'microphone' as PermissionName }).then((result) => {
        if (result.state === 'denied') {
          setError("izin-mic")
        }
      }).catch(() => {
        // permissions API not supported, will check on first use
      })
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = "id-ID"

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const current = event.results[event.results.length - 1]
      const text = current[0].transcript
      setTranscript(text)

      if (current.isFinal) {
        parseTransaction(text)
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("[voice] Error:", event.error)
      setIsListening(false)
      if (event.error === "not-allowed") {
        setError("izin-mic")
      } else {
        setError(`Error: ${event.error}`)
      }
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  async function parseTransaction(text: string) {
    setParsing(true)
    setError("")

    try {
      const res = await fetch("/api/ai/voice-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()

      if (data.ok && data.parsed) {
        setParsed(data.parsed)
      } else {
        setError(data.error || "Gagal parsing transaksi")
        onError?.(data.error || "Gagal parsing transaksi")
      }
    } catch {
      setError("Koneksi gagal")
      onError?.("Koneksi gagal")
    }
    setParsing(false)
  }

  function startListening() {
    if (!recognitionRef.current) return
    
    setError("")
    setTranscript("")
    setParsed(null)
    
    // First verify microphone access
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        // Mic access granted, stop the test stream
        stream.getTracks().forEach(t => t.stop())
        // Now start speech recognition
        try {
          recognitionRef.current!.start()
          setIsListening(true)
        } catch (err) {
          console.error("[voice] Start error:", err)
          setError("Gagal memulai voice recognition. Coba refresh halaman.")
        }
      })
      .catch((err) => {
        console.error("[voice] Mic access error:", err)
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError("izin-mic")
        } else if (err.name === 'NotFoundError') {
          setError("Microphone tidak ditemukan di device ini.")
        } else {
          setError(`Error microphone: ${err.message}`)
        }
      })
  }

  function stopListening() {
    if (!recognitionRef.current) return
    recognitionRef.current.stop()
    setIsListening(false)
  }

  function handleConfirm() {
    if (parsed) {
      onResult(parsed)
      setParsed(null)
      setTranscript("")
    }
  }

  function handleCancel() {
    setParsed(null)
    setTranscript("")
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="space-y-4">
      {/* Voice Button */}
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={isListening ? stopListening : startListening}
          disabled={parsing}
          className={`relative size-20 rounded-full flex items-center justify-center transition-all ${
            isListening
              ? "bg-red-500/20 border-2 border-red-500 animate-pulse"
              : "bg-teal-500/20 border-2 border-teal-500 hover:bg-teal-500/30"
          }`}
        >
          {parsing ? (
            <Loader2 className="size-8 text-teal-400 animate-spin" />
          ) : isListening ? (
            <MicOff className="size-8 text-red-400" />
          ) : (
            <Mic className="size-8 text-teal-400" />
          )}
        </button>
        
        <p className="text-xs text-gray-400 text-center">
          {isListening ? "Mendengarkan... Klik untuk berhenti" :
           parsing ? "Memproses..." :
           "Klik untuk mulai bicara"}
        </p>
      </div>

      {/* Transcript */}
      {transcript && (
        <div className="rounded-xl bg-muted p-4">
          <p className="text-xs text-gray-400 mb-1">Yang kamu bilang:</p>
          <p className="text-sm text-white">&ldquo;{transcript}&rdquo;</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 space-y-2">
          {error === "izin-mic" ? (
            <>
              <p className="font-semibold">🎤 Izin Microphone Ditolak</p>
              <p className="text-xs text-gray-400">Untuk menggunakan voice input, kamu perlu izinkan akses microphone:</p>
              <ol className="text-xs text-gray-400 list-decimal list-inside space-y-1">
                <li>Klik icon 🔒 atau ⓘ di address bar (atas)</li>
                <li>Cari &quot;Microphone&quot;</li>
                <li>Ganti ke &quot;Allow&quot;</li>
                <li>Refresh halaman ini</li>
              </ol>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 w-full rounded-lg bg-red-500/20 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/30 transition"
              >
                🔄 Refresh Halaman
              </button>
            </>
          ) : (
            <p>{error}</p>
          )}
        </div>
      )}

      {/* Parsed Result */}
      {parsed && (
        <div className="rounded-xl border border-teal-500/30 bg-teal-500/5 p-4 space-y-3">
          <p className="text-xs text-teal-400 font-semibold">Hasil Parsing:</p>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-gray-400">Tipe</span>
              <span className={`text-xs font-semibold ${
                parsed.type === "income" ? "text-green-400" : "text-red-400"
              }`}>
                {parsed.type === "income" ? "📈 Pemasukan" : "📉 Pengeluaran"}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-xs text-gray-400">Amount</span>
              <span className="text-sm font-bold text-white">{formatCurrency(parsed.amount)}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-xs text-gray-400">Kategori</span>
              <span className="text-xs text-white">{parsed.category}</span>
            </div>
            
            {parsed.note && (
              <div className="flex justify-between">
                <span className="text-xs text-gray-400">Catatan</span>
                <span className="text-xs text-gray-300">{parsed.note}</span>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleCancel}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm text-gray-400 hover:text-white transition"
            >
              <X className="size-4" />
              Batal
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-600"
            >
              <Check className="size-4" />
              Konfirmasi
            </button>
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="rounded-xl bg-muted p-4 space-y-2">
        <p className="text-xs text-gray-400 font-semibold">💡 Contoh perintah:</p>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>&ldquo;Beli batagor 5 ribu&rdquo;</li>
          <li>&ldquo;Makan siang 25rb&rdquo;</li>
          <li>&ldquo;Terima gaji 5 juta&rdquo;</li>
          <li>&ldquo;Grab ke kantor 15rb&rdquo;</li>
          <li>&ldquo;Bayar listrik 200 ribu&rdquo;</li>
        </ul>
      </div>

      {/* Debug Info */}
      <details className="rounded-xl bg-muted p-4">
        <summary className="text-xs text-gray-400 font-semibold cursor-pointer">🔧 Debug Info</summary>
        <div className="mt-2 space-y-1 text-xs text-gray-500">
          <p>Browser: {typeof window !== 'undefined' ? navigator.userAgent.split(' ').slice(-2).join(' ') : 'N/A'}</p>
          <p>SpeechRecognition: {typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition) ? '✅ Supported' : '❌ Not supported'}</p>
          <p>getUserMedia: {typeof window !== 'undefined' && navigator.mediaDevices ? '✅ Supported' : '❌ Not supported'}</p>
          <p>HTTPS: {typeof window !== 'undefined' && window.location.protocol === 'https:' ? '✅ Yes' : '❌ No (required for mic)'}</p>
        </div>
      </details>
    </div>
  )
}
