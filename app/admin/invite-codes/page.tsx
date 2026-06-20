"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { KeyRound, Loader2, Trash2, Plus, Copy, Check } from "lucide-react"

interface InviteCode {
  code: string
  maxUses: number
  usedCount: number
  createdBy: string | null
  description: string | null
  expiresAt: string | null
  createdAt: string
}

export default function InviteCodesAdmin() {
  const { data: session } = useSession()
  const [codes, setCodes] = useState<InviteCode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [copiedCode, setCopiedCode] = useState("")

  // Form state
  const [newCode, setNewCode] = useState("")
  const [maxUses, setMaxUses] = useState(1)
  const [description, setDescription] = useState("")
  const [creating, setCreating] = useState(false)

  const fetchCodes = useCallback(async () => {
    try {
      const res = await fetch("/api/invite-codes")
      const data = await res.json()
      if (data.codes) setCodes(data.codes)
    } catch {
      setError("Gagal memuat kode")
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchCodes()
  }, [fetchCodes])

  async function handleCreate() {
    if (!newCode.trim()) return
    setCreating(true)
    setError("")

    try {
      const res = await fetch("/api/invite-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newCode.trim(),
          maxUses,
          description: description.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setNewCode("")
        setDescription("")
        setMaxUses(1)
        fetchCodes()
      } else {
        setError(data.error || "Gagal membuat kode")
      }
    } catch {
      setError("Koneksi gagal")
    }
    setCreating(false)
  }

  async function handleDelete(code: string) {
    if (!confirm(`Hapus kode ${code}?`)) return

    try {
      const res = await fetch("/api/invite-codes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (data.ok) fetchCodes()
    } catch {
      setError("Gagal menghapus kode")
    }
  }

  function copyToClipboard(code: string) {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(""), 2000)
  }

  if (!session?.user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-6">
        <p className="text-muted-foreground">Silakan login terlebih dahulu</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background p-6">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold">
            <KeyRound className="mr-2 inline-block size-6 text-primary" />
            Kelola Kode Invitasi
          </h1>
          <p className="text-sm text-muted-foreground">
            Generate kode untuk teman/keluarga
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Create new code */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h2 className="font-semibold text-sm">Buat Kode Baru</h2>
          
          <div>
            <label className="text-xs text-muted-foreground">Kode (atau kosongkan untuk auto-generate)</label>
            <input
              type="text"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))}
              placeholder="CONTOH-A1B2"
              maxLength={20}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Maks. pemakai</label>
              <input
                type="number"
                min={1}
                max={100}
                value={maxUses}
                onChange={(e) => setMaxUses(parseInt(e.target.value) || 1)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Deskripsi (opsional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Buat Dika"
                maxLength={50}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-50"
          >
            {creating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            {newCode.trim() ? "Buat Kode" : "Generate Kode"}
          </button>
        </div>

        {/* List codes */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h2 className="font-semibold text-sm">Kode Aktif ({codes.length})</h2>

          {loading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Loader2 className="size-5 animate-spin mr-2" />
              Memuat...
            </div>
          ) : codes.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">
              Belum ada kode
            </p>
          ) : (
            <div className="space-y-3">
              {codes.map((c) => (
                <div key={c.code} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <code className="font-mono font-bold text-sm bg-muted px-2 py-1 rounded">
                        {c.code}
                      </code>
                      <button
                        onClick={() => copyToClipboard(c.code)}
                        className="text-muted-foreground hover:text-foreground transition"
                        title="Salin kode"
                      >
                        {copiedCode === c.code ? (
                          <Check className="size-4 text-green-500" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </button>
                    </div>
                    <button
                      onClick={() => handleDelete(c.code)}
                      className="text-muted-foreground hover:text-destructive transition"
                      title="Hapus kode"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      Terpakai: <strong>{c.usedCount}</strong> / {c.maxUses}
                    </span>
                    {c.description && (
                      <span className="italic">{c.description}</span>
                    )}
                    {c.expiresAt && (
                      <span>
                        Exp: {new Date(c.expiresAt).toLocaleDateString('id-ID')}
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 w-full rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.min(100, (c.usedCount / c.maxUses) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          💡 Kirim kode ke teman yang ingin bergabung
        </p>
      </div>
    </div>
  )
}
