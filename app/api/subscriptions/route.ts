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

// POST /api/subscriptions — Create subscription
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
    const { name, amount, currency, billing_cycle, next_billing_date, category, icon, color, auto_renew, notes } = body

    if (!name || !amount || !billing_cycle || !next_billing_date) {
      return NextResponse.json({ error: "Nama, amount, billing cycle, dan tanggal wajib diisi" }, { status: 400 })
    }

    const userId = (session.user as Record<string, unknown>).id as string

    const { data: subscription, error: createError } = await supabase
      .from("subscriptions")
      .insert({
        user_id: userId,
        name: name.trim(),
        amount: Number(amount),
        currency: currency || "IDR",
        billing_cycle,
        next_billing_date,
        category: category || "Subscription",
        icon: icon || "📦",
        color: color || "#6366f1",
        auto_renew: auto_renew !== false,
        notes: notes?.trim() || "",
      })
      .select()
      .single()

    if (createError) {
      console.error("[subscriptions] Create error:", createError)
      return NextResponse.json({ error: "Gagal membuat subscription" }, { status: 500 })
    }

    return NextResponse.json({ ok: true, subscription })
  } catch (err) {
    console.error("[subscriptions] Error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

// GET /api/subscriptions — List user's subscriptions
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 })
  }

  try {
    const userId = (session.user as Record<string, unknown>).id as string

    const { data: subscriptions, error: fetchError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("next_billing_date", { ascending: true })

    if (fetchError) {
      console.error("[subscriptions] Fetch error:", fetchError)
      return NextResponse.json({ error: "Gagal mengambil data subscription" }, { status: 500 })
    }

    // Calculate monthly total
    const monthlyTotal = subscriptions?.reduce((sum, sub) => {
      const amount = Number(sub.amount)
      switch (sub.billing_cycle) {
        case "weekly": return sum + (amount * 4.33) // ~4.33 weeks per month
        case "monthly": return sum + amount
        case "quarterly": return sum + (amount / 3)
        case "yearly": return sum + (amount / 12)
        default: return sum + amount
      }
    }, 0) || 0

    return NextResponse.json({
      subscriptions,
      monthlyTotal: Math.round(monthlyTotal),
      count: subscriptions?.length || 0,
    })
  } catch (err) {
    console.error("[subscriptions] Error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

// DELETE /api/subscriptions — Deactivate subscription
export async function DELETE(req: Request) {
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
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: "ID subscription wajib diisi" }, { status: 400 })
    }

    const userId = (session.user as Record<string, unknown>).id as string

    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId)

    if (updateError) {
      console.error("[subscriptions] Delete error:", updateError)
      return NextResponse.json({ error: "Gagal menghapus subscription" }, { status: 500 })
    }

    return NextResponse.json({ ok: true, message: "Subscription dihapus" })
  } catch (err) {
    console.error("[subscriptions] Error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
