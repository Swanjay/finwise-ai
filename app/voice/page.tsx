"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Mic, Loader2 } from "lucide-react"
import VoiceInput from "@/components/voice-input"

export default function VoicePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  async function handleVoiceResult(parsed: {
    type: "income" | "expense"
    amount: number
    category: string
    note: string
  }) {
    setSaving(true)
    setMessage("")

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: parsed.type,
          amount: parsed.amount,
          category: parsed.category,
          note: parsed.note,
          date: new Date().toISOString().split("T")[0],
          wallet: "cash",
        }),
      })
      const data = await res.json()

      if (data.ok || res.ok) {
        setMessage("✅ Transaksi berhasil disimpan!")
        setTimeout(() => setMessage(""), 3000)
      } else {
        setMessage("❌ Gagal menyimpan transaksi")
      }
    } catch {
      setMessage("❌ Koneksi gagal")
    }
    setSaving(false)
  }

  if (status === "unauthenticated") {
    router.push("/login")
    return null
  }

  return (
    <div className="min-h-dvh bg-[#0F172A] p-4 pb-20">
      <div className="mx-auto max-w-md space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/")} className="text-gray-400 hover:text-white">
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Mic className="size-5 text-teal-400" />
            Voice Input
          </h1>
        </div>

        {/* Description */}
        <div className="rounded-xl bg-teal-500/10 border border-teal-500/30 p-4">
          <p className="text-sm text-teal-300">
            🎤 Catat transaksi dengan suara! Cukup bilang apa yang kamu beli atau terima.
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
          <div className="flex items-center justify-center gap-2 text-teal-400">
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
