import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

// POST /api/payment/webhook — Handle payment gateway webhook
export async function POST(req: Request) {
  // Verify webhook signature (implement based on payment gateway)
  // This is critical for security - only accept from trusted gateways
  
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 })
  }

  try {
    const body = await req.json()
    
    // Extract payment gateway specific data
    // This will vary depending on which gateway you use (Midtrans, Xendit, etc.)
    const gateway = req.headers.get("user-agent") || ""
    let transactionId, status, orderId
    
    if (gateway.includes("midtrans")) {
      // Midtrans webhook format
      transactionId = body.transaction_id
      status = body.transaction_status
      orderId = body.order_id
    } else if (gateway.includes("xendit")) {
      // Xendit webhook format
      transactionId = body.id
      status = body.status
      orderId = body.external_id
    } else {
      // Generic format
      transactionId = body.transaction_id || body.id
      status = body.status
      orderId = body.order_id || body.external_id
    }

    if (!transactionId || !status) {
      return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 })
    }

    // Update transaction status in database
    const { data: transaction, error: fetchError } = await supabase
      .from("payment_transactions")
      .select("id, user_id, plan_tier, status")
      .eq("id", transactionId)
      .single()

    if (fetchError || !transaction) {
      console.error("[webhook] Transaction not found:", transactionId)
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    // Only update if status changed
    if (transaction.status === status) {
      return NextResponse.json({ ok: true, message: "Status unchanged" })
    }

    let newPlanTier: string | null = null
    let newStatus: string

    switch (status) {
      case "settlement":
      case "capture":
      case "success":
        newStatus = "completed"
        newPlanTier = transaction.plan_tier // Apply the plan
        break
      case "cancel":
      case "expire":
      case "failure":
        newStatus = "failed"
        break
      case "pending":
      case "challenge":
        newStatus = "pending"
        break
      default:
        newStatus = status
    }

    // Update transaction
    const { error: updateError } = await supabase
      .from("payment_transactions")
      .update({
        status: newStatus,
        paid_at: status.includes("success") || status === "settlement" ? new Date().toISOString() : null,
        gateway_response: body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transactionId)

    if (updateError) {
      console.error("[webhook] Update transaction error:", updateError)
      return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 })
    }

    // If payment successful, update user plan in settings table (key-value store, no FK constraints)
    if (newPlanTier && newStatus === "completed") {
      const { error: planError } = await supabase
        .from("settings")
        .upsert([
          { user_id: transaction.user_id, key: "plan_tier", value: newPlanTier },
          { user_id: transaction.user_id, key: "plan_assigned_at", value: new Date().toISOString() },
          { user_id: transaction.user_id, key: "plan_source_code", value: `WEBHOOK_${transactionId.substring(0, 8)}` },
        ], { onConflict: "user_id,key" })

      if (planError) {
        console.error("[webhook] Update plan error:", planError)
        // Don't fail webhook, just log
      }
    }

    return NextResponse.json({ ok: true, processed: true })
  } catch (err) {
    console.error("[payment/webhook] Error:", err)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}