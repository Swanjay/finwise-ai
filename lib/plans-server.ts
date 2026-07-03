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
      .select('plan_tier')
      .eq('user_id', userId)
      .single()

    if (error || !data) return 'basic'

    return (data.plan_tier || 'basic') as PlanTier
  } catch {
    return 'basic'
  }
}
