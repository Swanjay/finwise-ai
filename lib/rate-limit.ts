// Simple in-memory rate limiter for Next.js API routes
// For production, use Redis-backed rate limiting (e.g., @upstash/ratelimit)

const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export interface RateLimitConfig {
  /** Time window in milliseconds */
  windowMs: number
  /** Max requests per window */
  max: number
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig = { windowMs: 60_000, max: 10 }
): { allowed: boolean; remaining: number; retryAfter?: number } {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetTime) {
    // New window
    rateLimitStore.set(key, { count: 1, resetTime: now + config.windowMs })
    return { allowed: true, remaining: config.max - 1 }
  }

  if (entry.count >= config.max) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
    return { allowed: false, remaining: 0, retryAfter }
  }

  entry.count++
  return { allowed: true, remaining: config.max - entry.count }
}

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetTime) rateLimitStore.delete(key)
  }
}, 60_000)
