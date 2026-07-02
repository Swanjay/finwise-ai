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
    // Get users with plan info first
    const { data: plans, error: plansError } = await supabase
      .from("users_plan")
      .select(`
        user_id, plan_tier, source_code, assigned_at
      `)
      .order("assigned_at", { ascending: false })

    if (plansError) {
      console.error("[invite-codes/users] Fetch plans error:", plansError)
      return NextResponse.json({ error: "Gagal memuat data user" }, { status: 500 })
    }

    // Then get email for each user separately
    const usersWithEmail = []
    for (const plan of plans || []) {
      const { data: userData } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", plan.user_id)
        .single()

      usersWithEmail.push({
        user_id: plan.user_id,
        plan_tier: plan.plan_tier,
        source_code: plan.source_code,
        assigned_at: plan.assigned_at,
        email: userData?.email || "unknown"
      })
    }

    return NextResponse.json({
      ok: true,
      users: usersWithEmail
    })
  } catch (err) {
    console.error("[invite-codes/users] Error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}