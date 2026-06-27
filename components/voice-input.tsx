"use client"

import { useState, useRef } from "react"
import { Mic, MicOff, Loader2, Check, X } from "lucide-react"

interface VoiceInputProps {
  onResult: (parsed: {
    type: "income" | "expense"
    amount: number
    category: string
    note: string
  }) => void
}

export default function VoiceInput({ onResult }: VoiceInputProps) {
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
  const [debugLog, setDebugLog] = useState<string[]>([])
  const recognitionRef = useRef<any>(null)

  function log(msg: string) {
    console.log("[voice]", msg)
    setDebugLog(prev => [...prev, msg])
  }

  async function startListening() {
    setError("")
    setTranscript("")
    setParsed(null)
    setDebugLog([])

    log("🎤 Starting voice input...")

    // Step 1: Check basic support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      log("❌ getUserMedia not available")
      setError("Browser doesn't support microphone access. Use Chrome or Edge.")
      return
    }
    log("✅ getUserMedia available")

    // Step 2: Request microphone
    log("📞 Requesting microphone permission...")
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      log("✅ Microphone access granted!")
    } catch (err: any) {
      log(`❌ Microphone error: ${err.name} - ${err.message}`)
      if (err.name === "NotAllowedError") {
        setError("mic-denied")
      } else if (err.name === "NotFoundError") {
        setError("No microphone found. Please connect a microphone.")
      } else {
        setError(`Microphone error: ${err.message}`)
      }
      return
    }

    // Step 3: Check SpeechRecognition
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) {
      log("❌ SpeechRecognition not available")
      stream.getTracks().forEach(t => t.stop())
      setError("Speech recognition not supported. Use Chrome browser.")
      return
    }
    log("✅ SpeechRecognition available")

    // Step 4: Start recognition
    try {
      const recognition = new SR()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = "id-ID"

      recognition.onresult = (event: any) => {
        const text = event.results[event.results.length - 1][0].transcript
        setTranscript(text)
        if (event.results[event.results.length - 1].isFinal) {
          log(`✅ Final: "${text}"`)
          parseTransaction(text)
        }
      }

      recognition.onerror = (event: any) => {
        log(`❌ Recognition error: ${event.error}`)
        setIsListening(false)
        stream.getTracks().forEach(t => t.stop())
        if (event.error === "not-allowed") {
          setError("mic-denied")
        } else {
          setError(`Error: ${event.error}`)
        }
      }

      recognition.onend = () => {
        log("⏹️ Recognition ended")
        setIsListening(false)
        stream.getTracks().forEach(t => t.stop())
      }

      recognitionRef.current = recognition
      recognition.start()
      setIsListening(true)
      log("✅ Listening started!")
    } catch (err: any) {
      log(`❌ Failed to start: ${err.message}`)
      stream.getTracks().forEach(t => t.stop())
      setError(`Failed to start: ${err.message}`)
    }
  }

  function stopListening() {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setIsListening(false)
  }

  async function parseTransaction(text: string) {
    setParsing(true)
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
        setError(data.error || "Failed to parse")
      }
    } catch {
      setError("Connection failed")
    }
    setParsing(false)
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
          {isListening ? "Listening... tap to stop" : parsing ? "Processing..." : "Tap to start speaking"}
        </p>
      </div>

      {/* Transcript */}
      {transcript && (
        <div className="rounded-xl bg-muted p-4">
          <p className="text-xs text-gray-400 mb-1">You said:</p>
          <p className="text-sm text-white">&ldquo;{transcript}&rdquo;</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 space-y-2">
          {error === "mic-denied" ? (
            <>
              <p className="font-semibold">🎤 Microphone Access Denied</p>
              <p className="text-xs text-gray-400">Please allow microphone access:</p>
              <ol className="text-xs text-gray-400 list-decimal list-inside space-y-1">
                <li>Click the 🔒 icon in the address bar</li>
                <li>Find &quot;Microphone&quot;</li>
                <li>Set to &quot;Allow&quot;</li>
                <li>Refresh this page</li>
              </ol>
            </>
          ) : (
            <p>{error}</p>
          )}
        </div>
      )}

      {/* Parsed Result */}
      {parsed && (
        <div className="rounded-xl border border-teal-500/30 bg-teal-500/5 p-4 space-y-3">
          <p className="text-xs text-teal-400 font-semibold">Parsed Result:</p>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-gray-400">Type</span>
              <span className={`text-xs font-semibold ${parsed.type === "income" ? "text-green-400" : "text-red-400"}`}>
                {parsed.type === "income" ? "📈 Income" : "📉 Expense"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-400">Amount</span>
              <span className="text-sm font-bold text-white">{formatCurrency(parsed.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-400">Category</span>
              <span className="text-xs text-white">{parsed.category}</span>
            </div>
            {parsed.note && (
              <div className="flex justify-between">
                <span className="text-xs text-gray-400">Note</span>
                <span className="text-xs text-gray-300">{parsed.note}</span>
              </div>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => { setParsed(null); setTranscript("") }} className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm text-gray-400 hover:text-white transition">
              <X className="size-4" /> Cancel
            </button>
            <button onClick={() => { onResult(parsed); setParsed(null); setTranscript("") }} className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-600">
              <Check className="size-4" /> Confirm
            </button>
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="rounded-xl bg-muted p-4 space-y-2">
        <p className="text-xs text-gray-400 font-semibold">💡 Example commands:</p>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>&ldquo;Beli batagor 5 ribu&rdquo;</li>
          <li>&ldquo;Makan siang 25rb&rdquo;</li>
          <li>&ldquo;Terima gaji 5 juta&rdquo;</li>
        </ul>
      </div>

      {/* Debug Log */}
      {debugLog.length > 0 && (
        <details className="rounded-xl bg-muted p-4" open>
          <summary className="text-xs text-gray-400 font-semibold cursor-pointer">🔧 Debug Log</summary>
          <div className="mt-2 space-y-1 text-xs text-gray-500 font-mono">
            {debugLog.map((msg, i) => <p key={i}>{msg}</p>)}
          </div>
        </details>
      )}
    </div>
  )
}
