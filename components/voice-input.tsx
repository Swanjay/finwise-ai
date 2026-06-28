"use client"

import { useState, useRef, useCallback } from "react"
import { Mic, Loader2, Check, X, Keyboard, Upload } from "lucide-react"

interface VoiceInputProps {
  onResult: (parsed: {
    type: "income" | "expense"
    amount: number
    category: string
    note: string
  }) => void
}

export default function VoiceInput({ onResult }: VoiceInputProps) {
  const [status, setStatus] = useState<"idle" | "processing" | "result" | "error">("idle")
  const [transcript, setTranscript] = useState("")
  const [parsed, setParsed] = useState<{
    type: "income" | "expense"
    amount: number
    category: string
    note: string
  } | null>(null)
  const [error, setError] = useState("")
  const [manualText, setManualText] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    
    setError("")
    setTranscript("")
    setParsed(null)
    setStatus("processing")

    try {
      // Send to transcription API
      const formData = new FormData()
      formData.append("audio", file, file.name)

      const res = await fetch("/api/ai/voice-transcribe", { method: "POST", body: formData })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Server error (${res.status})`)
      }

      const data = await res.json()
      if (!data.text?.trim()) {
        setError("Tidak ada kata terdeteksi. Coba rekam lebih jelas.")
        setStatus("error")
        return
      }

      setTranscript(data.text)
      await doParse(data.text)
    } catch (err: any) {
      setError(err.message || "Gagal memproses audio")
      setStatus("error")
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = ""
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
    setStatus("processing")
    doParse(text)
  }

  function formatCurrency(n: number) {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)
  }

  function reset() {
    setStatus("idle")
    setError("")
    setTranscript("")
    setParsed(null)
    setManualText("")
  }

  return (
    <div className="space-y-4">
      {/* ─── Text Input (ALWAYS VISIBLE) ─── */}
      <form onSubmit={handleManualSubmit} className="flex gap-2">
        <input
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
          placeholder="ketik: beli kopi 25rb"
          className="flex-1 px-4 py-3 rounded-xl bg-muted border border-border text-sm placeholder:text-muted-foreground/50 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition"
          disabled={status === "processing"}
        />
        <button
          type="submit"
          disabled={!manualText.trim() || status === "processing"}
          className="px-4 py-3 rounded-xl bg-teal-500 text-white text-sm font-semibold hover:bg-teal-600 transition disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
        >
          <Keyboard className="size-4" />
        </button>
      </form>

      {/* ─── Divider ─── */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">atau rekam suara</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* ─── Voice Section ─── */}
      <div className="flex flex-col items-center gap-4">
        {/* System Recorder Button (always works!) */}
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          capture="user"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={status === "processing"}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-teal-500/10 border-2 border-teal-500/30 hover:bg-teal-500/20 active:scale-[0.98] transition disabled:opacity-50"
        >
          {status === "processing" ? (
            <>
              <Loader2 className="size-6 text-teal-400 animate-spin" />
              <span className="text-sm font-semibold text-teal-400">Memproses audio...</span>
            </>
          ) : (
            <>
              <Mic className="size-6 text-teal-400" />
              <div className="text-left">
                <p className="text-sm font-semibold text-teal-400">🎤 Rekam dari Mic</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Buka recorder HP → rekam → otomatis diproses</p>
              </div>
            </>
          )}
        </button>

        {/* Upload existing audio */}
        <button
          onClick={() => {
            const input = document.createElement("input")
            input.type = "file"
            input.accept = "audio/*"
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0]
              if (file) {
                const fakeEvent = { target: { files: [file] } } as any
                handleFileSelect(fakeEvent)
              }
            }
            input.click()
          }}
          disabled={status === "processing"}
          className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-2xl bg-muted border border-border hover:bg-muted/80 active:scale-[0.98] transition disabled:opacity-50"
        >
          <Upload className="size-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Upload file audio yang sudah ada</span>
        </button>
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
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <p>{error}</p>
        </div>
      )}

      {/* ─── Parsed Result ─── */}
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
