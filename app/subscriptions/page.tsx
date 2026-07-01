"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { formatIDRInput, parseIDRInput } from "@/lib/finwise"
import { 
  Calendar, Plus, Loader2, Trash2, ArrowLeft, 
  CreditCard, Bell, ChevronRight
} from "lucide-react"

interface Subscription {
  id: string
  name: string
  amount: number
  currency: string
  billing_cycle: string
  next_billing_date: string
  category: string
  icon: string
  color: string
  auto_renew: boolean
  notes: string
  is_active: boolean
}

export default function SubscriptionsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [monthlyTotal, setMonthlyTotal] = useState(0)
  
  // Form state
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    billing_cycle: "monthly",
    next_billing_date: new Date().toISOString().split("T")[0],
    icon: "📦",
    notes: "",
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  const fetchSubscriptions = useCallback(async () => {
    try {
      const res = await fetch("/api/subscriptions")
      const data = await res.json()
      if (data.subscriptions) {
        setSubscriptions(data.subscriptions)
        setMonthlyTotal(data.monthlyTotal)
      }
    } catch {
      setError("Gagal memuat subscription")
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (status === "authenticated") {
      fetchSubscriptions()
    }
  }, [status, fetchSubscriptions])

  async function handleCreate() {
    if (!formData.name || !formData.amount) return
    setSubmitting(true)
    setError("")

    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          amount: parseIDRInput(formData.amount),
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setFormData({
          name: "",
          amount: "",
          billing_cycle: "monthly",
          next_billing_date: new Date().toISOString().split("T")[0],
          icon: "📦",
          notes: "",
        })
        setShowForm(false)
        fetchSubscriptions()
      } else {
        setError(data.error || "Gagal membuat subscription")
      }
    } catch {
      setError("Koneksi gagal")
    }
    setSubmitting(false)
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus subscription ini?")) return
    
    try {
      const res = await fetch("/api/subscriptions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      const data = await res.json()
      if (data.ok) {
        fetchSubscriptions()
      } else {
        setError(data.error || "Gagal menghapus")
      }
    } catch {
      setError("Koneksi gagal")
    }
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  function getDaysUntil(dateStr: string) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const target = new Date(dateStr)
    target.setHours(0, 0, 0, 0)
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  function getCycleLabel(cycle: string) {
    const labels: Record<string, string> = {
      weekly: "/minggu",
      monthly: "/bulan",
      quarterly: "/3 bulan",
      yearly: "/tahun",
    }
    return labels[cycle] || ""
  }

  const commonIcons = ["📦", "🎬", "🎵", "☁️", "📱", "🎮", "📰", "🏋️", "📚", "💼"]

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
            <CreditCard className="size-5 text-primary" />
            Subscription
          </h1>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Monthly Total Card */}
        <div className="rounded-2xl bg-gradient-to-br from-primary/20 to-green-700/20 border border-primary/30 p-5">
          <p className="text-sm text-primary">Total Pengeluaran Bulanan</p>
          <p className="text-3xl font-bold text-white mt-1">{formatCurrency(monthlyTotal)}</p>
          <p className="text-xs text-primary mt-2">{subscriptions.length} subscription aktif</p>
        </div>

        {/* Add Button */}
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-gray-600 px-4 py-4 text-sm text-gray-400 hover:text-white hover:border-primary transition"
        >
          <Plus className="size-4" />
          Tambah Subscription
        </button>

        {/* Form */}
        {showForm && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h2 className="font-semibold text-sm text-white">Tambah Subscription</h2>
            
            <div>
              <label className="text-xs text-gray-400">Nama</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Netflix, Spotify, dll"
                className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none focus:border-primary"
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-400">Amount (Rp)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatIDRInput(formData.amount)}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value.replace(/\D/g, '') })}
                  placeholder="54000"
                  className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none focus:border-primary"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-400">Cycle</label>
                <select
                  value={formData.billing_cycle}
                  onChange={(e) => setFormData({ ...formData, billing_cycle: e.target.value })}
                  className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-white outline-none focus:border-primary"
                >
                  <option value="weekly">Mingguan</option>
                  <option value="monthly">Bulanan</option>
                  <option value="quarterly">3 Bulan</option>
                  <option value="yearly">Tahunan</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400">Tanggal Tagihan Berikutnya</label>
              <input
                type="date"
                value={formData.next_billing_date}
                onChange={(e) => setFormData({ ...formData, next_billing_date: e.target.value })}
                className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-white outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400">Icon</label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {commonIcons.map((icon) => (
                  <button
                    key={icon}
                    onClick={() => setFormData({ ...formData, icon })}
                    className={`text-xl p-2 rounded-lg transition ${
                      formData.icon === icon ? "bg-primary/30 border border-primary" : "bg-muted"
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm text-gray-400 hover:text-white transition"
              >
                Batal
              </button>
              <button
                onClick={handleCreate}
                disabled={submitting || !formData.name || !formData.amount}
                className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="size-4 animate-spin mx-auto" /> : "Tambah"}
              </button>
            </div>
          </div>
        )}

        {/* Subscription List */}
        <div className="space-y-3">
          {subscriptions.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <CreditCard className="size-12 mx-auto text-gray-600 mb-3" />
              <p className="text-sm text-gray-400">Belum ada subscription</p>
              <p className="text-xs text-gray-500 mt-1">Tambah Netflix, Spotify, dll untuk tracking</p>
            </div>
          ) : (
            subscriptions.map((sub) => {
              const daysUntil = getDaysUntil(sub.next_billing_date)
              const isUpcoming = daysUntil <= 3 && daysUntil >= 0
              
              return (
                <div
                  key={sub.id}
                  className={`rounded-xl border bg-card p-4 space-y-2 ${
                    isUpcoming ? "border-yellow-500/50 bg-yellow-500/5" : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{sub.icon}</span>
                      <div>
                        <h3 className="font-semibold text-white">{sub.name}</h3>
                        <p className="text-xs text-gray-400">
                          {formatCurrency(sub.amount)}{getCycleLabel(sub.billing_cycle)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(sub.id)}
                      className="text-gray-500 hover:text-red-400 transition"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className={`${
                      daysUntil < 0 ? "text-red-400" :
                      isUpcoming ? "text-yellow-400" :
                      "text-gray-400"
                    }`}>
                      {daysUntil < 0 ? `Terlambat ${Math.abs(daysUntil)} hari` :
                       daysUntil === 0 ? "Hari ini!" :
                       `${daysUntil} hari lagi`}
                    </span>
                    <span className="text-gray-500">
                      {new Date(sub.next_billing_date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                    </span>
                  </div>

                  {isUpcoming && (
                    <div className="flex items-center gap-2 rounded-lg bg-yellow-500/10 px-3 py-2 text-xs text-yellow-400">
                      <Bell className="size-3" />
                      Tagihan akan jatuh tempo!
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
