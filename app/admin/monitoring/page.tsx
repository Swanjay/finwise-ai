"use client"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Loader2, AlertTriangle, TrendingUp, Users, Calendar, Shield, RefreshCw } from "lucide-react"

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
  const { data: session, status } = useSession()
  const [data, setData] = useState<MonitoringData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  async function fetchData() {
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
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#d5f5f0] flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#2cb5a0]" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#d5f5f0] flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 shadow-lg text-center max-w-md">
          <Shield className="size-12 mx-auto text-red-400 mb-4" />
          <h1 className="text-xl font-bold text-gray-800 mb-2">Access Denied</h1>
          <p className="text-gray-600">Please login to access monitoring.</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#d5f5f0] flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 shadow-lg text-center max-w-md">
          <AlertTriangle className="size-12 mx-auto text-red-400 mb-4" />
          <h1 className="text-xl font-bold text-gray-800 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button onClick={fetchData} className="bg-[#2cb5a0] text-white px-6 py-2 rounded-xl font-semibold hover:bg-[#1a8f7d]">
            Retry
          </button>
        </div>
      </div>
    )
  }

  const maxDay = Math.max(...(data?.last7Days.map(d => d.count) || [1]))

  return (
    <div className="min-h-screen bg-[#d5f5f0] p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#1a3d36] flex items-center gap-2">
              <Shield className="size-8 text-[#2cb5a0]" />
              Admin Monitoring
            </h1>
            <p className="text-[#6b9a91] text-sm mt-1">User registration analytics & abuse detection</p>
          </div>
          <button onClick={fetchData} className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition text-[#2cb5a0] font-semibold text-sm">
            <RefreshCw className="size-4" />
            Refresh
          </button>
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
          <h2 className="text-lg font-bold text-[#1a3d36] mb-4 flex items-center gap-2">
            <TrendingUp className="size-5 text-[#2cb5a0]" />
            Registrations (Last 7 Days)
          </h2>
          <div className="flex items-end gap-3 h-40">
            {data?.last7Days.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-xs font-bold text-[#2cb5a0]">{day.count}</div>
                <div className="w-full bg-[#e2f3ef] rounded-t-xl relative" style={{ height: `${(day.count / maxDay) * 100}%`, minHeight: day.count > 0 ? "20px" : "4px" }}>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#2cb5a0] to-[#8eddd0] rounded-t-xl opacity-80" />
                </div>
                <div className="text-[10px] text-[#82b0a6] font-medium">
                  {new Date(day.date).toLocaleDateString("id-ID", { weekday: "short" })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Registrations */}
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#1a3d36] mb-4 flex items-center gap-2">
            <Users className="size-5 text-[#2cb5a0]" />
            Recent Registrations ({data?.recent.length || 0})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e2f3ef]">
                  <th className="text-left py-2 px-3 text-[#6b9a91] font-semibold">Email</th>
                  <th className="text-left py-2 px-3 text-[#6b9a91] font-semibold">Created</th>
                  <th className="text-left py-2 px-3 text-[#6b9a91] font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.recent.map((reg, i) => (
                  <tr key={i} className={`border-b border-[#f0faf8] hover:bg-[#f0faf8] transition ${reg.flag ? "bg-red-50" : ""}`}>
                    <td className="py-2.5 px-3 font-mono text-xs text-[#1a3d36]">{reg.email}</td>
                    <td className="py-2.5 px-3 text-[#6b9a91] text-xs whitespace-nowrap">
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
                    <td colSpan={3} className="py-8 text-center text-[#82b0a6]">No registrations yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-xs text-[#82b0a6]">
          <p>FinWise Admin Monitoring • Auto-refresh available</p>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  const colors: Record<string, { bg: string; text: string; icon: string }> = {
    teal: { bg: "bg-[#e8f7f3]", text: "text-[#1a8f7d]", icon: "text-[#2cb5a0]" },
    blue: { bg: "bg-blue-50", text: "text-blue-700", icon: "text-blue-500" },
    green: { bg: "bg-green-50", text: "text-green-700", icon: "text-green-500" },
    red: { bg: "bg-red-50", text: "text-red-700", icon: "text-red-500" },
  }
  const c = colors[color] || colors.teal

  return (
    <div className={`${c.bg} rounded-2xl p-4 shadow-sm`}>
      <div className={`${c.icon} mb-2`}>{icon}</div>
      <div className={`text-2xl font-extrabold ${c.text}`}>{value}</div>
      <div className="text-xs text-[#6b9a91] font-medium mt-1">{label}</div>
    </div>
  )
}
