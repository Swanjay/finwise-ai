// Vercel KV (Redis) rate limiter for production
// Falls back to in-memory for development

import { kv } from '@vercel/kv'

export interface RateLimitConfig {
  /** Time window in milliseconds */
  windowMs: number
  /** Max requests per window */
  max: number
}

// In-memory fallback for development
const memoryStore = new Map<string, { count: number; resetTime: number }>()

/**
 * Check rate limit using Vercel KV (Redis) with in-memory fallback
 * 
 * @param key - Unique identifier (e.g., 'ip:192.168.1.1', 'user:123')
 * @param config - Rate limit configuration
 * @returns Object with allowed, remaining, and retryAfter
 */
export async function checkRateLimitKV(
  key: string,
  config: RateLimitConfig = { windowMs: 60_000, max: 10 }
): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> {
  const now = Date.now()
  const windowKey = `ratelimit:${key}:${Math.floor(now / config.windowMs)}`

  try {
    // Try Vercel KV first (production)
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      const current = await kv.get<number>(windowKey)
      
      if (current === null) {
        // First request in this window
        await kv.set(windowKey, 1, { ex: Math.ceil(config.windowMs / 1000) })
        return { allowed: true, remaining: config.max - 1 }
      }

      if (current >= config.max) {
        // Rate limited
        const ttl = await kv.pttl(windowKey)
        const retryAfter = Math.ceil(ttl / 1000)
        return { allowed: false, remaining: 0, retryAfter }
      }

      // Increment counter
      await kv.incr(windowKey)
      return { allowed: true, remaining: config.max - current - 1 }
    }
  } catch (error) {
    console.warn('[rate-limit] KV error, falling back to memory:', error)
  }

  // Fallback to in-memory (development)
  return checkRateLimitMemory(key, config)
}

/**
 * In-memory rate limiter (development fallback)
 */
function checkRateLimitMemory(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; retryAfter?: number } {
  const now = Date.now()
  const entry = memoryStore.get(key)

  if (!entry || now > entry.resetTime) {
    memoryStore.set(key, { count: 1, resetTime: now + config.windowMs })
    return { allowed: true, remaining: config.max - 1 }
  }

  if (entry.count >= config.max) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
    return { allowed: false, remaining: 0, retryAfter }
  }

  entry.count++
  return { allowed: true, remaining: config.max - entry.count }
}

/**
 * Get client IP address from request
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
    'unknown'
  )
}

/**
 * Rate limit middleware for API routes
 * 
 * @example
 * ```typescript
 * export async function POST(req: Request) {
 *   const rateLimit = await rateLimitMiddleware(req, { windowMs: 60000, max: 5 })
 *   if (rateLimit) return rateLimit // Returns 429 response
 *   
 *   // Continue with normal logic...
 * }
 * ```
 */
export async function rateLimitMiddleware(
  req: Request,
  config: RateLimitConfig = { windowMs: 60_000, max: 10 }
): Promise<Response | null> {
  const ip = getClientIp(req)
  const pathname = new URL(req.url).pathname
  const key = `${pathname}:${ip}`

  const result = await checkRateLimitKV(key, config)

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
          'Retry-After': String(result.retryAfter),
          'X-RateLimit-Limit': String(config.max),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(Date.now() / 1000) + (result.retryAfter || 0)),
        },
      }
    )
  }

  return null // Continue with normal logic
}
