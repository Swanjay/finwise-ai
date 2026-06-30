import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { getSupabase } from "@/lib/supabase-server"
import { createHash } from "crypto"

// Deterministic UUID from email — same email always gives same ID
function emailToUserId(email: string): string {
  const hash = createHash("md5").update(email.toLowerCase().trim()).digest("hex")
  // Format as UUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  return `${hash.slice(0,8)}-${hash.slice(8,12)}-${hash.slice(12,16)}-${hash.slice(16,20)}-${hash.slice(20,32)}`
}

// Map cloud row → local format
function mapTxFromCloud(t: any) {
  return {
    id: t.id,
    type: t.type,
    amount: Number(t.amount),
    category: t.category,
    description: t.note || "",
    date: t.date,
    walletId: t.wallet || "cash",
  }
}

function mapWalletFromCloud(w: any) {
  return {
    id: w.id,
    name: w.name,
    initialBalance: Number(w.balance || 0),
    color: w.color || "#00ff9d",
    icon: w.icon || "💵",
    balance: Number(w.balance || 0),
  }
}

function mapGoalFromCloud(g: any) {
  return {
    id: g.id,
    name: g.name,
    targetAmount: Number(g.target || 0),
    currentAmount: Number(g.saved || 0),
    color: g.color || "#a78bfa",
    emoji: g.emoji || "🎯",
    deadline: g.deadline || undefined,
  }
}

function mapRecurringFromCloud(r: any) {
  return {
    id: r.id,
    type: r.type,
    amount: Number(r.amount),
    category: r.category,
    description: r.note || "",
    frequency: r.frequency || "monthly",
    walletId: r.wallet || "cash",
    active: true,
  }
}

// GET /api/data — Fetch all user data
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabase()
  const uid = emailToUserId(session.user.email)

  // Fetch all data in parallel
  const [txRes, walletsRes, goalsRes, budgetsRes, recurringRes, settingsRes] = await Promise.all([
    supabase.from("transactions").select("*").eq("user_id", uid).order("date", { ascending: false }).limit(500),
    supabase.from("wallets").select("*").eq("user_id", uid),
    supabase.from("goals").select("*").eq("user_id", uid),
    supabase.from("budgets").select("*").eq("user_id", uid),
    supabase.from("recurring").select("*").eq("user_id", uid),
    supabase.from("settings").select("key, value").eq("user_id", uid),
  ])

  const settingsMap: Record<string, string> = {}
  for (const s of settingsRes.data || []) settingsMap[s.key] = s.value

  return NextResponse.json({
    ok: true,
    userId: uid,
    transactions: (txRes.data || []).map(mapTxFromCloud),
    wallets: (walletsRes.data || []).map(mapWalletFromCloud),
    goals: (goalsRes.data || []).map(mapGoalFromCloud),
    budgets: (budgetsRes.data || []).reduce((acc: Record<string, number>, b: any) => { acc[b.category] = b.limit_amount; return acc }, {}),
    recurring: (recurringRes.data || []).map(mapRecurringFromCloud),
    settings: settingsMap,
  })
}

// POST /api/data — Bulk save all user data (debounced from client)
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabase()
  const body = await req.json()
  const uid = emailToUserId(session.user.email)
  const results: Record<string, string> = {}

  // 1. Transactions
  if (body.transactions?.length) {
    const rows = body.transactions.map((t: any) => ({
      id: t.id,
      user_id: uid,
      type: t.type,
      amount: Number(t.amount),
      category: t.category,
      note: t.description || t.note || "",
      date: t.date,
      wallet: t.walletId || t.wallet || "cash",
    }))
    const { error } = await supabase.from("transactions").upsert(rows, { onConflict: "id" })
    results.transactions = error ? `Error: ${error.message}` : `OK (${rows.length})`
  }

  // 2. Wallets
  if (body.wallets?.length) {
    const rows = body.wallets.map((w: any) => ({
      id: w.id,
      user_id: uid,
      name: w.name,
      balance: Number(w.initialBalance ?? w.balance ?? 0),
      color: w.color || "#00ff9d",
      icon: w.icon || "💵",
    }))
    const { error } = await supabase.from("wallets").upsert(rows, { onConflict: "id" })
    results.wallets = error ? `Error: ${error.message}` : `OK (${rows.length})`
  }

  // 3. Goals
  if (body.goals?.length) {
    const rows = body.goals.map((g: any) => ({
      id: g.id,
      user_id: uid,
      name: g.name,
      target: Number(g.targetAmount ?? g.target ?? 0),
      saved: Number(g.currentAmount ?? g.saved ?? 0),
      color: g.color || "#a78bfa",
      emoji: g.emoji || "🎯",
      deadline: g.deadline || null,
    }))
    const { error } = await supabase.from("goals").upsert(rows, { onConflict: "id" })
    results.goals = error ? `Error: ${error.message}` : `OK (${rows.length})`
  }

  // 4. Budgets
  if (body.budgets && typeof body.budgets === "object") {
    const rows = Object.entries(body.budgets)
      .filter(([, v]) => Number(v) > 0)
      .map(([cat, amount]) => ({
        user_id: uid,
        category: cat,
        limit_amount: Number(amount),
      }))
    if (rows.length) {
      // Delete existing budgets for this user, then insert fresh
      await supabase.from("budgets").delete().eq("user_id", uid)
      const { error } = await supabase.from("budgets").insert(rows)
      results.budgets = error ? `Error: ${error.message}` : `OK (${rows.length})`
    }
  }

  // 5. Recurring
  if (body.recurring?.length) {
    const rows = body.recurring.map((r: any) => ({
      id: r.id,
      user_id: uid,
      type: r.type,
      amount: Number(r.amount),
      category: r.category,
      note: r.description || r.note || "",
      frequency: r.frequency || "monthly",
      wallet: r.walletId || r.wallet || "cash",
    }))
    const { error } = await supabase.from("recurring").upsert(rows, { onConflict: "id" })
    results.recurring = error ? `Error: ${error.message}` : `OK (${rows.length})`
  }

  // 6. Settings (key-value)
  if (body.settings && typeof body.settings === "object") {
    const rows = Object.entries(body.settings).map(([key, value]) => ({
      user_id: uid,
      key,
      value: String(value),
    }))
    if (rows.length) {
      const { error } = await supabase.from("settings").upsert(rows, { onConflict: "user_id,key" })
      results.settings = error ? `Error: ${error.message}` : `OK (${rows.length})`
    }
  }

  return NextResponse.json({ ok: true, userId: uid, results })
}
