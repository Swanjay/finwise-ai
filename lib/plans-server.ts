import { createClient } from "@supabase/supabase-js"
import { PlanTier } from "./plans"

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function getUserPlan(userId: string): Promise<PlanTier> {
  const supabase = getSupabase()
  if (!supabase) return 'basic'

  try {
    const { data, error } = await supabase
      .from('settings')
      .select('key, value')
      .eq('user_id', userId)
      .in('key', ['plan_tier', 'plan_assigned_at'])

    if (error || !data || data.length === 0) return 'basic'

    const planTier = data.find(r => r.key === 'plan_tier')?.value
    const assignedAt = data.find(r => r.key === 'plan_assigned_at')?.value

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
      .select('key, value')
      .eq('user_id', userId)
      .in('key', ['plan_tier', 'plan_assigned_at'])

    if (error || !data || data.length === 0) return null

    const planTier = data.find(r => r.key === 'plan_tier')?.value
    const assignedAt = data.find(r => r.key === 'plan_assigned_at')?.value

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
