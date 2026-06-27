import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const bytes = crypto.randomBytes(4)
  let result = "FW-"
  for (let i = 0; i < 4; i++) {
    result += chars[bytes[i] % chars.length]
  }
  return result
}

// POST /api/households — Create household
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
    const { name } = body

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "Nama household minimal 2 karakter" }, { status: 400 })
    }

    const userId = (session.user as Record<string, unknown>).id as string
    const inviteCode = generateInviteCode()

    // Create household
    const { data: household, error: createError } = await supabase
      .from("households")
      .insert({
        name: name.trim(),
        invite_code: inviteCode,
        created_by: userId,
      })
      .select()
      .single()

    if (createError) {
      console.error("[households] Create error:", createError)
      return NextResponse.json({ error: "Gagal membuat household" }, { status: 500 })
    }

    // Add creator as owner
    const { error: memberError } = await supabase
      .from("household_members")
      .insert({
        household_id: household.id,
        user_id: userId,
        role: "owner",
        status: "approved",
      })

    if (memberError) {
      console.error("[households] Member error:", memberError)
      // Non-fatal: household created, just member addition failed
    }

    return NextResponse.json({
      ok: true,
      household: {
        id: household.id,
        name: household.name,
        invite_code: household.invite_code,
      },
    })
  } catch (err) {
    console.error("[households] Error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

// GET /api/households — List user's households
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

    // Get households where user is owner
    const { data: ownedHouseholds, error: ownedError } = await supabase
      .from("households")
      .select("*")
      .eq("created_by", userId)

    if (ownedError) {
      console.error("[households] Owned error:", ownedError)
    }

    // Get households where user is approved member
    const { data: memberHouseholds, error: memberError } = await supabase
      .from("household_members")
      .select("household_id, role, status, households(*)")
      .eq("user_id", userId)
      .eq("status", "approved")

    if (memberError) {
      console.error("[households] Member error:", memberError)
    }

    // Combine and deduplicate
    const allHouseholds = new Map()

    if (ownedHouseholds) {
      for (const h of ownedHouseholds) {
        allHouseholds.set(h.id, { ...h, role: "owner" })
      }
    }

    if (memberHouseholds) {
      for (const m of memberHouseholds) {
        if (m.households && !allHouseholds.has(m.household_id)) {
          allHouseholds.set(m.household_id, { ...m.households, role: m.role })
        }
      }
    }

    return NextResponse.json({ households: Array.from(allHouseholds.values()) })
  } catch (err) {
    console.error("[households] Error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
