"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Mic, Loader2 } from "lucide-react"
import VoiceInput from "@/components/voice-input"
import { FinwiseProvider, useFinwise } from "@/components/finwise-store"

export default function VoicePage() {
  return (
    <FinwiseProvider>
      <VoicePageInner />
    </FinwiseProvider>
  )
}

function VoicePageInner() {
  const router = useRouter()
  const { wallets, addTransaction } = useFinwise()
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  function handleVoiceResult(parsed: {
    type: "income" | "expense"
    amount: number
    category: string
    note: string
  }) {
    setSaving(true)
    setMessage("")

    try {
      const defaultWallet = wallets[0]?.id || "cash"
      addTransaction({
        type: parsed.type,
        category: parsed.category,
        amount: parsed.amount,
        description: parsed.note,
        date: new Date().toISOString().slice(0, 10),
        walletId: defaultWallet,
      })
      setMessage("✅ Transaksi berhasil disimpan!")
      setTimeout(() => setMessage(""), 3000)
    } catch {
      setMessage("❌ Gagal menyimpan transaksi")
    }
    setSaving(false)
  }

  return (
    <div className="min-h-dvh bg-background p-4 pb-20">
      <div className="mx-auto max-w-md space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Mic className="size-5 text-primary" />
            Voice Input
          </h1>
        </div>

        {/* Description */}
        <div className="rounded-xl bg-primary/10 border border-primary/30 p-4">
          <p className="text-sm text-primary/80">
            🎤 Catat transaksi dengan suara atau ketik! Cukup bilang apa yang kamu beli atau terima.
          </p>
        </div>

        {/* Status Message */}
        {message && (
          <div className={`rounded-xl px-4 py-3 text-sm ${
            message.startsWith("✅")
              ? "bg-green-500/10 border border-green-500/30 text-green-400"
              : "bg-red-500/10 border border-red-500/30 text-red-400"
          }`}>
            {message}
          </div>
        )}

        {/* Saving indicator */}
        {saving && (
          <div className="flex items-center justify-center gap-2 text-primary">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-sm">Menyimpan...</span>
          </div>
        )}

        {/* Voice Input Component */}
        <VoiceInput onResult={handleVoiceResult} />
      </div>
    </div>
  )
}
