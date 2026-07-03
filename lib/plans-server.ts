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
      .from('users_plan')
      .select('plan_tier, assigned_at')
      .eq('user_id', userId)
      .single()

    if (error || !data) return 'basic'

    // Hitung masa berlaku: 30 hari dari assigned_at
    if (data.assigned_at) {
      const assignedAt = new Date(data.assigned_at)
      const now = new Date()
      const daysElapsed = Math.floor((now.getTime() - assignedAt.getTime()) / (1000 * 60 * 60 * 24))
      if (daysElapsed >= 30) {
        // Plan expired
        return 'basic'
      }
    }

    return (data.plan_tier || 'basic') as PlanTier
  } catch {
    return 'basic'
  }
}

/** Kembalikan sisa hari masa aktif plan, null kalau ga punya plan berbayar */
export async function getPlanExpiryDays(userId: string): Promise<number | null> {
  const supabase = getSupabase()
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('users_plan')
      .select('plan_tier, assigned_at')
      .eq('user_id', userId)
      .single()

    if (error || !data || data.plan_tier === 'basic') return null
    if (!data.assigned_at) return null

    const assignedAt = new Date(data.assigned_at)
    const now = new Date()
    const daysElapsed = Math.floor((now.getTime() - assignedAt.getTime()) / (1000 * 60 * 60 * 24))
    const remaining = 30 - daysElapsed
    return remaining > 0 ? remaining : 0
  } catch {
    return null
  }
}
