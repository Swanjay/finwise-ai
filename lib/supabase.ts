import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function createMockClient(): SupabaseClient {
  console.warn(
    '[FinWise] Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY) are missing. ' +
    'Using mock client — Supabase features will be unavailable.'
  )
  // Return a real Supabase client pointed at a non-existent instance.
  // All queries will gracefully return empty results instead of crashing.
  return createClient('https://placeholder.supabase.co', 'placeholder-key')
}

// Create a dummy client if env vars are missing (for local development)
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createMockClient()
