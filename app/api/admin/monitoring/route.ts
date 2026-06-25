import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import bcrypt from "bcryptjs"

const ADMIN_USER = process.env.ADMIN_USER || "fure"
const ADMIN_PASS_HASH = process.env.ADMIN_PASS_HASH || ""

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

function checkAuth(req: Request): boolean {
  const cookie = req.headers.get("cookie") || ""
  const match = cookie.match(/fw-admin-session=([^;]+)/)
  if (!match) return false
  try {
    const val = decodeURIComponent(match[1])
    const [user, hash] = val.split(":")
    if (user !== ADMIN_USER) return false
    return bcrypt.compareSync(ADMIN_PASS_HASH, hash)
  } catch {
    return false
  }
}

// Suspicious email patterns
const DISPOSABLE_DOMAINS = [
  "tempmail.com", "throwaway.email", "guerrillamail.com", "mailinator.com",
  "yopmail.com", "trashmail.com", "10minutemail.com", "fakeinbox.com",
  "sharklasers.com", "guerrillamailblock.com", "grr.la", "dispostable.com",
  "temp-mail.org", "tempail.com", "tempr.email", "discard.email",
  "discardmail.com", "mailnesia.com", "maildrop.cc", "throwaway.email",
]

function isSuspiciousEmail(email: string): string | null {
  const domain = email.split("@")[1]?.toLowerCase()
  if (!domain) return "Format invalid"
  
  // Disposable domain check
  if (DISPOSABLE_DOMAINS.includes(domain)) return "Disposable email"
  
  // Random pattern check (e.g., xkdk291@gmail.com)
  const localPart = email.split("@")[0]
  if (/^[a-z]{0,3}\d{4,}$/i.test(localPart)) return "Random pattern"
  if (/^[a-z0-9]{8,}$/i.test(localPart) && /[0-9]/.test(localPart) && localPart.length > 10) return "Possible random"
  
  return null
}

export async function GET(req: Request) {
  // Check auth via cookie
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 })
  }

  try {
    // Get all credentials
    const { data: allCreds, error } = await supabase
      .from("user_credentials")
      .select("user_id, created_at")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[monitoring] Error:", error)
      return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 })
    }

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // Stats
    const total = allCreds.length
    const today = allCreds.filter(r => new Date(r.created_at) >= todayStart).length
    const thisWeek = allCreds.filter(r => new Date(r.created_at) >= weekStart).length
    const thisMonth = allCreds.filter(r => new Date(r.created_at) >= monthStart).length

    // Last 7 days for chart
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate())
      const dayEnd = new Date(dayStart)
      dayEnd.setDate(dayEnd.getDate() + 1)
      
      const count = allCreds.filter(r => {
        const created = new Date(r.created_at)
        return created >= dayStart && created < dayEnd
      }).length

      return {
        date: dayStart.toISOString().split("T")[0],
        count,
      }
    }).reverse()

    // Recent registrations (last 50)
    const recent = allCreds.slice(0, 50).map(r => {
      const email = r.user_id.replace("email:", "")
      const flag = isSuspiciousEmail(email)
      return {
        email,
        created_at: r.created_at,
        flag,
      }
    })

    // Suspicious emails
    const suspicious = recent.filter(r => r.flag !== null)
    const suspiciousCount = suspicious.length

    // IP analysis - check for multiple registrations from same source
    // (user_credentials doesn't store IP, but we can flag based on email patterns)
    const disposableCount = allCreds.filter(r => {
      const email = r.user_id.replace("email:", "")
      return isSuspiciousEmail(email) === "Disposable email"
    }).length

    // Alerts
    const alerts: string[] = []
    if (today > 20) alerts.push(`⚠️ High registration rate: ${today} today`)
    if (suspiciousCount > 5) alerts.push(`🚨 Multiple suspicious emails detected`)
    if (disposableCount > 3) alerts.push(`🔴 Disposable email abuse detected`)
    
    // Rate check (if > 10 in last hour)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const lastHour = allCreds.filter(r => new Date(r.created_at) >= oneHourAgo).length
    if (lastHour > 10) alerts.push(`⚡ ${lastHour} registrations in last hour`)

    return NextResponse.json({
      stats: {
        total,
        today,
        thisWeek,
        thisMonth,
        suspicious: suspiciousCount,
        disposable: disposableCount,
      },
      last7Days,
      recent,
      alerts,
    })
  } catch (err) {
    console.error("[monitoring] Error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
