import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { createClient } from "@supabase/supabase-js"
import { rateLimitMiddleware } from "@/lib/rate-limit-kv"

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

// POST /api/voucher/redeem — Redeem voucher to upgrade plan
export async function POST(req: Request) {
  // Rate limit: 5 attempts per minute per IP (prevent brute-force voucher codes)
  const rateLimitResponse = await rateLimitMiddleware(req, { windowMs: 60_000, max: 5 })
  if (rateLimitResponse) return rateLimitResponse

  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized", success: false }, { status: 401 })
  }

  const userId = (session.user as Record<string, unknown>).id as string

  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured", success: false }, { status: 500 })
  }

  const body = await req.json().catch(() => ({}))
  const code = body.code?.toUpperCase().trim()

  if (!code) {
    return NextResponse.json({ error: "Kode voucher diperlukan", success: false }, { status: 400 })
  }

  try {
    // Check if voucher exists and is valid
    const { data: voucher, error: voucherError } = await supabase
      .from("invite_codes")
      .select(`id, code, plan_tier, is_active, max_uses, uses, expires_at`)
      .eq("code", code)
      .single()

    if (voucherError || !voucher) {
      return NextResponse.json({ error: "Kode voucher tidak ditemukan", success: false }, { status: 404 })
    }

    // Check if expired
    if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) {
      return NextResponse.json({ error: "Kode voucher sudah kedaluwarsa", success: false }, { status: 400 })
    }

    // Check if active
    if (!voucher.is_active) {
      return NextResponse.json({ error: "Kode voucher tidak aktif", success: false }, { status: 400 })
    }

    // Check if max uses reached
    if (voucher.max_uses !== null && voucher.uses >= voucher.max_uses) {
      return NextResponse.json({ error: "Kode voucher sudah mencapai batas maksimal", success: false }, { status: 400 })
    }

    // Check if user already redeemed this voucher
    const { data: existingRedemption } = await supabase
      .from("users_plan")
      .select("source_code")
      .eq("user_id", userId)
      .eq("source_code", code)
      .single()

    if (existingRedemption) {
      return NextResponse.json({ error: "Kode voucher sudah pernah digunakan", success: false }, { status: 400 })
    }

    // Calculate mock expiry date (30 days from now) for response
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    // Update user's plan
    const { error: updateError } = await supabase
      .from("users_plan")
      .upsert({
        user_id: userId,
        plan_tier: voucher.plan_tier,
        source_code: code,
        assigned_at: new Date().toISOString(),
      })

    if (updateError) {
      console.error("[voucher/redeem] Error updating plan:", updateError)
      return NextResponse.json({ error: "Gagal mengaktifkan voucher", success: false }, { status: 500 })
    }

    // Increment voucher usage count
    const { error: incrementError } = await supabase
      .from("invite_codes")
      .update({ uses: voucher.uses + 1 })
      .eq("id", voucher.id)

    if (incrementError) {
      console.error("[voucher/redeem] Error incrementing uses:", incrementError)
    }

    // Log usage
    await supabase.from("invite_usage").insert({
      code: voucher.code,
      user_id: userId,
      email: session.user.email,
      used_at: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      plan_tier: voucher.plan_tier,
      expires_at: expiresAt.toISOString(),
      message: `Voucher berhasil! Kamu sekarang paket ${voucher.plan_tier.toUpperCase()}`,
    })
  } catch (err) {
    console.error("[voucher/redeem] Error:", err)
    return NextResponse.json({ error: "Server error", success: false }, { status: 500 })
  }
}
