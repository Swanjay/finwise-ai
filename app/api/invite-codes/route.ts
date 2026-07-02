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

// POST /api/invite-codes — Create bulk invite codes
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check if user is admin (email ends with @finny.biz.id)
  const email = session.user.email as string
  if (!email.endsWith("@finny.biz.id")) {
    return NextResponse.json({ error: "Only admins can create codes" }, { status: 403 })
  }

  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 })
  }

  try {
    const body = await req.json()
    const { quantity, planTier, max_uses, notes, expiresDays } = body

    if (!["pro", "premium"].includes(planTier)) {
      return NextResponse.json({ error: "Invalid plan tier. Must be 'pro' or 'premium'" }, { status: 400 })
    }

    if (!quantity || quantity < 1 || quantity > 100) {
      return NextResponse.json({ error: "Quantity must be 1-100" }, { status: 400 })
    }

    const userId = (session.user as Record<string, unknown>).id as string

    // Generate codes
    const codes = []
    for (let i = 0; i < quantity; i++) {
      // Format: PRO_XXXX or PREM_XXXX (4 random chars)
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
      const random = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
      const code = planTier === "pro" ? `PRO_${random}` : `PREM_${random}`
      codes.push(code)
    }

    // Insert all codes
    const insertData = codes.map((code) => ({
      code,
      plan_tier: planTier,
      is_active: true,
      max_uses: max_uses || null,
      uses: 0,
      created_by: userId,
      notes: notes || "",
      expires_at: expiresDays ? new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000).toISOString() : null,
    }))

    const { data: newCodes, error: insertError } = await supabase
      .from("invite_codes")
      .insert(insertData)
      .select()

    if (insertError) {
      console.error("[invite_codes] Insert error:", insertError)
      return NextResponse.json({ error: "Gagal membuat kode" }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      codes: newCodes,
      count: newCodes.length,
      plan: planTier,
    })
  } catch (err) {
    console.error("[invite_codes] Error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

// GET /api/invite-codes — List active codes (admin only)
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Only admins can view
  const email = session.user.email as string
  if (!email.endsWith("@finny.biz.id")) {
    return NextResponse.json({ error: "Only admins can view codes" }, { status: 403 })
  }

  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 })
  }

  try {
    const { data: codes, error } = await supabase
      .from("invite_codes")
      .select(`
        id, code, plan_tier, is_active, max_uses, uses,
        created_at, expires_at, notes,
        created_by:created_by(name, email)
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[invite_codes] Fetch error:", error)
      return NextResponse.json({ error: "Gagal memuat kode" }, { status: 500 })
    }

    return NextResponse.json({ ok: true, codes })
  } catch (err) {
    console.error("[invite_codes] Error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

// DELETE /api/invite-codes/:code — Deactivate a code
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const email = session.user.email as string
  if (!email.endsWith("@finny.biz.id")) {
    return NextResponse.json({ error: "Only admins can delete codes" }, { status: 403 })
  }

  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get("code")

    if (!code) {
      return NextResponse.json({ error: "Code parameter required" }, { status: 400 })
    }

    const { error } = await supabase
      .from("invite_codes")
      .update({ is_active: false })
      .eq("code", code)

    if (error) {
      console.error("[invite_codes] Deactivate error:", error)
      return NextResponse.json({ error: "Gagal menonaktifkan kode" }, { status: 500 })
    }

    return NextResponse.json({ ok: true, message: "Kode dinonaktifkan" })
  } catch (err) {
    console.error("[invite_codes] Error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}