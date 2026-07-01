import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

// GET /api/invite-codes/users — Get all users with their plan tiers
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Only admins can view
  const email = session.user.email as string
  if (!email.endsWith("@finny.biz.id")) {
    return NextResponse.json({ error: "Only admins can view users" }, { status: 403 })
  }

  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 })
  }

  try {
    const { data: users, error } = await supabase
      .from("users_plan")
      .select(`
        user_id, plan_tier, source_code, assigned_at,
        user:auth.users(email)
      `)
      .order("assigned_at", { ascending: false })

    if (error) {
      console.error("[invite-codes/users] Fetch error:", error)
      return NextResponse.json({ error: "Gagal memuat data user" }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      users: users.map(u => ({
        user_id: u.user_id,
        plan_tier: u.plan_tier,
        source_code: u.source_code,
        assigned_at: u.assigned_at,
        email: u.user?.email || "unknown"
      }))
    })
  } catch (err) {
    console.error("[invite-codes/users] Error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}