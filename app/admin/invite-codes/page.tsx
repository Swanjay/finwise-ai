"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession, signIn } from "next-auth/react"
import { KeyRound, Loader2, Trash2, Plus, Copy, Check, LogIn, Users, Crown, Sparkles, Search, Calendar, Zap } from "lucide-react"

interface InviteCode {
  code: string
  plan_tier: string
  max_uses: number
  uses: number
  created_by: { email: string } | null
  notes: string
  is_active: boolean
  expires_at: string | null
  created_at: string
}

interface UserPlan {
  user_id: string
  plan_tier: string
  source_code: string | null
  assigned_at: string
  email: string
}

type Tab = "codes" | "users"

export default function InviteCodesAdmin() {
  const { data: session } = useSession()
  const [tab, setTab] = useState<Tab>("codes")
  const [codes, setCodes] = useState<InviteCode[]>([])
  const [users, setUsers] = useState<UserPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [copiedCode, setCopiedCode] = useState("")

  // Create form
  const [planTier, setPlanTier] = useState<"pro" | "premium">("pro")
  const [quantity, setQuantity] = useState(5)
  const [maxUses, setMaxUses] = useState(1)
  const [notes, setNotes] = useState("")
  const [expiresDays, setExpiresDays] = useState(30)
  const [creating, setCreating] = useState(false)

  // User filter
  const [userFilter, setUserFilter] = useState("all")

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

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/invite-codes/users")
      const data = await res.json()
      if (data.users) setUsers(data.users)
    } catch {
      setError("Gagal memuat user")
    }
  }, [])

  useEffect(() => {
    fetchCodes()
  }, [fetchCodes])

  useEffect(() => {
    if (tab === "users") fetchUsers()
  }, [tab, fetchUsers])

  async function handleCreate() {
    setCreating(true)
    setError("")

    try {
      const res = await fetch("/api/invite-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity,
          planTier,
          maxUses,
          notes: notes.trim(),
          expiresDays: expiresDays || null,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        fetchCodes()
        setNotes("")
      } else {
        setError(data.error || "Gagal membuat kode")
      }
    } catch {
      setError("Koneksi gagal")
    }
    setCreating(false)
  }

  async function handleDeactivate(code: string) {
    if (!confirm(`Nonaktifkan kode ${code}?`)) return
    try {
      const res = await fetch(`/api/invite-codes?code=${encodeURIComponent(code)}`, { method: "DELETE" })
      const data = await res.json()
      if (data.ok) fetchCodes()
    } catch {
      setError("Gagal menonaktifkan kode")
    }
  }

  function copyToClipboard(code: string) {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(""), 2000)
  }

  function copyAllCodes() {
    const text = codes.filter(c => c.is_active).map(c => `${c.code} (${c.plan_tier})`).join("\n")
    navigator.clipboard.writeText(text)
  }

  const activeCodes = codes.filter(c => c.is_active)
  const usedCodes = codes.filter(c => !c.is_active)

  if (!session?.user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-6">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Silakan login terlebih dahulu</p>
          <button onClick={() => signIn()}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition active:scale-[0.98]">
            <LogIn className="size-4" />
            Login ke FinWise
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background p-6">
      <div className="mx-auto w-full max-w-2xl space-y-6">

        {/* ─── Header ─── */}
        <div>
          <h1 className="font-heading text-2xl font-bold">
            <KeyRound className="mr-2 inline-block size-6 text-primary" />
            Admin Panel
          </h1>
          <p className="text-sm text-muted-foreground">Kelola kode invite & user plan</p>
        </div>

        {/* ─── Tab Nav ─── */}
        <div className="flex gap-2 border-b border-border pb-2">
          <button onClick={() => setTab("codes")}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition ${
              tab === "codes" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}>
            <KeyRound className="size-4" /> Kode
          </button>
          <button onClick={() => setTab("users")}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition ${
              tab === "users" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}>
            <Users className="size-4" /> User Plan
          </button>
        </div>

        {/* ─── Error ─── */}
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* ═══════════════════════════════════════
            TAB: CODES
        ═══════════════════════════════════════ */}
        {tab === "codes" && (
          <>
            {/* ─── New Code Form ─── */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <h2 className="font-semibold text-sm">Buat Kode Baru</h2>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground">Plan</label>
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => setPlanTier("pro")}
                      className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                        planTier === "pro" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                      }`}>
                      <Crown className="size-4" /> Pro
                    </button>
                    <button onClick={() => setPlanTier("premium")}
                      className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                        planTier === "premium" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                      }`}>
                      <Sparkles className="size-4" /> Premium
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground">Jumlah kode</label>
                  <input type="number" min={1} max={100} value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground">Maks. pemakai/kode</label>
                  <input type="number" min={1} max={100} value={maxUses}
                    onChange={(e) => setMaxUses(parseInt(e.target.value) || 1)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground">Kadaluwarsa (hari)</label>
                  <input type="number" min={0} max={365} value={expiresDays}
                    onChange={(e) => setExpiresDays(parseInt(e.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Catatan (opsional)</label>
                <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="Untuk siapa kode ini?"
                  maxLength={100}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>

              <button onClick={handleCreate} disabled={creating}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-50">
                {creating ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
                Generate {quantity} Kode {planTier === "pro" ? "Pro" : "Premium"}
              </button>
            </div>

            {/* ─── Stats ─── */}
            <div className="flex gap-3 text-sm">
              <div className="flex-1 rounded-xl border border-border bg-card p-3 text-center">
                <p className="text-xs text-muted-foreground">Aktif</p>
                <p className="text-xl font-bold text-primary">{activeCodes.length}</p>
              </div>
              <div className="flex-1 rounded-xl border border-border bg-card p-3 text-center">
                <p className="text-xs text-muted-foreground">Terpakai</p>
                <p className="text-xl font-bold">{usedCodes.length}</p>
              </div>
              <div className="flex-1 rounded-xl border border-border bg-card p-3 text-center">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-bold">{codes.length}</p>
              </div>
            </div>

            {/* ─── Active Codes List ─── */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-sm">Kode Aktif ({activeCodes.length})</h2>
                {activeCodes.length > 0 && (
                  <button onClick={copyAllCodes}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition">
                    <Copy className="size-3" /> Copy all
                  </button>
                )}
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-6 text-muted-foreground">
                  <Loader2 className="size-5 animate-spin mr-2" /> Memuat...
                </div>
              ) : activeCodes.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">Belum ada kode aktif</p>
              ) : (
                <div className="space-y-2.5">
                  {activeCodes.map((c) => (
                    <div key={c.code} className="rounded-lg border border-border p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <code className="font-mono font-bold text-sm bg-muted px-2 py-1 rounded">
                            {c.code}
                          </code>
                          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                            c.plan_tier === "pro" ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                          }`}>
                            {c.plan_tier === "pro" ? "💎 Pro" : "👑 Premium"}
                          </span>
                          <button onClick={() => copyToClipboard(c.code)}
                            className="text-muted-foreground hover:text-foreground transition" title="Salin kode">
                            {copiedCode === c.code ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
                          </button>
                        </div>
                        <button onClick={() => handleDeactivate(c.code)}
                          className="text-muted-foreground hover:text-destructive transition" title="Nonaktifkan">
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>Terpakai: <strong>{c.uses}</strong> / {c.maxUses || "∞"}</span>
                        {c.notes && <span className="italic">📝 {c.notes}</span>}
                        {c.expires_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3" />
                            Exp: {new Date(c.expires_at).toLocaleDateString("id-ID")}
                          </span>
                        )}
                      </div>
                      {c.max_uses && (
                        <div className="h-1.5 w-full rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${Math.min(100, (c.uses / c.max_uses) * 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════
            TAB: USERS
        ═══════════════════════════════════════ */}
        {tab === "users" && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm">User Plan ({users.length})</h2>
              <div className="flex gap-1">
                {["all", "basic", "pro", "premium"].map((f) => (
                  <button key={f} onClick={() => setUserFilter(f)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                      userFilter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}>
                    {f === "all" ? "Semua" : f === "basic" ? "🆓 Basic" : f === "pro" ? "💎 Pro" : "👑 Premium"}
                  </button>
                ))}
              </div>
            </div>

            {users.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">Belum ada data user plan</p>
            ) : (
              <div className="space-y-2">
                {users
                  .filter((u) => userFilter === "all" || u.plan_tier === userFilter)
                  .map((u) => (
                    <div key={u.user_id} className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                          u.plan_tier === "basic" ? "bg-zinc-100 text-zinc-600"
                          : u.plan_tier === "pro" ? "bg-blue-100 text-blue-700"
                          : "bg-amber-100 text-amber-700"
                        }`}>
                          {u.plan_tier === "basic" ? "🆓" : u.plan_tier === "pro" ? "💎" : "👑"} {u.plan_tier}
                        </span>
                        <span className="text-sm font-medium">{u.email}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {u.source_code ? (
                          <span className="font-mono text-[10px]">via {u.source_code}</span>
                        ) : (
                          <span className="italic">direct</span>
                        )}
                        <span className="ml-2">{new Date(u.assigned_at).toLocaleDateString("id-ID")}</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">
          💡 Kirim kode {planTier === "pro" ? "PRO_" : "PREM_"} ke teman/klien yang ingin upgrade
        </p>
      </div>
    </div>
  )
}