// Supabase-backed rate limiter + OTP store
// Replaces broken Vercel KV (env not set) + in-memory Map (not shared across serverless instances)
// Uses Supabase REST API directly — no extra deps, works in all runtimes.

import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

export function getSupabaseServer(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.warn('[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    return null
  }
  if (!_client) {
    _client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return _client
}

export interface RateLimitConfig {
  windowMs: number
  max: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfter?: number
}

export async function checkRateLimitSupabase(
  key: string,
  config: RateLimitConfig = { windowMs: 60_000, max: 10 },
): Promise<RateLimitResult> {
  const sb = getSupabaseServer()
  if (!sb) {
    // Fail open (allow) if DB unavailable — better UX than hard block
    return { allowed: true, remaining: config.max }
  }

  const now = Date.now()
  const { data, error } = await sb.rpc('check_rate_limit', {
    p_key: `rl:${key}`,
    p_window_ms: config.windowMs,
    p_max: config.max,
    p_now: now,
  })

  if (error) {
    console.error('[rate-limit] RPC error:', error.message)
    return { allowed: true, remaining: config.max }
  }

  if (data && data.length > 0) {
    const row = data[0]
    return {
      allowed: row.allowed,
      remaining: row.remaining,
      retryAfter: row.retry_after > 0 ? Math.ceil(row.retry_after / 1000) : undefined,
    }
  }
  return { allowed: true, remaining: config.max }
}

export async function rateLimitMiddleware(
  req: Request,
  config: RateLimitConfig = { windowMs: 60_000, max: 10 },
): Promise<Response | null> {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
    'unknown'
  const pathname = new URL(req.url).pathname
  const key = `${pathname}:${ip}`

  const result = await checkRateLimitSupabase(key, config)

  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Terlalu banyak percobaan. Coba lagi nanti.',
        retryAfter: result.retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(result.retryAfter ?? 60),
          'X-RateLimit-Limit': String(config.max),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(Date.now() / 1000) + (result.retryAfter ?? 0)),
        },
      },
    )
  }
  return null
}

// ─── OTP Store (replaces in-memory Map) ───

export interface OtpRecord {
  code: string
  expires_at: number
  attempts: number
  created_at: number
  user_data?: Record<string, unknown> | null
}

export async function otpSet(
  identifier: string,
  code: string,
  ttlMs: number = 5 * 60 * 1000,
  userData?: Record<string, unknown>,
): Promise<void> {
  const sb = getSupabaseServer()
  if (!sb) {
    console.error('[otp] Cannot store — Supabase unavailable')
    return
  }
  const now = Date.now()
  const { error } = await sb.from('otp_codes').upsert({
    identifier: identifier.toLowerCase(),
    code,
    expires_at: now + ttlMs,
    attempts: 0,
    created_at: now,
    user_data: userData ?? null,
  })
  if (error) console.error('[otp] Set error:', error.message)
}

export async function otpGet(identifier: string): Promise<OtpRecord | null> {
  const sb = getSupabaseServer()
  if (!sb) return null
  const { data, error } = await sb
    .from('otp_codes')
    .select('code, expires_at, attempts, created_at, user_data')
    .eq('identifier', identifier.toLowerCase())
    .maybeSingle()
  if (error) {
    console.error('[otp] Get error:', error.message)
    return null
  }
  // Auto-delete expired on read
  if (data && data.expires_at < Date.now()) {
    await otpDelete(identifier)
    return null
  }
  return (data as OtpRecord) ?? null
}

export async function otpIncrementAttempts(identifier: string): Promise<number> {
  const sb = getSupabaseServer()
  if (!sb) return 0
  const { data, error } = await sb.rpc('otp_increment_attempts', {
    p_identifier: identifier.toLowerCase(),
  })
  if (error) {
    console.error('[otp] Increment error:', error.message)
    return 0
  }
  return (data as number) ?? 0
}

export async function otpDelete(identifier: string): Promise<void> {
  const sb = getSupabaseServer()
  if (!sb) return
  const { error } = await sb.from('otp_codes').delete().eq('identifier', identifier.toLowerCase())
  if (error) console.error('[otp] Delete error:', error.message)
}

// Check cooldown for re-request (e.g. 30s between OTP requests)
export async function otpGetCooldown(identifier: string, cooldownMs: number): Promise<boolean> {
  const rec = await otpGet(identifier)
  if (!rec) return false
  return Date.now() - rec.created_at < cooldownMs
}
