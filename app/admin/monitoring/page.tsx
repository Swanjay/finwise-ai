"use client"
import { useState, useEffect, useCallback } from "react"
import { Loader2, AlertTriangle, TrendingUp, Users, Calendar, Shield, RefreshCw, LogIn, LogOut } from "lucide-react"

interface Stats {
  total: number
  today: number
  thisWeek: number
  thisMonth: number
  suspicious: number
  disposable: number
}

interface DayData {
  date: string
  count: number
}

interface Registration {
  email: string
  created_at: string
  flag: string | null
}

interface MonitoringData {
  stats: Stats
  last7Days: DayData[]
  recent: Registration[]
  alerts: string[]
}

export default function MonitoringPage() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [checking, setChecking] = useState(true)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [loggingIn, setLoggingIn] = useState(false)

  const [data, setData] = useState<MonitoringData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Check cookie on mount
  useEffect(() => {
    const cookie = document.cookie.match(/fw-admin=([^;]+)/)
    if (cookie) {
      // Verify cookie is valid by trying to fetch
      fetch("/api/admin/monitoring").then(r => {
        if (r.ok) {
          setLoggedIn(true)
          r.json().then(json => { setData(json); setLoading(false) })
        } else {
          setLoggedIn(false)
          setLoading(false)
        }
      }).catch(() => { setLoggedIn(false); setLoading(false) })
    } else {
      setLoggedIn(false)
      setLoading(false)
    }
    setChecking(false)
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoggingIn(true)
    setLoginError("")
    try {
      const res = await fetch("/api/admin/codes-simple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", user: username, pass: password }),
      })
      const json = await res.json()
      if (json.ok) {
        setLoggedIn(true)
        fetchData()
      } else {
        setLoginError(json.error || "Login gagal")
      }
    } catch {
      setLoginError("Koneksi gagal")
    }
    setLoggingIn(false)
  }

  function handleLogout() {
    document.cookie = "fw-admin=; path=/; max-age=0"
    setLoggedIn(false)
    setData(null)
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/admin/monitoring")
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to fetch")
      }
      const json = await res.json()
      setData(json)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load data")
    }
    setLoading(false)
  }, [])

  // ── Checking auth ──
  if (checking) {
    return (
      <div className="min-h-screen bg-[#f0f5e8] flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#2ead4b]" />
      </div>
    )
  }

  // ── Login form ──
  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-[#f0f5e8] flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 shadow-lg text-center max-w-sm w-full">
          <Shield className="size-12 mx-auto text-[#2ead4b] mb-4" />
          <h1 className="text-xl font-bold text-gray-800 mb-2">Admin Monitoring</h1>
          <p className="text-gray-500 text-sm mb-6">Masukkan kredensial admin untuk akses</p>
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#2ead4b]"
              autoFocus
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#2ead4b]"
            />
            {loginError && <p className="text-red-500 text-xs">{loginError}</p>}
            <button
              type="submit"
              disabled={loggingIn}
              className="w-full flex items-center justify-center gap-2 bg-[#2ead4b] text-white py-2.5 rounded-xl font-semibold hover:bg-[#2ead4b] transition disabled:opacity-50"
            >
              {loggingIn ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
              Login
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── Loading data ──
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f5e8] flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#2ead4b]" />
      </div>
    )
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="min-h-screen bg-[#f0f5e8] flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 shadow-lg text-center max-w-md">
          <AlertTriangle className="size-12 mx-auto text-red-400 mb-4" />
          <h1 className="text-xl font-bold text-gray-800 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <button onClick={fetchData} className="bg-[#2ead4b] text-white px-6 py-2 rounded-xl font-semibold hover:bg-[#2ead4b]">
              Retry
            </button>
            <button onClick={handleLogout} className="bg-gray-200 text-gray-700 px-6 py-2 rounded-xl font-semibold hover:bg-gray-300">
              Logout
            </button>
          </div>
        </div>
      </div>
    )
  }

  const maxDay = Math.max(...(data?.last7Days.map(d => d.count) || [1]))

  return (
    <div className="min-h-screen bg-[#f0f5e8] p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#0e0f0c] flex items-center gap-2">
              <Shield className="size-8 text-[#2ead4b]" />
              Admin Monitoring
            </h1>
            <p className="text-[#868685] text-sm mt-1">User registration analytics & abuse detection</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => fetchData()} className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition text-[#2ead4b] font-semibold text-sm">
              <RefreshCw className="size-4" />
              Refresh
            </button>
            <button onClick={handleLogout} className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition text-gray-500 font-semibold text-sm">
              <LogOut className="size-4" />
              Logout
            </button>
          </div>
        </div>

        {/* Alerts */}
        {data?.alerts && data.alerts.length > 0 && (
          <div className="mb-6 space-y-2">
            {data.alerts.map((alert, i) => (
              <div key={i} className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-red-700">
                <AlertTriangle className="size-4 shrink-0" />
                {alert}
              </div>
            ))}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={<Users className="size-5" />} label="Total Users" value={data?.stats.total || 0} color="teal" />
          <StatCard icon={<Calendar className="size-5" />} label="Today" value={data?.stats.today || 0} color="blue" />
          <StatCard icon={<TrendingUp className="size-5" />} label="This Week" value={data?.stats.thisWeek || 0} color="green" />
          <StatCard icon={<Shield className="size-5" />} label="Suspicious" value={data?.stats.suspicious || 0} color="red" />
        </div>

        {/* Chart */}
        <div className="bg-white rounded-3xl p-6 shadow-sm mb-8">
          <h2 className="text-lg font-bold text-[#0e0f0c] mb-4 flex items-center gap-2">
            <TrendingUp className="size-5 text-[#2ead4b]" />
            Registrations (Last 7 Days)
          </h2>
          <div className="flex items-end gap-3 h-40">
            {data?.last7Days.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-xs font-bold text-[#2ead4b]">{day.count}</div>
                <div className="w-full bg-[#e8ebe6] rounded-t-xl relative" style={{ height: `${(day.count / maxDay) * 100}%`, minHeight: day.count > 0 ? "20px" : "4px" }}>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#2ead4b] to-[#9fe870] rounded-t-xl opacity-80" />
                </div>
                <div className="text-[10px] text-[#868685] font-medium">
                  {new Date(day.date).toLocaleDateString("id-ID", { weekday: "short" })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Registrations */}
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#0e0f0c] mb-4 flex items-center gap-2">
            <Users className="size-5 text-[#2ead4b]" />
            Recent Registrations ({data?.recent.length || 0})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e8ebe6]">
                  <th className="text-left py-2 px-3 text-[#868685] font-semibold">Email</th>
                  <th className="text-left py-2 px-3 text-[#868685] font-semibold">Created</th>
                  <th className="text-left py-2 px-3 text-[#868685] font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.recent.map((reg, i) => (
                  <tr key={i} className={`border-b border-[#FFFFFF] hover:bg-[#FFFFFF] transition ${reg.flag ? "bg-red-50" : ""}`}>
                    <td className="py-2.5 px-3 font-mono text-xs text-[#0e0f0c]">{reg.email}</td>
                    <td className="py-2.5 px-3 text-[#868685] text-xs whitespace-nowrap">
                      {new Date(reg.created_at).toLocaleString("id-ID", { 
                        day: "2-digit", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit"
                      })}
                    </td>
                    <td className="py-2.5 px-3">
                      {reg.flag ? (
                        <span className="inline-flex items-center gap-1 bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs font-semibold">
                          <AlertTriangle className="size-3" />
                          {reg.flag}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-green-100 text-green-600 px-2 py-0.5 rounded-full text-xs font-semibold">
                          ✓ OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {(!data?.recent || data.recent.length === 0) && (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-[#868685]">No registrations yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-xs text-[#868685]">
          <p>FinWise Admin Monitoring • Auto-refresh available</p>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  const colors: Record<string, { bg: string; text: string; icon: string }> = {
    teal: { bg: "bg-[#e2f6d5]", text: "text-[#2ead4b]", icon: "text-[#2ead4b]" },
    blue: { bg: "bg-blue-50", text: "text-blue-700", icon: "text-blue-500" },
    green: { bg: "bg-green-50", text: "text-green-700", icon: "text-green-500" },
    red: { bg: "bg-red-50", text: "text-red-700", icon: "text-red-500" },
  }
  const c = colors[color] || colors.teal

  return (
    <div className={`${c.bg} rounded-2xl p-4 shadow-sm`}>
      <div className={`${c.icon} mb-2`}>{icon}</div>
      <div className={`text-2xl font-extrabold ${c.text}`}>{value}</div>
      <div className="text-xs text-[#868685] font-medium mt-1">{label}</div>
    </div>
  )
}
