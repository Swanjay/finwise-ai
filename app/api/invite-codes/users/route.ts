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
    // Get plan tiers from settings table (key-value store)
    const { data: planSettings, error: plansError } = await supabase
      .from("settings")
      .select("user_id, key, value")
      .in("key", ["plan_tier", "plan_assigned_at", "plan_source_code"])
      .order("user_id")

    if (plansError) {
      console.error("[invite-codes/users] Fetch plans error:", plansError)
      return NextResponse.json({ error: "Gagal memuat data user" }, { status: 500 })
    }

    // Group settings by user_id
    const userMap: Record<string, Record<string, string>> = {}
    for (const row of planSettings || []) {
      if (!userMap[row.user_id]) userMap[row.user_id] = {}
      userMap[row.user_id][row.key] = row.value
    }

    // Build user list
    const users = Object.entries(userMap).map(([userId, settings]) => ({
      user_id: userId,
      plan_tier: settings.plan_tier || "basic",
      source_code: settings.plan_source_code || null,
      assigned_at: settings.plan_assigned_at || null,
      email: userId.startsWith("email:") ? userId.replace("email:", "") : userId,
    }))

    return NextResponse.json({
      ok: true,
      users,
    })
  } catch (err) {
    console.error("[invite-codes/users] Error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
