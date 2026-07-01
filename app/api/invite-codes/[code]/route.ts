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

// GET /api/invite-codes/[code] — Validate an invite code
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
        created_by
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
      created_by: null,
    })
  } catch (err) {
    console.error("[invite/validate] Error:", err)
    return NextResponse.json({ error: "Server error", valid: false }, { status: 500 })
  }
}