"use client"

import { useState, useEffect, useCallback } from "react"
import { KeyRound, Loader2, Trash2, Plus, Copy, Check, LogIn, LogOut, Users, Eye, EyeOff, Calendar } from "lucide-react"

interface InviteCode {
  code: string
  max_uses: number
  used_count: number
  description: string | null
  created_at: string
  expires_at: string | null
}

interface Usage {
  code: string
  user_id: string
  email: string | null
  used_at: string
}

export default function AdminCodes() {
  const [authed, setAuthed] = useState(false)
  const [user, setUser] = useState("")
  const [pass, setPass] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [loginErr, setLoginErr] = useState("")
  const [loggingIn, setLoggingIn] = useState(false)

  const [codes, setCodes] = useState<InviteCode[]>([])
  const [usage, setUsage] = useState<Usage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Create form
  const [newCode, setNewCode] = useState("")
  const [maxUses, setMaxUses] = useState(1)
  const [desc, setDesc] = useState("")
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState("")
  const [showUsage, setShowUsage] = useState<string | null>(null)

  // Expiry
  const [expiresAt, setExpiresAt] = useState("")

  // Check if already logged in
  useEffect(() => {
    fetch("/api/admin/codes-simple").then(r => {
      if (r.ok) setAuthed(true)
    }).catch(() => {})
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/codes-simple")
      const data = await res.json()
      if (data.ok) {
        setCodes(data.codes)
        setUsage(data.usage)
      }
    } catch { setError("Gagal memuat data") }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (authed) fetchData()
  }, [authed, fetchData])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginErr("")
    setLoggingIn(true)
    try {
      const res = await fetch("/api/admin/codes-simple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", user, pass }),
      })
      const data = await res.json()
      if (data.ok) {
        setAuthed(true)
        setPass("")
      } else {
        setLoginErr(data.error || "Login gagal")
      }
    } catch { setLoginErr("Koneksi gagal") }
    setLoggingIn(false)
  }

  async function handleCreate() {
    setCreating(true)
    setError("")
    try {
      const res = await fetch("/api/admin/codes-simple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          code: newCode.trim() || undefined,
          maxUses,
          description: desc.trim() || undefined,
          expiresAt: expiresAt || null,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setNewCode("")
        setDesc("")
        setMaxUses(1)
        fetchData()
      } else {
        setError(data.error || "Gagal membuat kode")
      }
    } catch { setError("Koneksi gagal") }
    setCreating(false)
  }

  async function handleDelete(code: string) {
    if (!confirm(`Hapus kode ${code}?`)) return
    try {
      const res = await fetch("/api/admin/codes-simple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", code }),
      })
      const data = await res.json()
      if (data.ok) fetchData()
    } catch { setError("Gagal menghapus") }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(""), 2000)
  }

  function logout() {
    document.cookie = "fw-admin=; path=/; max-age=0"
    setAuthed(false)
    setUser("")
  }

  // ── LOGIN SCREEN ──
  if (!authed) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-gray-950 dark:to-gray-900 p-6">
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-card p-8 shadow-lg">
          <div className="text-center space-y-2">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10">
              <KeyRound className="size-7 text-primary" />
            </div>
            <h1 className="text-xl font-bold">Admin Panel</h1>
            <p className="text-sm text-muted-foreground">Kelola kode invitasi FinWise</p>
          </div>

          {loginErr && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
              {loginErr}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Username</label>
              <input
                type="text"
                value={user}
                onChange={e => setUser(e.target.value)}
                placeholder="fure"
                autoComplete="username"
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Password</label>
              <div className="relative mt-1">
                <input
                  type={showPass ? "text" : "password"}
                  value={pass}
                  onChange={e => setPass(e.target.value)}
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 pr-10 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loggingIn}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-50"
          >
            {loggingIn ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
            Masuk
          </button>
        </form>
      </div>
    )
  }

  // ── DASHBOARD ──
  const totalCodes = codes.length
  const totalUsed = codes.reduce((s, c) => s + c.used_count, 0)
  const totalCapacity = codes.reduce((s, c) => s + c.max_uses, 0)

  return (
    <div className="min-h-dvh bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-gray-950 dark:to-gray-900 p-4 sm:p-6">
      <div className="mx-auto max-w-lg space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <KeyRound className="size-5 text-primary" />
              Invite Codes
            </h1>
            <p className="text-xs text-muted-foreground">Kelola kode akses FinWise</p>
          </div>
          <button onClick={logout} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition">
            <LogOut className="size-3.5" />
            Keluar
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-2xl font-bold text-primary">{totalCodes}</p>
            <p className="text-xs text-muted-foreground">Kode</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-2xl font-bold text-emerald-600">{totalUsed}</p>
            <p className="text-xs text-muted-foreground">Terpakai</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-2xl font-bold text-amber-600">{totalCapacity - totalUsed}</p>
            <p className="text-xs text-muted-foreground">Sisa Slot</p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Create Form */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Plus className="size-4" />
            Buat Kode Baru
          </h2>

          <input
            type="text"
            value={newCode}
            onChange={e => setNewCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))}
            placeholder="KOSONG = auto-generate"
            maxLength={20}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary"
          />

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Max User</label>
              <input
                type="number"
                min={1}
                max={100}
                value={maxUses}
                onChange={e => setMaxUses(parseInt(e.target.value) || 1)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="flex-[2]">
              <label className="text-xs text-muted-foreground">Deskripsi</label>
              <input
                type="text"
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder="Buat Dika"
                maxLength={50}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Masa Berlaku</label>
            <div className="mt-1 flex gap-2 items-center">
              <input
                type="date"
                value={expiresAt}
                onChange={e => setExpiresAt(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              {expiresAt && (
                <button
                  type="button"
                  onClick={() => setExpiresAt("")}
                  className="text-xs text-muted-foreground hover:text-destructive whitespace-nowrap"
                >
                  Hapus
                </button>
              )}
            </div>
            <div className="mt-1.5 flex gap-1.5">
              {[
                { label: "7 hari", days: 7 },
                { label: "30 hari", days: 30 },
                { label: "90 hari", days: 90 },
                { label: "1 tahun", days: 365 },
              ].map(p => (
                <button
                  key={p.days}
                  type="button"
                  onClick={() => {
                    const d = new Date()
                    d.setDate(d.getDate() + p.days)
                    setExpiresAt(d.toISOString().slice(0, 10))
                  }}
                  className="rounded-md bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary transition"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-50"
          >
            {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {newCode.trim() ? "Buat Kode" : "Generate Kode"}
          </button>
        </div>

        {/* Code List */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h2 className="font-semibold text-sm">Semua Kode ({totalCodes})</h2>

          {loading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Loader2 className="size-5 animate-spin mr-2" />
              Memuat...
            </div>
          ) : codes.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">Belum ada kode</p>
          ) : (
            <div className="space-y-3">
              {codes.map(c => {
                const codeUsage = usage.filter(u => u.code === c.code)
                const isFull = c.used_count >= c.max_uses
                return (
                  <div key={c.code} className="rounded-lg border border-border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <code className={`font-mono font-bold text-sm px-2 py-1 rounded ${isFull ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                          {c.code}
                        </code>
                        {isFull && (
                          <span className="text-[10px] font-medium text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded-full">FULL</span>
                        )}
                        <button onClick={() => copyCode(c.code)} className="text-muted-foreground hover:text-foreground transition" title="Salin">
                          {copied === c.code ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
                        </button>
                      </div>
                      <button onClick={() => handleDelete(c.code)} className="text-muted-foreground hover:text-destructive transition" title="Hapus">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Terpakai: <strong>{c.used_count}</strong>/{c.max_uses}</span>
                      {c.description && <span className="italic">• {c.description}</span>}
                      <span className="ml-auto text-[10px]">{new Date(c.created_at).toLocaleDateString('id-ID')}</span>
                      {c.expires_at && (
                        <>
                          <span className="ml-2">
                            <Calendar className="size-3 text-muted-foreground mr-0.5" />
                            {new Date(c.expires_at).toLocaleDateString('id-ID')}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Progress bar */}
                    <div className="h-1.5 w-full rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all ${isFull ? 'bg-red-500' : 'bg-primary'}`}
                        style={{ width: `${Math.min(100, (c.used_count / c.max_uses) * 100)}%` }}
                      />
                    </div>

                    {/* Usage details toggle */}
                    {codeUsage.length > 0 && (
                      <div>
                        <button
                          onClick={() => setShowUsage(showUsage === c.code ? null : c.code)}
                          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                        >
                          <Users className="size-3" />
                          {showUsage === c.code ? 'Sembunyikan' : `Lihat ${codeUsage.length} pemakai`}
                        </button>
                        {showUsage === c.code && (
                          <div className="mt-2 space-y-1 pl-4 border-l-2 border-primary/20">
                            {codeUsage.map((u, i) => (
                              <p key={i} className="text-[11px] text-muted-foreground">
                                {u.email || u.user_id} — {new Date(u.used_at).toLocaleString('id-ID')}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <p className="text-center text-[10px] text-muted-foreground/60 pb-4">
          🔒 Admin Panel — FinWise
        </p>
      </div>
    </div>
  )
}
