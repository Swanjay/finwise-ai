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
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const logs: string[] = []
    
    // 1. Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      logs.push("❌ SpeechRecognition: NOT FOUND")
      setError("SpeechRecognition not supported")
      setDebugInfo(logs)
      return
    }
    logs.push("✅ SpeechRecognition: Found")
    
    // 2. Check HTTPS
    const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost'
    logs.push(`${isSecure ? '✅' : '❌'} HTTPS: ${window.location.protocol}`)
    if (!isSecure) {
      setError("HTTPS required for microphone")
      setDebugInfo(logs)
      return
    }

    // 3. Check getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      logs.push("❌ getUserMedia: NOT FOUND")
      setError("getUserMedia not supported")
      setDebugInfo(logs)
      return
    }
    logs.push("✅ getUserMedia: Found")

    // 4. Create recognition instance
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
      logs.push(`❌ Error: ${event.error}`)
      setDebugInfo([...logs])
      
      if (event.error === "not-allowed") {
        setError("Microphone permission denied by browser")
      } else if (event.error === "no-speech") {
        setError("No speech detected. Try again.")
      } else {
        setError(`Error: ${event.error}`)
      }
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
    logs.push("✅ Recognition initialized")
    setDebugInfo(logs)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
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
        setError(data.error || "Failed to parse")
        onError?.(data.error || "Failed to parse")
      }
    } catch {
      setError("Connection failed")
      onError?.("Connection failed")
    }
    setParsing(false)
  }

  async function startListening() {
    if (!recognitionRef.current) return
    
    setError("")
    setTranscript("")
    setParsed(null)
    
    const logs = [...debugInfo]
    logs.push("🎤 Requesting mic access...")
    setDebugInfo(logs)
    
    try {
      // Request mic access FIRST
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      logs.push("✅ Mic access granted!")
      setDebugInfo([...logs])
      
      // Stop the test stream
      stream.getTracks().forEach(t => t.stop())
      
      // Now start recognition
      recognitionRef.current.start()
      setIsListening(true)
      logs.push("✅ Recognition started")
      setDebugInfo([...logs])
    } catch (err: any) {
      console.error("[voice] Error:", err)
      logs.push(`❌ Error: ${err.name}: ${err.message}`)
      setDebugInfo([...logs])
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError("mic-denied")
      } else if (err.name === 'NotFoundError') {
        setError("No microphone found on this device")
      } else if (err.name === 'NotReadableError') {
        setError("Microphone is being used by another app")
      } else {
        setError(`Error: ${err.message}`)
      }
    }
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
          {isListening ? "Listening... tap to stop" :
           parsing ? "Processing..." :
           "Tap to start speaking"}
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
              <p className="text-xs text-gray-400">Please allow microphone access in your browser:</p>
              <ol className="text-xs text-gray-400 list-decimal list-inside space-y-1">
                <li>Click the 🔒 or ⓘ icon in the address bar</li>
                <li>Find &quot;Microphone&quot;</li>
                <li>Set to &quot;Allow&quot;</li>
                <li>Refresh this page</li>
              </ol>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 w-full rounded-lg bg-red-500/20 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/30 transition"
              >
                🔄 Refresh Page
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
          <p className="text-xs text-teal-400 font-semibold">Parsed Result:</p>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-gray-400">Type</span>
              <span className={`text-xs font-semibold ${
                parsed.type === "income" ? "text-green-400" : "text-red-400"
              }`}>
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
            <button
              onClick={handleCancel}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm text-gray-400 hover:text-white transition"
            >
              <X className="size-4" />
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-600"
            >
              <Check className="size-4" />
              Confirm
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
          <li>&ldquo;Grab ke kantor 15rb&rdquo;</li>
          <li>&ldquo;Bayar listrik 200 ribu&rdquo;</li>
        </ul>
      </div>

      {/* Debug Info */}
      <details className="rounded-xl bg-muted p-4">
        <summary className="text-xs text-gray-400 font-semibold cursor-pointer">🔧 Debug Info</summary>
        <div className="mt-2 space-y-1 text-xs text-gray-500">
          {debugInfo.map((info, i) => (
            <p key={i}>{info}</p>
          ))}
          <p>--- Environment ---</p>
          <p>Browser: {typeof window !== 'undefined' ? navigator.userAgent.split(' ').slice(-2).join(' ') : 'N/A'}</p>
          <p>HTTPS: {typeof window !== 'undefined' && window.location.protocol === 'https:' ? '✅ Yes' : '❌ No'}</p>
          <p>Host: {typeof window !== 'undefined' ? window.location.hostname : 'N/A'}</p>
        </div>
      </details>
    </div>
  )
}
