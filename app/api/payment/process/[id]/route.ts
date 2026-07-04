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

// GET /api/payment/process/[id]
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  const { id } = await params
  
  if (!id) {
    return NextResponse.json({ error: "Transaction ID required" }, { status: 400 })
  }

  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 })
  }

  try {
    const userId = (session.user as Record<string, unknown>).id as string
    
    const { data: transaction, error: fetchError } = await supabase
      .from("payment_transactions")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single()

    if (fetchError || !transaction) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 })
    }

    // Block automatic auto-complete payload bypass.
    // Advise the user to use a voucher code instead.
    return NextResponse.json({
      error: "Integrasi sistem pembayaran dinonaktifkan. Silakan hubungi admin atau gunakan Kode Voucher di Dashboard untuk upgrade akun.",
      success: false
    }, { status: 403 })
  } catch (err) {
    console.error("[payment/process] Error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
