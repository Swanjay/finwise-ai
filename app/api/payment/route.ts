import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { createClient } from "@supabase/supabase-js"
import { PlanTier } from "@/lib/plans"

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

// POST /api/payment/create — Create payment transaction
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
    const { plan_tier, payment_method } = body

    if (!plan_tier || !["pro", "premium"].includes(plan_tier)) {
      return NextResponse.json({ error: "Plan tier required (pro/premium)" }, { status: 400 })
    }

    const userId = (session.user as Record<string, unknown>).id as string
    const email = session.user.email as string

    // Create pending transaction in database
    const { data: transaction, error: insertError } = await supabase
      .from("payment_transactions")
      .insert({
        user_id: userId,
        email: email,
        plan_tier: plan_tier as PlanTier,
        amount: plan_tier === "pro" ? 10000 : plan_tier === "premium" ? 20000 : 0,
        currency: "IDR",
        status: "pending",
        payment_method: payment_method || "manual", // Will be updated by webhook
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error("[payment/create] Insert error:", insertError)
      return NextResponse.json({ error: "Gagal membuat transaksi" }, { status: 500 })
    }

    // TODO: Integrate with payment gateway (Midtrans/Xendit)
    // For now, return transaction ID for demo purposes
    return NextResponse.json({
      ok: true,
      transaction_id: transaction.id,
      plan_tier: transaction.plan_tier,
      amount: transaction.amount,
      redirect_url: `/payment/process/${transaction.id}`,
    })
  } catch (err) {
    console.error("[payment/create] Error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}