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

// GET /api/households/[id]/members — List members of a household
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
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
    const householdId = params.id

    // Verify user has access to this household
    const { data: household, error: findError } = await supabase
      .from("households")
      .select("id, created_by")
      .eq("id", householdId)
      .single()

    if (findError || !household) {
      return NextResponse.json({ error: "Household tidak ditemukan" }, { status: 404 })
    }

    // Check if user is owner or approved member
    const isOwner = household.created_by === userId
    let isMember = false

    if (!isOwner) {
      const { data: member } = await supabase
        .from("household_members")
        .select("id")
        .eq("household_id", householdId)
        .eq("user_id", userId)
        .eq("status", "approved")
        .single()
      
      isMember = !!member
    }

    if (!isOwner && !isMember) {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
    }

    // Get all members
    const { data: members, error: membersError } = await supabase
      .from("household_members")
      .select("user_id, role, status, joined_at")
      .eq("household_id", householdId)
      .order("joined_at", { ascending: true })

    if (membersError) {
      console.error("[households] Members error:", membersError)
      return NextResponse.json({ error: "Gagal mengambil data anggota" }, { status: 500 })
    }

    return NextResponse.json({ members })
  } catch (err) {
    console.error("[households] Error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
