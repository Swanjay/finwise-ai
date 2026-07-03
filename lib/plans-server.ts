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
      .select('plan_tier, expires_at')
      .eq('user_id', userId)
      .single()

    if (error || !data) return 'basic'

    // Check expiry
    if (data.expires_at) {
      const expiry = new Date(data.expires_at)
      if (expiry < new Date()) {
        // Plan expired (we don't delete immediately from DB but treat as basic)
        return 'basic'
      }
    }

    return (data.plan_tier || 'basic') as PlanTier
  } catch {
    return 'basic'
  }
}
