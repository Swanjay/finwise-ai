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

// POST /api/households/approve — Approve/reject member
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
    const { household_id, member_user_id, action } = body

    if (!household_id || !member_user_id || !action) {
      return NextResponse.json({ error: "Parameter tidak lengkap" }, { status: 400 })
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Action harus approve atau reject" }, { status: 400 })
    }

    const userId = (session.user as Record<string, unknown>).id as string

    // Verify user is owner of the household
    const { data: household, error: findError } = await supabase
      .from("households")
      .select("id, created_by")
      .eq("id", household_id)
      .single()

    if (findError || !household) {
      return NextResponse.json({ error: "Household tidak ditemukan" }, { status: 404 })
    }

    if (household.created_by !== userId) {
      return NextResponse.json({ error: "Hanya pemilik yang bisa approve/reject" }, { status: 403 })
    }

    // Update member status
    const newStatus = action === "approve" ? "approved" : "rejected"
    const { error: updateError } = await supabase
      .from("household_members")
      .update({ status: newStatus })
      .eq("household_id", household_id)
      .eq("user_id", member_user_id)

    if (updateError) {
      console.error("[households] Update error:", updateError)
      return NextResponse.json({ error: "Gagal update status" }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      message: action === "approve" ? "Anggota disetujui" : "Anggota ditolak",
    })
  } catch (err) {
    console.error("[households] Error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
