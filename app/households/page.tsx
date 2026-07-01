"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { 
  Users, Plus, Copy, Check, Loader2, UserPlus, 
  CheckCircle, XCircle, ArrowLeft, Home
} from "lucide-react"

interface Household {
  id: string
  name: string
  invite_code: string
  role: string
  created_at: string
}

interface Member {
  user_id: string
  role: string
  status: string
  joined_at: string
}

export default function HouseholdsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [households, setHouseholds] = useState<Household[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [copiedCode, setCopiedCode] = useState("")
  
  // Create form
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState("")
  const [creating, setCreating] = useState(false)
  
  // Join form
  const [showJoin, setShowJoin] = useState(false)
  const [joinCode, setJoinCode] = useState("")
  const [joining, setJoining] = useState(false)
  
  // Members view
  const [selectedHousehold, setSelectedHousehold] = useState<string | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  const fetchHouseholds = useCallback(async () => {
    try {
      const res = await fetch("/api/households")
      const data = await res.json()
      if (data.households) {
        setHouseholds(data.households)
      }
    } catch {
      setError("Gagal memuat household")
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (status === "authenticated") {
      fetchHouseholds()
    }
  }, [status, fetchHouseholds])

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    setError("")

    try {
      const res = await fetch("/api/households", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      })
      const data = await res.json()
      if (data.ok) {
        setNewName("")
        setShowCreate(false)
        fetchHouseholds()
      } else {
        setError(data.error || "Gagal membuat household")
      }
    } catch {
      setError("Koneksi gagal")
    }
    setCreating(false)
  }

  async function handleJoin() {
    if (!joinCode.trim()) return
    setJoining(true)
    setError("")

    try {
      const res = await fetch("/api/households/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: joinCode.trim() }),
      })
      const data = await res.json()
      if (data.ok) {
        setJoinCode("")
        setShowJoin(false)
        alert(data.message)
      } else {
        setError(data.error || "Gagal bergabung")
      }
    } catch {
      setError("Koneksi gagal")
    }
    setJoining(false)
  }

  async function fetchMembers(householdId: string) {
    setSelectedHousehold(householdId)
    setLoadingMembers(true)
    try {
      const res = await fetch(`/api/households/${householdId}/members`)
      const data = await res.json()
      if (data.members) {
        setMembers(data.members)
      }
    } catch {
      setError("Gagal memuat anggota")
    }
    setLoadingMembers(false)
  }

  async function handleApprove(householdId: string, userId: string, action: "approve" | "reject") {
    try {
      const res = await fetch("/api/households/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ household_id: householdId, member_user_id: userId, action }),
      })
      const data = await res.json()
      if (data.ok) {
        fetchMembers(householdId)
      } else {
        setError(data.error || "Gagal update status")
      }
    } catch {
      setError("Koneksi gagal")
    }
  }

  function copyToClipboard(code: string) {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(""), 2000)
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0F172A]">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-[#0F172A] p-4 pb-20">
      <div className="mx-auto max-w-md space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/")} className="text-gray-400 hover:text-white">
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="size-5 text-primary" />
            Household
          </h1>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => { setShowCreate(true); setShowJoin(false) }}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary/20 border border-primary/30 px-4 py-3 text-sm font-semibold text-primary transition hover:bg-primary/30"
          >
            <Plus className="size-4" />
            Buat Baru
          </button>
          <button
            onClick={() => { setShowJoin(true); setShowCreate(false) }}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary/20 border border-primary/30 px-4 py-3 text-sm font-semibold text-primary transition hover:bg-primary/30"
          >
            <UserPlus className="size-4" />
            Gabung
          </button>
        </div>

        {/* Create Form */}
        {showCreate && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h2 className="font-semibold text-sm text-white">Buat Household Baru</h2>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Contoh: Keluarga Budi, Kosan A1"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none focus:border-primary"
            />
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
            >
              {creating ? <Loader2 className="size-4 animate-spin mx-auto" /> : "Buat Household"}
            </button>
          </div>
        )}

        {/* Join Form */}
        {showJoin && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h2 className="font-semibold text-sm text-white">Gabung via Kode</h2>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="FW-XXXX"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none focus:border-primary font-mono"
            />
            <button
              onClick={handleJoin}
              disabled={joining || !joinCode.trim()}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
            >
              {joining ? <Loader2 className="size-4 animate-spin mx-auto" /> : "Gabung"}
            </button>
          </div>
        )}

        {/* Household List */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-400">Household Kamu ({households.length})</h2>
          
          {households.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <Home className="size-12 mx-auto text-gray-600 mb-3" />
              <p className="text-sm text-gray-400">Belum punya household</p>
              <p className="text-xs text-gray-500 mt-1">Buat baru atau gabung dengan kode invitasi</p>
            </div>
          ) : (
            households.map((h) => (
              <div
                key={h.id}
                className="rounded-xl border border-border bg-card p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white">{h.name}</h3>
                    <p className="text-xs text-gray-400">
                      {h.role === "owner" ? "👑 Pemilik" : "👤 Anggota"}
                    </p>
                  </div>
                  {h.role === "owner" && (
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono bg-muted px-2 py-1 rounded text-primary">
                        {h.invite_code}
                      </code>
                      <button
                        onClick={() => copyToClipboard(h.invite_code)}
                        className="text-gray-400 hover:text-white"
                      >
                        {copiedCode === h.invite_code ? (
                          <Check className="size-4 text-green-400" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => fetchMembers(h.id)}
                  className="w-full rounded-lg bg-muted px-3 py-2 text-xs text-gray-400 hover:text-white transition"
                >
                  Lihat Anggota
                </button>
              </div>
            ))
          )}
        </div>

        {/* Members Modal */}
        {selectedHousehold && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-sm rounded-2xl bg-[#1E293B] p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white">Anggota</h3>
                <button onClick={() => setSelectedHousehold(null)} className="text-gray-400 hover:text-white">
                  ✕
                </button>
              </div>
              
              {loadingMembers ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="size-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {members.map((m, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-muted p-3">
                      <div>
                        <p className="text-sm text-white">{m.user_id.substring(0, 8)}...</p>
                        <p className="text-xs text-gray-400">
                          {m.role === "owner" ? "👑 Pemilik" : "👤 Anggota"} • {m.status}
                        </p>
                      </div>
                      {m.status === "pending" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(selectedHousehold, m.user_id, "approve")}
                            className="rounded-lg bg-green-500/20 p-2 text-green-400 hover:bg-green-500/30"
                          >
                            <CheckCircle className="size-4" />
                          </button>
                          <button
                            onClick={() => handleApprove(selectedHousehold, m.user_id, "reject")}
                            className="rounded-lg bg-red-500/20 p-2 text-red-400 hover:bg-red-500/30"
                          >
                            <XCircle className="size-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
