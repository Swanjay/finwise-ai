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

// GET /api/invite-codes/validate/:code — Validate an invite code
export async function GET(
  req: Request,
  { params }: { params: { code: string } }
) {
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 })
  }

  const code = params.code?.toUpperCase().trim()
  if (!code) {
    return NextResponse.json({ error: "Code required" }, { status: 400 })
  }

  try {
    // Check if code exists and is active
    const { data: codeEntry, error: codeError } = await supabase
      .from("invite_codes")
      .select(`
        id, code, plan_tier, is_active, max_uses, uses, expires_at,
        created_by:created_by(email)
      `)
      .eq("code", code)
      .single()

    if (codeError || !codeEntry) {
      return NextResponse.json({ error: "Kode tidak ditemukan", valid: false }, { status: 404 })
    }

    // Check if expired
    if (codeEntry.expires_at && new Date(codeEntry.expires_at) < new Date()) {
      return NextResponse.json({ error: "Kode sudah kedaluwarsa", valid: false }, { status: 400 })
    }

    // Check if active
    if (!codeEntry.is_active) {
      return NextResponse.json({ error: "Kode tidak aktif", valid: false }, { status: 400 })
    }

    // Check if max uses reached
    if (codeEntry.max_uses !== null && codeEntry.uses >= codeEntry.max_uses) {
      return NextResponse.json({ error: "Kode sudah mencapai batas maksimal", valid: false }, { status: 400 })
    }

    return NextResponse.json({
      valid: true,
      code: codeEntry.code,
      plan_tier: codeEntry.plan_tier,
      created_by: codeEntry.created_by?.email,
    })
  } catch (err) {
    console.error("[invite/validate] Error:", err)
    return NextResponse.json({ error: "Server error", valid: false }, { status: 500 })
  }
}

// POST /api/invite-codes/use — Use an invite code (assign plan to user)
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 })
  }

  try {
    const body = await req.json()
    const { code } = body

    if (!code) {
      return NextResponse.json({ error: "Code required" }, { status: 400 })
    }

    const codeUpper = code.toUpperCase().trim()
    const userId = (session.user as Record<string, unknown>).id as string

    // Check if user already has a plan
    const { data: existingPlan, error: planError } = await supabase
      .from("users_plan")
      .select("plan_tier")
      .eq("user_id", userId)
      .single()

    if (planError && planError.code !== "PGRST116") {
      console.error("[invite/use] Plan check error:", planError)
      return NextResponse.json({ error: "Gagal memeriksa paket saat ini" }, { status: 500 })
    }

    if (existingPlan && existingPlan.plan_tier !== "basic") {
      return NextResponse.json({ error: "Paket sudah diaktifkan", currentPlan: existingPlan.plan_tier }, { status: 400 })
    }

    // Check code validity
    const { data: codeEntry, error: codeError } = await supabase
      .from("invite_codes")
      .select("id, plan_tier, uses, max_uses")
      .eq("code", codeUpper)
      .single()

    if (codeError || !codeEntry) {
      return NextResponse.json({ error: "Kode tidak valid" }, { status: 404 })
    }

    // Check if active
    if (!codeEntry.is_active) {
      return NextResponse.json({ error: "Kode tidak aktif" }, { status: 400 })
    }

    // Check uses
    if (codeEntry.max_uses !== null && codeEntry.uses >= codeEntry.max_uses) {
      return NextResponse.json({ error: "Kode sudah habis" }, { status: 400 })
    }

    // Update code uses
    await supabase
      .from("invite_codes")
      .update({ uses: codeEntry.uses + 1 })
      .eq("id", codeEntry.id)

    // Insert user plan
    const { error: insertError } = await supabase
      .from("users_plan")
      .insert({
        user_id: userId,
        plan_tier: codeEntry.plan_tier,
        source_code: codeUpper,
        assigned_by: codeEntry.created_by,
      })

    if (insertError) {
      console.error("[invite/use] Insert error:", insertError)
      return NextResponse.json({ error: "Gagal mengaktifkan paket" }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      plan_tier: codeEntry.plan_tier,
      codeUsed: codeUpper,
    })
  } catch (err) {
    console.error("[invite/use] Error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}