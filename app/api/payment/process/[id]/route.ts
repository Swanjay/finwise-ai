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

// GET /api/payment/process/[id] — Process payment (frontend redirects here)
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // Extract transaction ID from URL
  const url = new URL(req.url)
  const pathParts = url.pathname.split('/')
  const transactionId = pathParts[pathParts.length - 1]
  
  if (!transactionId) {
    return NextResponse.json({ error: "Transaction ID required" }, { status: 400 })
  }

  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 })
  }

  try {
    // Verify transaction belongs to user and is pending
    const userId = (session.user as Record<string, unknown>).id as string
    
    const { data: transaction, error: fetchError } = await supabase
      .from("payment_transactions")
      .select("*")
      .eq("id", transactionId)
      .eq("user_id", userId)
      .eq("status", "pending")
      .single()

    if (fetchError || !transaction) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan atau sudah diproses" }, { status: 404 })
    }

    // TODO: Integrate with actual payment gateway (Midtrans/Xendit)
    // For demo, simulate payment success after 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000))

    // In real implementation, this would be handled by webhook
    // But for demo, we'll update the transaction and user plan directly
    const { error: updateError } = await supabase
      .from("payment_transactions")
      .update({
        status: "completed",
        paid_at: new Date().toISOString(),
        payment_method: "demo_gateway",
        gateway_response: {
          status: "success",
          message: "Demo payment successful",
          transaction_id: `demo_${Date.now()}`,
        },
      })
      .eq("id", transactionId)

    if (updateError) {
      console.error("[payment/process] Update transaction error:", updateError)
      return NextResponse.json({ error: "Gagal memperbarui transaksi" }, { status: 500 })
    }

    // Update user plan
    const { error: planError } = await supabase
      .from("users_plan")
      .upsert({
        user_id: userId,
        plan_tier: transaction.plan_tier,
        source_code: `PAYMENT_${transactionId.substring(0, 8)}`,
        assigned_at: new Date().toISOString(),
      })

    if (planError) {
      console.error("[payment/process] Update plan error:", planError)
      // Don't fail the whole process if plan update fails, just log
    }

    // Redirect to success page
    return NextResponse.redirect(new URL(`/payment/success?plan=${transaction.plan_tier}`, req.url))
  } catch (err) {
    console.error("[payment/process] Error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}