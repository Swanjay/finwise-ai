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

// POST /api/households/join — Join household via invite code
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
    const { invite_code } = body

    if (!invite_code || typeof invite_code !== "string") {
      return NextResponse.json({ error: "Kode invitasi tidak valid" }, { status: 400 })
    }

    const userId = (session.user as Record<string, unknown>).id as string

    // Find household by invite code
    const { data: household, error: findError } = await supabase
      .from("households")
      .select("id, name, created_by")
      .eq("invite_code", invite_code.trim().toUpperCase())
      .single()

    if (findError || !household) {
      return NextResponse.json({ error: "Kode invitasi tidak ditemukan" }, { status: 404 })
    }

    // Check if user is the owner
    if (household.created_by === userId) {
      return NextResponse.json({ error: "Kamu adalah pemilik household ini" }, { status: 400 })
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from("household_members")
      .select("id, status")
      .eq("household_id", household.id)
      .eq("user_id", userId)
      .single()

    if (existingMember) {
      if (existingMember.status === "approved") {
        return NextResponse.json({ error: "Kamu sudah menjadi anggota" }, { status: 400 })
      }
      if (existingMember.status === "pending") {
        return NextResponse.json({ error: "Menunggu persetujuan pemilik" }, { status: 400 })
      }
    }

    // Join household
    const { error: joinError } = await supabase
      .from("household_members")
      .insert({
        household_id: household.id,
        user_id: userId,
        role: "member",
        status: "pending",
      })

    if (joinError) {
      console.error("[households] Join error:", joinError)
      return NextResponse.json({ error: "Gagal bergabung" }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      message: "Berhasil mengajukan diri. Menunggu persetujuan pemilik.",
      household: {
        id: household.id,
        name: household.name,
      },
    })
  } catch (err) {
    console.error("[households] Error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
