import { createClient } from "@supabase/supabase-js"
import { PlanTier } from "./plans"

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

function candidateUserIds(userId: string): string[] {
  const ids = new Set<string>([userId])
  if (userId.startsWith('email:')) {
    const email = userId.slice('email:'.length).toLowerCase().trim()
    ids.add(email)
  }
  return Array.from(ids)
}

export async function getUserPlan(userId: string): Promise<PlanTier> {
  const supabase = getSupabase()
  if (!supabase) return 'basic'

  try {
    const { data, error } = await supabase
      .from('settings')
      .select('user_id, key, value')
      .in('user_id', candidateUserIds(userId))
      .in('key', ['plan_tier', 'plan_assigned_at'])

    if (error || !data || data.length === 0) return 'basic'

    const preferred = data.some(r => r.user_id === userId && r.key === 'plan_tier') ? userId : data.find(r => r.key === 'plan_tier')?.user_id
    const rows = data.filter(r => r.user_id === preferred)
    const planTier = rows.find(r => r.key === 'plan_tier')?.value
    const assignedAt = rows.find(r => r.key === 'plan_assigned_at')?.value

    if (!planTier || planTier === 'basic') return 'basic'

    // Hitung masa berlaku: 30 hari dari plan_assigned_at
    if (assignedAt) {
      const assigned = new Date(assignedAt)
      const now = new Date()
      const daysElapsed = Math.floor((now.getTime() - assigned.getTime()) / (1000 * 60 * 60 * 24))
      if (daysElapsed >= 30) {
        // Plan expired — downgrade
        return 'basic'
      }
    }

    return (planTier || 'basic') as PlanTier
  } catch {
    return 'basic'
  }
}

/** Kembalikan sisa hari masa aktif plan, null kalau basic */
export async function getPlanExpiryDays(userId: string): Promise<number | null> {
  const supabase = getSupabase()
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('settings')
      .select('user_id, key, value')
      .in('user_id', candidateUserIds(userId))
      .in('key', ['plan_tier', 'plan_assigned_at'])

    if (error || !data || data.length === 0) return null

    const preferred = data.some(r => r.user_id === userId && r.key === 'plan_tier') ? userId : data.find(r => r.key === 'plan_tier')?.user_id
    const rows = data.filter(r => r.user_id === preferred)
    const planTier = rows.find(r => r.key === 'plan_tier')?.value
    const assignedAt = rows.find(r => r.key === 'plan_assigned_at')?.value

    if (!planTier || planTier === 'basic' || !assignedAt) return null

    const assigned = new Date(assignedAt)
    const now = new Date()
    const daysElapsed = Math.floor((now.getTime() - assigned.getTime()) / (1000 * 60 * 60 * 24))
    const remaining = 30 - daysElapsed
    return remaining > 0 ? remaining : 0
  } catch {
    return null
  }
}
